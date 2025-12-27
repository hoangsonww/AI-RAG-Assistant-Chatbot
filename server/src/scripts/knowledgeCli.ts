import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import readline from "readline";
import KnowledgeSource, {
  IKnowledgeSource,
  KnowledgeSourceType,
} from "../models/KnowledgeSource";
import {
  deleteKnowledgeSourceVectors,
  ingestKnowledgeSource,
} from "../services/knowledgeBase";

dotenv.config();

type CliOptions = Record<string, string | boolean>;

const REQUIRED_ENV = [
  "MONGODB_URI",
  "GOOGLE_AI_API_KEY",
  "PINECONE_API_KEY",
  "PINECONE_INDEX_NAME",
];
const ALLOWED_SOURCE_TYPES = new Set<KnowledgeSourceType>([
  "resume",
  "note",
  "link",
  "project",
  "bio",
  "other",
]);

const exitWithError = (message: string): never => {
  console.error(`Error: ${message}`);
  process.exit(1);
  throw new Error(message);
};

const parseArgs = (argv: string[]) => {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      i += 1;
    }
  }
  return options;
};

const getOption = (options: CliOptions, key: string) => {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
};

const requireOption = (options: CliOptions, key: string): string => {
  const value = getOption(options, key);
  if (!value) {
    return exitWithError(`Missing required flag --${key}.`);
  }
  if (value.trim().length === 0) {
    return exitWithError(`Missing required flag --${key}.`);
  }
  return value;
};

const connectMongo = async () => {
  const mongoUri = process.env.MONGODB_URI ?? "";
  if (!mongoUri) {
    exitWithError("MONGODB_URI is not set.");
  }
  await mongoose.connect(mongoUri);
};

const readFileContent = (filePath: string) => {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    exitWithError(`File not found: ${resolved}`);
  }
  return fs.readFileSync(resolved, "utf8");
};

const parseTags = (value?: string) =>
  value
    ? value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

const persistSource = async (source: IKnowledgeSource) => {
  const { chunkCount } = await ingestKnowledgeSource({
    sourceId: source._id.toString(),
    title: source.title,
    content: source.content,
    sourceType: source.sourceType,
    sourceUrl: source.sourceUrl,
    replaceExisting: true,
  });

  source.chunkCount = chunkCount;
  await source.save();
  return source;
};

const ensureEnv = (): void => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    exitWithError(`Missing environment variables: ${missing.join(", ")}`);
  }
};

const upsertSingleSource = async (options: CliOptions) => {
  const title = getOption(options, "title");
  const file = getOption(options, "file");
  const contentInput = getOption(options, "content");
  const sourceTypeInput = (getOption(options, "type") ||
    "note") as KnowledgeSourceType;
  const sourceType: KnowledgeSourceType = ALLOWED_SOURCE_TYPES.has(
    sourceTypeInput,
  )
    ? sourceTypeInput
    : "note";
  const sourceUrl = getOption(options, "url");
  const normalizedUrl = sourceUrl ? sourceUrl.trim() : undefined;
  const externalId = getOption(options, "external-id");

  const rawContent = contentInput || (file ? readFileContent(file) : "");
  const normalizedContent = rawContent.trim();
  if (!normalizedContent) {
    exitWithError("Provide --content or --file with non-empty text.");
  }

  const normalizedTitle = (title || "").trim();
  if (!normalizedTitle) {
    exitWithError("Provide a non-empty --title.");
  }

  const tags = parseTags(getOption(options, "tags"));

  let source: IKnowledgeSource | null = null;
  const sourceId = getOption(options, "id");

  if (sourceId) {
    source = await KnowledgeSource.findById(sourceId);
  } else if (externalId) {
    source = await KnowledgeSource.findOne({ externalId });
  }

  if (!source) {
    source = new KnowledgeSource({
      title: normalizedTitle,
      content: normalizedContent,
      sourceType,
      sourceUrl: normalizedUrl,
      tags,
      externalId,
    });
  } else {
    source.title = normalizedTitle;
    source.content = normalizedContent;
    source.sourceType = sourceType;
    source.sourceUrl = normalizedUrl;
    source.tags = tags;
    source.externalId = externalId || source.externalId;
  }

  await source.save();

  await persistSource(source);

  console.log(
    `Upserted "${source.title}" (${source.chunkCount} chunks, id: ${source._id}).`,
  );
};

const deleteSource = async (options: CliOptions) => {
  const sourceId = requireOption(options, "id");
  const source = await KnowledgeSource.findById(sourceId);
  if (!source) {
    exitWithError(`No knowledge source found with id ${sourceId}.`);
  }

  const sourceRecord = source as IKnowledgeSource;
  await deleteKnowledgeSourceVectors(sourceRecord._id.toString());
  await sourceRecord.deleteOne();
  console.log(`Deleted "${sourceRecord.title}" (${sourceId}).`);
};

const listSources = async (options: CliOptions) => {
  const sources = await KnowledgeSource.find().sort({
    updatedAt: -1,
  });

  if (sources.length === 0) {
    console.log("No knowledge sources found.");
    return;
  }

  for (const source of sources) {
    console.log(
      `${source._id} | ${source.title} | ${source.sourceType} | ${source.chunkCount} chunks`,
    );
  }
};

const promptInput = (rl: readline.Interface, message: string) =>
  new Promise<string>((resolve) => {
    rl.question(message, (answer) => resolve(answer));
  });

const promptMultiline = async (rl: readline.Interface, message: string) => {
  console.log(message);
  console.log("Enter text. Type .done to finish or .cancel to abort.");
  const lines: string[] = [];
  while (true) {
    const line = await promptInput(rl, "");
    const trimmed = line.trim();
    if (trimmed === ".done") {
      break;
    }
    if (trimmed === ".cancel") {
      return "";
    }
    lines.push(line);
  }
  return lines.join("\n").trimEnd();
};

const formatSourceSummary = (source: any) =>
  `${source._id} | ${source.title} | ${source.sourceType} | ${source.chunkCount} chunks`;

const viewSource = async (sourceId: string) => {
  const source = await KnowledgeSource.findById(sourceId);
  if (!source) {
    console.log("No source found with that id.");
    return;
  }
  console.log(formatSourceSummary(source));
  console.log(`Tags: ${(source.tags || []).join(", ") || "none"}`);
  console.log(`URL: ${source.sourceUrl || "none"}`);
  console.log("Content:");
  console.log(source.content);
};

const listAllSources = async () => {
  const sources = await KnowledgeSource.find().sort({
    updatedAt: -1,
  });
  if (sources.length === 0) {
    console.log("No knowledge sources found.");
    return;
  }
  sources.forEach((source) => console.log(formatSourceSummary(source)));
};

const repl = async (_options: CliOptions) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  console.log("Knowledge Base REPL");
  console.log(
    "Commands: list, view <id>, new, edit <id>, delete <id>, help, exit",
  );

  while (true) {
    const input = await promptInput(rl, "knowledge> ");
    const trimmed = input.trim();
    if (!trimmed) {
      continue;
    }

    const [command, ...args] = trimmed.split(/\s+/);

    if (command === "exit" || command === "quit") {
      rl.close();
      break;
    }

    if (command === "help") {
      console.log("Commands:");
      console.log("  list                     List knowledge sources");
      console.log("  view <id>                View full source");
      console.log("  new                      Create a new source");
      console.log("  edit <id>                Edit an existing source");
      console.log("  delete <id>              Delete a source");
      console.log("  exit                     Quit");
      continue;
    }

    if (command === "list") {
      await listAllSources();
      continue;
    }

    if (command === "view") {
      const sourceId = args[0];
      if (!sourceId) {
        console.log("Usage: view <id>");
        continue;
      }
      await viewSource(sourceId);
      continue;
    }

    if (command === "delete") {
      const sourceId = args[0];
      if (!sourceId) {
        console.log("Usage: delete <id>");
        continue;
      }
      const confirmation = await promptInput(
        rl,
        `Delete ${sourceId}? (yes/no): `,
      );
      if (confirmation.toLowerCase() !== "yes") {
        console.log("Cancelled.");
        continue;
      }
      const source = await KnowledgeSource.findById(sourceId);
      if (!source) {
        console.log("No source found with that id.");
        continue;
      }
      await deleteKnowledgeSourceVectors(source._id.toString());
      await source.deleteOne();
      console.log("Deleted.");
      continue;
    }

    if (command === "new") {
      const title = (await promptInput(rl, "Title: ")).trim();
      if (!title) {
        console.log("Title is required.");
        continue;
      }
      const typeInput = (
        await promptInput(rl, "Type (resume/bio/project/note/link/other): ")
      ).trim();
      const type: KnowledgeSourceType = ALLOWED_SOURCE_TYPES.has(
        typeInput as KnowledgeSourceType,
      )
        ? (typeInput as KnowledgeSourceType)
        : "note";
      const url = (await promptInput(rl, "Source URL (optional): ")).trim();
      const tags = (await promptInput(rl, "Tags (comma-separated): ")).trim();
      const content = await promptMultiline(rl, "Content:");
      if (!content) {
        console.log("Content is required.");
        continue;
      }

      const source = new KnowledgeSource({
        title,
        content: content.trim(),
        sourceType: type,
        sourceUrl: url || undefined,
        tags: parseTags(tags),
      });
      await source.save();
      await persistSource(source);
      console.log(
        `Created "${source.title}" (${source.chunkCount} chunks, id: ${source._id}).`,
      );
      continue;
    }

    if (command === "edit") {
      const sourceId = args[0];
      if (!sourceId) {
        console.log("Usage: edit <id>");
        continue;
      }
      const source = await KnowledgeSource.findById(sourceId);
      if (!source) {
        console.log("No source found with that id.");
        continue;
      }

      const title = (await promptInput(rl, `Title (${source.title}): `)).trim();
      if (title) {
        source.title = title;
      }
      const type = (
        await promptInput(rl, `Type (${source.sourceType}): `)
      ).trim();
      if (type) {
        if (ALLOWED_SOURCE_TYPES.has(type as KnowledgeSourceType)) {
          source.sourceType = type as KnowledgeSourceType;
        } else {
          console.log("Unknown type; keeping existing value.");
        }
      }
      const url = (
        await promptInput(rl, `Source URL (${source.sourceUrl || "none"}): `)
      ).trim();
      source.sourceUrl = url ? url : undefined;

      const tagsInput = (
        await promptInput(
          rl,
          `Tags (${(source.tags || []).join(", ") || "none"}): `,
        )
      ).trim();
      if (tagsInput) {
        source.tags = parseTags(tagsInput);
      }

      const contentAction = (
        await promptInput(rl, "Content (replace/append/skip) [skip]: ")
      )
        .trim()
        .toLowerCase();
      if (contentAction === "replace") {
        const newContent = await promptMultiline(rl, "New content:");
        if (newContent) {
          source.content = newContent.trim();
        }
      } else if (contentAction === "append") {
        const extraContent = await promptMultiline(rl, "Append content:");
        if (extraContent) {
          source.content = `${source.content.trim()}\n\n${extraContent.trim()}`;
        }
      }

      await source.save();
      await persistSource(source);
      console.log(
        `Updated "${source.title}" (${source.chunkCount} chunks, id: ${source._id}).`,
      );
      continue;
    }

    console.log("Unknown command. Type help for commands.");
  }
};

const syncManifest = async (options: CliOptions) => {
  const manifestPath = requireOption(options, "manifest");
  const manifestRaw = readFileContent(manifestPath);
  const manifest = JSON.parse(manifestRaw) as {
    sources: Array<{
      externalId?: string;
      title: string;
      sourceType?: string;
      sourceUrl?: string;
      tags?: string[];
      content?: string;
      file?: string;
    }>;
  };

  if (!Array.isArray(manifest.sources)) {
    exitWithError("Manifest must include a sources array.");
  }

  for (const entry of manifest.sources) {
    if (!entry.title) {
      exitWithError("Every manifest source must include a title.");
    }
    const content =
      entry.content || (entry.file ? readFileContent(entry.file) : "");
    if (!content || !content.trim()) {
      exitWithError(
        `Source "${entry.title}" must include content or file in the manifest.`,
      );
    }

    const normalizedContent = content.trim();

    const optionsForEntry: CliOptions = {
      title: entry.title,
      content: normalizedContent,
      type: entry.sourceType || "note",
    };

    if (entry.sourceUrl) {
      optionsForEntry.url = entry.sourceUrl;
    }
    if (entry.externalId) {
      optionsForEntry["external-id"] = entry.externalId;
    }
    if (entry.tags) {
      optionsForEntry.tags = entry.tags.join(", ");
    }

    await upsertSingleSource(optionsForEntry);
  }

  if (options["delete-missing"]) {
    const externalIds = new Set(
      manifest.sources
        .map((entry) => entry.externalId)
        .filter(Boolean) as string[],
    );
    if (externalIds.size === 0) {
      exitWithError(
        "Use externalId on each manifest source when deleting missing entries.",
      );
    }
    const candidates = await KnowledgeSource.find({
      externalId: { $ne: null },
    });
    for (const source of candidates) {
      if (source.externalId && !externalIds.has(source.externalId)) {
        await deleteKnowledgeSourceVectors(source._id.toString());
        await source.deleteOne();
        console.log(`Deleted missing source ${source.externalId}.`);
      }
    }
  }
};

const printHelp = () => {
  console.log(`
Knowledge Base CLI

Usage:
  npm run knowledge:upsert -- --title "Resume" --file ./resume.txt --type resume --tags "resume,profile"
  npm run knowledge:delete -- --id <sourceId>
  npm run knowledge:list
  npm run knowledge:sync -- --manifest ./knowledge/manifest.json
  npm run knowledge:repl

Flags:
  --title          Source title
  --content        Inline content (use quotes)
  --file           Path to a text/markdown file
  --type           Source type (resume, bio, project, note, link, other)
  --url            Source URL
  --tags           Comma-separated tags
  --external-id    Stable id for sync updates
  --manifest       Path to JSON manifest for batch sync
  --delete-missing Remove sources not listed in manifest (requires externalId)
`);
};

const run = async () => {
  ensureEnv();
  const args = process.argv.slice(2);
  const command = args[0];
  const options = parseArgs(args.slice(1));

  if (!command || command === "help" || options.help) {
    printHelp();
    return;
  }

  await connectMongo();

  if (command === "upsert") {
    await upsertSingleSource(options);
  } else if (command === "delete") {
    await deleteSource(options);
  } else if (command === "list") {
    await listSources(options);
  } else if (command === "repl") {
    await repl(options);
  } else if (command === "sync") {
    await syncManifest(options);
  } else {
    exitWithError(`Unknown command: ${command}`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Unexpected error:", error);
  mongoose.disconnect().finally(() => process.exit(1));
});
