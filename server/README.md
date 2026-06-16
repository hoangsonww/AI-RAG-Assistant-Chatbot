# Lumina Backend (Server) 🚀

This directory contains the **server** side of the **Lumina** project – a robust backend built with **Node.js** and **Express** using **TypeScript**. The backend provides all the necessary API endpoints for user authentication, conversation management, and AI chat interactions, as well as integrations with external services like MongoDB, Google Gemini, Pinecone, and Neo4j.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technologies Used](#technologies-used)
- [API Endpoints](#api-endpoints)
- [Setup & Installation](#setup--installation)
  - [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Dockerization](#dockerization)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Lumina backend is designed to handle:

- **User Authentication:** Secure sign up, login, and password reset functionalities using JWT.
- **Conversation Management:** Endpoints for creating, retrieving, updating, searching, and deleting conversations.
- **AI Chat Integration:** Processes chat queries to generate AI responses.
- **External Integrations:** Connects with MongoDB for data storage, Pinecone for vector-based searches, Neo4j for graph-based knowledge retrieval, and external AI APIs to generate responses.

---

## Key Features

- **Secure API:** Implements robust JWT authentication and authorization mechanisms.
- **Conversation Handling:** Supports creating, retrieving, updating, and deleting conversations. The list and search endpoints return lightweight metadata-only summaries (titles and timestamps, no `messages`) backed by a compound index for fast, low-payload responses; full message bodies load when a conversation is selected.
- **AI Chat Service:** Facilitates dynamic interactions with the AI, leveraging advanced language models.
- **Hybrid RAG Pipeline:** Combines Pinecone vector similarity search with Neo4j graph traversal for comprehensive knowledge retrieval. Both retrieval paths run in parallel via `Promise.allSettled`, so one failing path never blocks the other. Results are merged to produce grounded, citation-backed responses, and static resume fallback context can be used when live retrieval backends fail.
- **Topic-Aware Retrieval Completeness:** When a query maps to a known topic (experience/career, education, certifications, publications, awards, volunteering, languages, or test scores), the retriever deterministically pulls the full canonical knowledge source(s) for that topic (bounded to ~30 chunks) and places them ahead of the vector/graph results, so answers never omit items that fell below the top-K similarity cutoff. List-query detection is broadened and base top-K raised (10→12, list 20→24), and the prompt instructs the model to include every relevant item (most-recent-first for roles).
- **Knowledge Graph:** Automatic entity extraction and relationship mapping stored in Neo4j AuraDB. Entities and relationships are extracted from ingested documents using Gemini AI and persisted as a queryable graph.
- **Resilient AI Calls:** Embedding generation and graph entity-extraction retry indefinitely on rate-limit (429) and transient network/5xx errors (e.g. `fetch failed`, `ECONNRESET`, timeouts), honoring the server-suggested retry delay, while non-retryable errors (bad key, invalid request, malformed response) fail fast. This keeps a single transient blip or free-tier quota window from aborting a full knowledge sync.
- **External Integrations:** Seamlessly integrates with MongoDB, Pinecone, Neo4j, and other external services.
- **Email & Password Management:** Endpoints for email verification and password reset functionality.
- **CLI for Knowledge Management:** Command-line tools for ingesting, updating, and managing knowledge sources, as well as monitoring and rebuilding the Neo4j graph.
- **Dockerized:** Comes with a Dockerfile and optional Docker Compose configuration for easy containerization and deployment.
- **Passkeys**: Supports passwordless authentication using WebAuthn passkeys for enhanced security and user convenience.

---

## Technologies Used

- **Node.js** & **Express** – Server framework for handling HTTP requests and routing.
- **TypeScript** – Enhances code quality and maintainability with static typing.
- **MongoDB** (with Mongoose) – Data storage and object modeling.
- **JWT (JSON Web Tokens)** – Secure authentication mechanism.
- **Neo4j** (with neo4j-driver) – Graph database for entity-relationship knowledge retrieval.
- **@simplewebauthn/server** – WebAuthn/FIDO2 server library powering passkey registration and authentication.
- **Additional Libraries:** bcrypt, cors, dotenv, multer, nodemailer, openai, uuid, etc.
- **Development Tools:** nodemon and ts-node for a smooth development experience.

---

## API Endpoints

### Authentication

- **POST /api/auth/signup:** Register a new user.
- **POST /api/auth/login:** Authenticate a user and return a JWT.
- **GET /api/auth/verify-email?email=example@example.com:** Verify if an email exists.
- **POST /api/auth/reset-password:** Reset a user's password.
- **GET /api/auth/validate-token:** Validate the current JWT token.

#### Passkeys (WebAuthn)

- **POST /api/auth/passkey/register/options:** Begin passkey registration for the authenticated user. Returns WebAuthn options + an opaque `challengeId`.
- **POST /api/auth/passkey/register/verify:** Complete passkey registration. Persists the new credential on the user document.
- **POST /api/auth/passkey/login/options:** Begin passkey sign-in. Body may include `email` to scope the prompt; omit it for discoverable (usernameless) login.
- **POST /api/auth/passkey/login/verify:** Complete passkey sign-in and return a JWT (same shape as `/login`).
- **GET /api/auth/passkey:** List the authenticated user's registered passkeys.
- **DELETE /api/auth/passkey/:credentialId:** Remove a registered passkey.

Challenges are stored in a `challenges` collection with a TTL index (5-minute expiry) and consumed exactly once. Email + password remains the fallback if a user loses every passkey.

### Conversations

- **POST /api/conversations:** Create a new conversation.
- **GET /api/conversations:** Retrieve all conversations for a user. Returns `ConversationSummary` objects (title + timestamps only; the `messages` array is omitted) via a projected, `.lean()` query for a smaller, faster response.
- **GET /api/conversations/:id:** Retrieve a specific conversation by its ID, including its full `messages` array.
- **PUT /api/conversations/:id:** Rename or update a conversation.
- **GET /api/conversations/search/:query:** Search conversations by title or content. Also returns metadata-only `ConversationSummary` objects.
- **DELETE /api/conversations/:id:** Delete a conversation.

> The list and search responses use the `ConversationSummary` schema (messages omitted), documented in `openapi.yaml`. Fetching a single conversation by ID still returns full messages, loaded on selection.

### Chat

- **POST /api/chat:** Process a chat query and return an AI-generated response.

For additional API details, please refer to the OpenAPI specification file (`openapi.yaml`) located in the project root or visit the `/docs` endpoint on the deployed server.

---

## Setup & Installation

### Development Setup

1. **Navigate to the server folder:**

   ```bash
   cd server
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Variables:**  
   Create a `.env` file in the `server` directory with the following variables (modify as needed):

   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ai-assistant
   JWT_SECRET=your_jwt_secret_here
   GOOGLE_AI_API_KEY=your_google_ai_api_key_here
   PINECONE_API_KEY=your_pinecone_api_key_here
   PINECONE_INDEX_NAME=lumina-index

   # Neo4j AuraDB (optional — enables graph RAG)
   NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
   NEO4J_USERNAME=your_username
   NEO4J_PASSWORD=your_password
   NEO4J_DATABASE=your_database

   # Passkeys (WebAuthn). RP_ID is the apex domain — no scheme, no port.
   # EXPECTED_ORIGIN is a comma-separated list of front-end origins allowed to
   # register or sign in. Credentials are domain-bound; changing RP_ID after
   # users enroll invalidates all previously-registered passkeys.
   WEBAUTHN_RP_ID=localhost
   WEBAUTHN_RP_NAME=Lumina AI
   WEBAUTHN_EXPECTED_ORIGIN=http://localhost:3000
   ```

   > **Note:** Neo4j is optional. When the Neo4j environment variables are not set or the database is unreachable, the system gracefully degrades to vector-only retrieval via Pinecone. If live retrieval backends fail, static resume fallback context is loaded from `server/knowledge/manifest.json` and referenced files.

4. **Run the server in development mode:**

   ```bash
   npm run dev
   ```

   This command uses `nodemon` with `ts-node` to automatically restart the server upon changes.

---

## Knowledge Base Ingestion (CLI)

All knowledge ingestion is handled via CLI to keep the production UI locked down.

Knowledge sources live in `server/knowledge/` and are registered in `knowledge/manifest.json`. These include the public-safe profile (current employer added) plus dedicated sources for projects, skills, certifications, publications, awards, volunteering, coursework, languages/organizations, and test scores. A dense, single-unit reverse-chronological `son-nguyen-career-timeline.txt` keeps career/experience queries returning complete results. Running `npm run knowledge:sync` re-indexes the manifest, including this source.

1. Ensure your `.env` has `PINECONE_INDEX_NAME=lumina-index` (or your target index name).
2. Run one of the commands below from the `server` directory.

Examples:

```bash
# Launch interactive REPL
npm run knowledge:repl

# Use the REPL to edit or delete sources as your profile changes.

# Upsert a single source from a file
npm run knowledge:upsert -- \
  --title "Resume 2025" \
  --file ./knowledge/resume.txt \
  --type resume \
  --tags "resume,profile" \
  --external-id "resume-2025"

# List sources
npm run knowledge:list

# Delete a source by id
npm run knowledge:delete -- --id <sourceId>

# Batch sync from a manifest
npm run knowledge:sync -- --manifest ./knowledge/manifest.json

# Check graph database connection and statistics
npm run knowledge:graph:status

# Rebuild the knowledge graph from all existing sources
npm run knowledge:graph:rebuild
```

### Graph RAG Commands

The graph commands manage the Neo4j knowledge graph that powers the graph-based retrieval path:

| Command | Description |
|---------|-------------|
| `npm run knowledge:graph:status` | Display Neo4j connection status, node/edge counts, and schema info. |
| `npm run knowledge:graph:rebuild` | Re-extract entities and relationships from all ingested sources and rebuild the graph from scratch. |

When new sources are upserted via `knowledge:upsert` or `knowledge:sync`, entities and relationships are automatically extracted and stored in Neo4j alongside the Pinecone vector embeddings. Use `graph:rebuild` if you need to regenerate the graph after changes to the extraction logic or to recover from a corrupted graph state. The same manifest/file workflow also powers static resume fallback retrieval, so fallback data can be inserted, updated, or removed without changing runtime code.

---

## Project Structure

An overview of the server directory structure:

```
server/
├── package.json              # Server configuration and dependencies
├── tsconfig.json             # TypeScript configuration
├── Dockerfile                # Docker configuration for the backend
├── docker-compose.yml        # Docker Compose configuration (if applicable)
└── src/
    ├── server.ts             # Entry point of the Express application
    ├── models/               # Mongoose models for MongoDB collections
    │   ├── Conversation.ts
    │   └── User.ts
    ├── routes/               # API route definitions
    │   ├── auth.ts
    │   ├── conversations.ts
    │   └── chat.ts
    ├── types/                # TypeScript type definitions
    │   └── graph.ts          # Graph entity & relationship types
    ├── services/             # Business logic and external service integrations
    │   ├── authService.ts
    │   ├── neo4jClient.ts    # Neo4j connection, schema init, health check
    │   ├── graphKnowledge.ts # Entity extraction, graph ingestion & retrieval
    │   ├── geminiService.ts  # AI service with hybrid vector+graph RAG
    │   ├── knowledgeBase.ts  # Chunking, embeddings, vector+graph ingestion
    │   ├── geminiEmbeddings.ts # Embedding generation
    │   ├── pineconeClient.ts # Pinecone vector DB client
    │   └── staticResumeFallback.ts # File-backed fallback retrieval context
    ├── utils/                # Utility scripts (e.g., ephemeralConversations)
    │   └── ephemeralConversations.ts
    └── middleware/           # Express middleware (e.g., authentication)
        └── auth.ts
```

---

## Dockerization

To run the backend using Docker:

1. Ensure Docker is installed on your system.
2. From the project root, run:

   ```bash
   docker-compose up
   ```

This command will start the backend (and frontend if included in the Compose file) as specified in the `docker-compose.yml` configuration.

---

## Deployment

For production deployment, consider hosting services like **Heroku**, **AWS**, or **Vercel**. Ensure that you set your environment variables appropriately on your hosting platform. Also, update any necessary API endpoints in your frontend to match the production URL.

---

## Contributing

1. **Fork** the repository.
2. **Create** your feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Commit** your changes:

   ```bash
   git commit -m "Add feature: description"
   ```

4. **Push** your branch:

   ```bash
   git push origin feature/your-feature-name
   ```

5. Open a **Pull Request** with detailed explanations of your changes.

---

## License

This project is licensed under the [MIT License](../LICENSE).

---

Thank you for exploring the Lumina backend! For any questions or contributions, please feel free to get in touch. Happy coding!
