# Backend Map

## Entry point

- `server/src/server.ts`: Express bootstrap and route registration.

## Routes

- `server/src/routes/auth.ts`
- `server/src/routes/conversations.ts`
- `server/src/routes/chat.ts`
- `server/src/routes/guest.ts`

## Services

- `server/src/services/geminiService.ts`: model orchestration.
- `server/src/services/pineconeClient.ts`: Pinecone connectivity.
- `server/src/services/knowledgeBase.ts`: retrieval and grounding logic.

## Models and middleware

- `server/src/models/User.ts`
- `server/src/models/Conversation.ts`
- `server/src/models/GuestConversation.ts`
- `server/src/models/KnowledgeSource.ts`
- `server/src/middleware/auth.ts`

## Scripts

- `server/src/scripts/knowledgeCli.ts`: source maintenance and sync.
- `server/src/scripts/checkPinecone.ts`, `queryKnowledge.ts`, `checkEmbeddings.ts`: targeted runtime checks.
