import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
} from "@google/generative-ai";
import dotenv from "dotenv";
import https from "https";
import { retrieveKnowledgeChunks, SourceCitation } from "./knowledgeBase";

dotenv.config();

const GEMINI_MODELS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models";
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const FALLBACK_MODEL_TTL_MS = 60 * 1000;
const FALLBACK_GEMINI_MODELS = ["gemini-2.5-flash"];
const STATIC_GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
];
const RAG_TOP_K = 10;
const MAX_CONTEXT_SNIPPET_CHARS = 1200;

const IDENTITY_SYSTEM_INSTRUCTION =
  "You are Lumina, David Nguyen's AI assistant.";
const RAG_PROMPT_INSTRUCTIONS = [
  "Answer ONLY using the provided sources from the knowledge base.",
  "Cite sources inline using [number] that matches the sources list.",
  "Every sentence must include at least one citation.",
  "If the sources do not contain the answer, say you do not have enough information and suggest adding it.",
  "Do not use general knowledge or make assumptions.",
  "Avoid repeating the same item; de-duplicate by title or project name.",
  "When the user asks for a list, respond with a short intro sentence and a clean bullet list.",
  "For lists, use the format: Project — timeframe — one-sentence description.",
  "Do not restate identity or titles unless explicitly asked.",
].join(" ");

type GeminiModelInfo = {
  name?: string;
  supportedGenerationMethods?: string[];
};

type GeminiModelsResponse = {
  models?: GeminiModelInfo[];
};

let cachedGeminiModels: string[] = [];
let cachedGeminiModelsExpiresAt = 0;
let modelFetchPromise: Promise<string[]> | null = null;
let modelRotationIndex = 0;

const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
};

const DEFAULT_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

const fetchJson = (url: string): Promise<GeminiModelsResponse> =>
  new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const statusCode = response.statusCode || 0;
      let rawBody = "";

      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        rawBody += chunk;
      });
      response.on("end", () => {
        if (statusCode < 200 || statusCode >= 300) {
          reject(
            new Error(
              `Gemini model list request failed with status ${statusCode}.`,
            ),
          );
          return;
        }

        try {
          resolve(JSON.parse(rawBody) as GeminiModelsResponse);
        } catch (error) {
          reject(new Error("Failed to parse Gemini model list response."));
        }
      });
    });

    request.on("error", reject);
  });

const normalizeModelName = (name: string) => name.replace(/^models\//, "");

const shouldIgnoreModel = (name: string) => {
  const lowerName = name.toLowerCase();
  return lowerName.includes("embedding") || lowerName.includes("pro");
};

const filterGeminiModelNames = (models: GeminiModelInfo[] = []) => {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const model of models) {
    const rawName = typeof model?.name === "string" ? model.name : "";
    if (!rawName) {
      continue;
    }

    const normalizedName = normalizeModelName(rawName);
    const lowerName = normalizedName.toLowerCase();

    if (!lowerName.includes("gemini")) {
      continue;
    }

    if (shouldIgnoreModel(lowerName)) {
      continue;
    }

    const methods = model?.supportedGenerationMethods || [];
    if (!methods.includes("generateContent")) {
      continue;
    }

    if (!seen.has(normalizedName)) {
      names.push(normalizedName);
      seen.add(normalizedName);
    }
  }

  return names;
};

const mergeModelLists = (primary: string[], fallback: string[]) => {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const modelName of [...primary, ...fallback]) {
    const normalized = normalizeModelName(modelName);
    if (!normalized || shouldIgnoreModel(normalized)) {
      continue;
    }
    if (!seen.has(normalized)) {
      merged.push(normalized);
      seen.add(normalized);
    }
  }

  return merged;
};

const fetchGeminiModelNames = async (apiKey: string): Promise<string[]> => {
  const url = new URL(GEMINI_MODELS_ENDPOINT);
  url.searchParams.set("key", apiKey);

  const response = await fetchJson(url.toString());
  const dynamicModels = filterGeminiModelNames(response.models);
  return mergeModelLists(dynamicModels, STATIC_GEMINI_MODELS);
};

const setCachedModels = (models: string[], ttlMs: number) => {
  cachedGeminiModels = models;
  cachedGeminiModelsExpiresAt = Date.now() + ttlMs;

  if (modelRotationIndex >= cachedGeminiModels.length) {
    modelRotationIndex = 0;
  }
};

const getAvailableGeminiModels = async (apiKey: string): Promise<string[]> => {
  const now = Date.now();

  if (cachedGeminiModels.length > 0 && now < cachedGeminiModelsExpiresAt) {
    return cachedGeminiModels;
  }

  if (!modelFetchPromise) {
    const fetchPromise = fetchGeminiModelNames(apiKey)
      .then((models) => {
        if (models.length > 0) {
          setCachedModels(models, MODEL_CACHE_TTL_MS);
          return cachedGeminiModels;
        }

        if (cachedGeminiModels.length > 0) {
          return cachedGeminiModels;
        }

        const fallbackModels = mergeModelLists(
          FALLBACK_GEMINI_MODELS,
          STATIC_GEMINI_MODELS,
        );
        setCachedModels(fallbackModels, FALLBACK_MODEL_TTL_MS);
        return cachedGeminiModels;
      })
      .catch(() => {
        if (cachedGeminiModels.length > 0) {
          return cachedGeminiModels;
        }

        const fallbackModels = mergeModelLists(
          FALLBACK_GEMINI_MODELS,
          STATIC_GEMINI_MODELS,
        );
        setCachedModels(fallbackModels, FALLBACK_MODEL_TTL_MS);
        return cachedGeminiModels;
      });

    modelFetchPromise = fetchPromise;
    fetchPromise.finally(() => {
      modelFetchPromise = null;
    });
  }

  return modelFetchPromise;
};

const getRotatedGeminiModels = async (apiKey: string): Promise<string[]> => {
  const models = await getAvailableGeminiModels(apiKey);

  if (models.length === 0) {
    return FALLBACK_GEMINI_MODELS;
  }

  if (modelRotationIndex >= models.length) {
    modelRotationIndex = 0;
  }

  const startIndex = modelRotationIndex;
  modelRotationIndex = (modelRotationIndex + 1) % models.length;

  return [...models.slice(startIndex), ...models.slice(0, startIndex)];
};

const runWithModelRotation = async <T>(
  apiKey: string,
  action: (modelName: string, genAI: GoogleGenerativeAI) => Promise<T>,
): Promise<T> => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = await getRotatedGeminiModels(apiKey);
  let lastError: unknown = null;

  for (const modelName of models) {
    try {
      return await action(modelName, genAI);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Gemini model request failed.");
};

const buildRagContext = (sources: SourceCitation[]) => {
  return sources
    .map((source, index) => {
      const title =
        source.title?.trim() ||
        (source.sourceType
          ? `${source.sourceType} source`
          : "Knowledge source");
      const url = source.url ? ` (${source.url})` : "";
      const snippet =
        source.snippet.length > MAX_CONTEXT_SNIPPET_CHARS
          ? `${source.snippet.slice(0, MAX_CONTEXT_SNIPPET_CHARS)}...`
          : source.snippet;
      return `[${index + 1}] ${snippet}\nSource: ${title}${url}`;
    })
    .join("\n\n");
};

const formatRagSourcesMessage = (sources: SourceCitation[]) => {
  const context = buildRagContext(sources);
  return `Instructions:\n${RAG_PROMPT_INSTRUCTIONS}\n\nSources:\n${context}`;
};

const getNoSourcesResponse = () => ({
  text: "I do not have enough information in the knowledge base to answer that yet. Please add the missing details to the Knowledge Base.",
  sources: [] as SourceCitation[],
});

const buildRagUserPrompt = (question: string) =>
  [
    "Question:",
    question,
    "",
    "Answer using only the sources above and cite inline.",
    "If listing items, keep it concise and avoid duplicates.",
  ].join("\n");

/**
 * Sends a chat message to Gemini AI, grounding responses in Pinecone sources with citations.
 * @param history - The conversation history.
 * @param message - The new user message.
 * @returns A promise resolving with the AI's response text.
 */
export const chatWithAI = async (
  history: Array<any>,
  message: string,
): Promise<{ text: string; sources: SourceCitation[] }> => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  const sources = await retrieveKnowledgeChunks(message, RAG_TOP_K);
  if (sources.length === 0) {
    return getNoSourcesResponse();
  }

  const fullSystemInstruction = IDENTITY_SYSTEM_INSTRUCTION;

  const chatHistory = [
    ...history,
    { role: "user", parts: [{ text: formatRagSourcesMessage(sources) }] },
  ];

  const text = await runWithModelRotation(
    process.env.GOOGLE_AI_API_KEY,
    async (modelName, genAI) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: fullSystemInstruction,
      });
      const chatSession = model.startChat({
        generationConfig: DEFAULT_GENERATION_CONFIG,
        safetySettings: DEFAULT_SAFETY_SETTINGS,
        history: chatHistory,
      });
      const result = await chatSession.sendMessage(buildRagUserPrompt(message));
      if (!result.response || !result.response.text) {
        throw new Error("Failed to get text response from the AI.");
      }

      return result.response.text();
    },
  );

  return { text, sources };
};

/**
 * Streams a chat response from Gemini AI using Server-Sent Events and citations.
 * @param history - The conversation history.
 * @param message - The new user message.
 * @param onChunk - Callback function to handle each chunk of the response.
 * @returns A promise resolving with the complete AI response text.
 */
export const streamChatWithAI = async (
  history: Array<any>,
  message: string,
  onChunk: (chunk: string) => void,
): Promise<{ text: string; sources: SourceCitation[] }> => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  const sources = await retrieveKnowledgeChunks(message, RAG_TOP_K);
  if (sources.length === 0) {
    const fallback = getNoSourcesResponse();
    onChunk(fallback.text);
    return fallback;
  }

  const fullSystemInstruction = IDENTITY_SYSTEM_INSTRUCTION;

  const chatHistory = [
    ...history,
    { role: "user", parts: [{ text: formatRagSourcesMessage(sources) }] },
  ];

  const text = await runWithModelRotation(
    process.env.GOOGLE_AI_API_KEY,
    async (modelName, genAI) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: fullSystemInstruction,
      });
      const chatSession = model.startChat({
        generationConfig: DEFAULT_GENERATION_CONFIG,
        safetySettings: DEFAULT_SAFETY_SETTINGS,
        history: chatHistory,
      });
      const result = await chatSession.sendMessageStream(
        buildRagUserPrompt(message),
      );
      let fullResponse = "";

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullResponse += chunkText;
          onChunk(chunkText);
        }
      }

      if (!fullResponse) {
        throw new Error("Failed to get text response from the AI.");
      }

      return fullResponse;
    },
  );

  return { text, sources };
};

/**
 * Generate a concise conversation title based on the conversation messages.
 * @param messages - The conversation messages.
 * @returns A promise resolving with a suggested title (max 50 characters).
 */
export const generateConversationTitle = async (
  messages: Array<{ sender: string; text: string }>,
): Promise<string> => {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  if (messages.length === 0) {
    return "Untitled Conversation";
  }

  const conversationText = messages
    .slice(0, 10)
    .map((msg) => `${msg.sender}: ${msg.text}`)
    .join("\n");

  const prompt = `Based on this conversation, generate a concise title (max 50 characters):\n\n${conversationText}`;

  return runWithModelRotation(
    process.env.GOOGLE_AI_API_KEY,
    async (modelName, genAI) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction:
          "You are a helpful assistant that generates concise, descriptive conversation titles. Generate a short title (maximum 50 characters) that captures the essence of the conversation. Only return the title, nothing else.",
      });

      const result = await model.generateContent(prompt);
      if (!result.response || !result.response.text) {
        throw new Error("Failed to get a title response from the AI.");
      }

      const title = result.response.text().trim();
      return title.length > 50 ? title.substring(0, 47) + "..." : title;
    },
  );
};
