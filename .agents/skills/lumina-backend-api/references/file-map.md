# Backend File Map

## Entry point

- `server/src/server.ts`: Express bootstrap and route registration.

## Routes

- `server/src/routes/auth.ts`: signup, login, verification, password reset.
- `server/src/routes/conversations.ts`: conversation CRUD and search.
- `server/src/routes/chat.ts`: authenticated chat flow.
- `server/src/routes/guest.ts`: guest conversation flow.

## Services

- `server/src/services/geminiService.ts`: model invocation and response generation.
- `server/src/services/pineconeClient.ts`: Pinecone connectivity.
- `server/src/services/knowledgeBase.ts`: retrieval and source handling for grounded responses.

## Models

- `server/src/models/User.ts`
- `server/src/models/Conversation.ts`
- `server/src/models/GuestConversation.ts`
- `server/src/models/KnowledgeSource.ts`

## Middleware and utilities

- `server/src/middleware/auth.ts`: JWT auth guard.
- `server/src/utils/ephemeralConversations.ts`: guest or temporary conversation handling.

## Working notes

- Keep route handlers thin when possible.
- Change models only when persistence or schema behavior truly changed.
- Update shared types and documentation when API fields move.
