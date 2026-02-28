# Retrieval Contract

## Expected behavior

- Answers should be grounded in indexed sources.
- Inline citations such as `[1]` and `[2]` should map to a source list in the response UI.
- If no relevant sources match, the system should fail clearly rather than inventing unsupported facts.

## Relevant files

- `server/src/services/knowledgeBase.ts`
- `server/src/services/pineconeClient.ts`
- `server/src/services/geminiService.ts`
- `server/src/scripts/queryKnowledge.ts`
- `server/src/scripts/checkEmbeddings.ts`
- `server/src/scripts/checkPinecone.ts`

## Working notes

- Preserve the contract between retrieval results and UI-rendered citations.
- Separate ingestion concerns from general chat route changes when possible.
- Validate compile-time health first, then use targeted CLI checks only when credentials and external services are available.
