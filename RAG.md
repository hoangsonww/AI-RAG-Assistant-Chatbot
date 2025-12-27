# RAG Usage (CLI Only)

This project uses a strict RAG flow: answers are grounded in Pinecone sources and include inline citations that map to a sources list in the UI.

## Prerequisites

Set these env vars in `server/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/ai-assistant
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=lumina-index
```

## Interactive REPL (Recommended)

Run from `server/`:

```bash
npm run knowledge:repl
```

REPL commands:
- `list` - list sources
- `view <id>` - view full source
- `new` - add a new source
- `edit <id>` - update fields and replace/append content
- `delete <id>` - delete source and vectors
- `exit` - quit

When entering content:
- Paste multiple lines
- Type `.done` to finish
- Type `.cancel` to abort

## One-Off CLI Commands

Upsert from a file:

```bash
npm run knowledge:upsert -- \
  --title "Resume 2025" \
  --file ./knowledge/resume.txt \
  --type resume \
  --tags "resume,profile" \
  --external-id "resume-2025"
```

Upsert pasted text:

```bash
npm run knowledge:upsert -- \
  --title "Bio Draft" \
  --content "Paste your text here..." \
  --type bio \
  --external-id "bio-draft"
```

Delete a source:

```bash
npm run knowledge:delete -- --id <sourceId>
```

Tip: Use the same `--external-id` to update a source later without changing its ID.

List sources:

```bash
npm run knowledge:list
```

## Batch Sync (Manifest)

Create a manifest JSON file and run:

```bash
npm run knowledge:sync -- --manifest ./knowledge/manifest.json
```

Example manifest:

```json
{
  "sources": [
    {
      "externalId": "resume-2025",
      "title": "Resume 2025",
      "sourceType": "resume",
      "file": "./knowledge/resume.txt",
      "tags": ["resume", "profile"]
    },
    {
      "externalId": "bio-short",
      "title": "Short Bio",
      "sourceType": "bio",
      "content": "Paste your bio here."
    }
  ]
}
```

To delete any sources not present in the manifest, add `--delete-missing` and ensure each entry has an `externalId`:

```bash
npm run knowledge:sync -- --manifest ./knowledge/manifest.json --delete-missing
```

## Notes

- The assistant only answers using indexed sources. If no sources match, it will ask you to add more information.
- Citations are shown inline as `[1]`, `[2]`, etc., with a sources list displayed at the bottom of each assistant message.
