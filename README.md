# My Personal AI Assistant Project - Lumina 👨🏻‍💻

**David Nguyen's Personal AI Assistant** - **Lumina** is a full-stack web application that allows users to ask questions about David Nguyen, as well as any other topics, and receive instant, personalized responses powered by state‑of‑the‑art AI & RAG. Users can log in to save their conversation history or continue as guests. The app uses modern technologies and provides a sleek, responsive user interface with intuitive UX and lots of animations. 🚀

<p align="center">
  <a href="https://lumina-david.vercel.app/" target="_blank" rel="noopener noreferrer">
    <img src="img/logo.jpeg" alt="Lumina Logo" width="45%" style="border-radius: 10px">
  </a>
</p>

## Table of Contents

- [Live App](#live-app)
  - [Key Technologies](#key-technologies)
- [Features](#features)
- [Architecture](#architecture)
  - [High-Level System Architecture](#high-level-system-architecture)
  - [RAG Flow](#rag-retrieval-augmented-generation-flow)
  - [Data Flow Architecture](#data-flow-architecture)
- [Detailed Architecture Documentation](#detailed-architecture-documentation)
- [Setup & Installation](#setup--installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [AI/ML Setup](#aiml-setup)
  - [Knowledge Management](#knowledge-management)
- [Deployment](#deployment)
  - [Current Deployment (Vercel)](#current-deployment-vercel)
  - [Docker Deployment](#docker-deployment)
  - [AWS Production Deployment](#aws-production-deployment)
- [Usage](#usage)
- [Streaming Responses](#streaming-responses)
  - [How It Works](#how-it-works)
  - [Technical Implementation](#technical-implementation)
  - [Key Features](#key-features)
  - [API Endpoints](#api-endpoints-1)
  - [Event Types](#event-types)
  - [Error Recovery](#error-recovery)
- [User Interface](#user-interface)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Conversations](#conversations)
  - [Chat](#chat)
  - [Swagger API Documentation](#swagger-api-documentation)
- [Project Structure](#project-structure)
- [MCP Server (Model Context Protocol)](#mcp-server-model-context-protocol)
- [Agentic AI Pipeline](#agentic-ai-pipeline)
- [Dockerization](#dockerization)
- [OpenAPI Specification](#openapi-specification)
- [CI / CD with GitHub Actions](#ci--cd-with-github-actions)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Live App

> [!IMPORTANT]
> Currently, the app is deployed live on Vercel at: [https://lumina-david.vercel.app/](https://lumina-david.vercel.app). Feel free to check it out!
> 
> For the backend (with Swagger docs), it is deployed live also on Vercel at: [https://ai-assistant-chatbot-server.vercel.app/](https://ai-assistant-chatbot-server.vercel.app/).

Alternatively, the backup app is deployed live on Netlify at: [https://lumina-ai-chatbot.netlify.app/](https://lumina-ai-chatbot.netlify.app/).

> [!TIP]
> Go straight to [https://lumina-david.vercel.app/chat](https://lumina-david.vercel.app/chat) if you want to chat with the AI right away!

### Key Technologies

![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-FF6F61?style=for-the-badge&logo=googledataflow&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=json-web-tokens)
![Material UI](https://img.shields.io/badge/Material_UI-007FFF?style=for-the-badge&logo=mui&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=white)
![RAG](https://img.shields.io/badge/Retrieval_Augmented_Generation-FFCA28?style=for-the-badge&logo=chatbot&logoColor=black)
![WebSockets](https://img.shields.io/badge/WebSockets-008000?style=for-the-badge&logo=socketdotio&logoColor=white)
![Server-Sent Events](https://img.shields.io/badge/Server_Sent_Events-800080?style=for-the-badge&logo=serverless&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=c&logoColor=white)
![Google AI](https://img.shields.io/badge/GoogleAI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Jupyter Notebook](https://img.shields.io/badge/Jupyter_Notebook-FFCA28?style=for-the-badge&logo=jupyter&logoColor=black)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=task&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Nodemon](https://img.shields.io/badge/Nodemon-76D04B?style=for-the-badge&logo=nodemon&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-6366F1?style=for-the-badge&logo=protocol&logoColor=white)

## Features

- **AI Chatbot:** Ask questions about David Nguyen and general topics; receive responses from an AI.
- **User Authentication:** Sign up, log in, and log out using JWT authentication.
- **Passkey (WebAuthn) Sign-in:** Passwordless login with Touch ID, Face ID, Windows Hello, or a phone via QR. Supports discoverable (usernameless) credentials and per-user passkey management at `/passkeys`. Email + password remains as a fallback.
- **Conversation History:** Save, retrieve, rename, and search past conversations (only for authenticated users).
- **Auto-Generated Titles:** AI automatically generates concise, descriptive titles for new conversations based on the first message.
- **Grounded Knowledge Base:** RAG (Retrieval-Augmented Generation) with Pinecone vector search and Neo4j graph traversal, plus inline citations; knowledge is managed via CLI (REPL or one-off commands) with manifest-based batch sync for easy knowledge management.
- **Hybrid Graph + Vector RAG:** Parallel retrieval from Pinecone (semantic similarity) and Neo4j (entity-relationship traversal) with intelligent result merging, dual-source scoring, exhaustive list retrieval (automatically fetches ALL chunks from a dominant source for "list all" queries), batched entity extraction (5 chunks per LLM call for efficiency), and model rotation across 6 Gemini models for resilience. Retrieval paths are isolated via `Promise.allSettled`, and a file-backed static resume fallback is used when live retrieval backends fail.
- **Dynamic Responses:** AI-generated responses with `markdown` formatting for rich text.
- **Interactive Chat:** Real-time chat interface with smooth animations and transitions.
- **Reset Password:** Verify email and reset a user's password.
- **Streaming Responses:** AI responses are streamed in real-time using Server-Sent Events (SSE) for a more natural conversation flow.
- **Lightning-Fast Development:** Built with Vite for instant HMR and optimized production builds.
- **Responsive UI:** Built with React and Material‑UI (MUI) with a fully responsive, modern, and animated interface.
- **Landing Page:** A dynamic landing page with animations, feature cards, and call-to-action buttons.
- **Guest Mode:** Users may interact with the AI assistant as a guest, though conversations will not be saved.
- **Message Editing with Conversation Branching:** Edit any previously sent message to branch the conversation — the history is truncated at the edit point and a fresh AI response is generated from the revised message.
- **Conversation Search:** Search through conversation titles and messages to find relevant discussions.
- **Collapsible Sidebar:** A sidebar that displays conversation history, allowing users to switch between conversations easily.
- **Reinforced Learning from Human Feedback (RLHF):** Implement a feedback loop to continuously improve the AI's responses based on user interactions.
- **Dark/Light Mode:** Users can toggle between dark and light themes, with the preference stored in local storage.
- **Enterprise-Grade Deployment:** Deployed with blue/green & canary deployment strategies on AWS & Terraform for zero-downtime updates.
- **Comprehensive Testing:** Unit and integration tests for both frontend and backend using Jest and React Testing Library.
- **CI/CD Pipeline:** Automated testing and deployment using GitHub Actions.
- **Standalone MCP Server:** 30+ tools via Model Context Protocol for AI client integration.
- **Agentic AI Pipeline:** Multi-agent LangGraph pipeline with MCP-powered tool access.

## Architecture

The project follows a modern, full-stack architecture with clear separation of concerns across three main layers:

- **Frontend Layer:**
  A React application built with TypeScript and Material-UI (MUI) that provides:
  - Modern, animated user interface with responsive design
  - Client-side routing with React Router
  - JWT-based authentication and authorization
  - Real-time chat interface with markdown support
  - Inline message editing with conversation branching
  - Theme toggling (dark/light mode)
  - Collapsible sidebar for conversation history
  - WebSockets & SSE for streaming AI responses

- **Backend Layer:**
  An Express.js server written in TypeScript that handles:
  - RESTful API endpoints for authentication and data management
  - JWT token generation and validation
  - User authentication (signup, login, password reset)
  - Conversation management (CRUD operations)
  - Integration with AI services
  - Request validation and error handling

- **AI/ML Layer:**
  Hybrid RAG (Retrieval-Augmented Generation) implementation that includes:
  - **Retrieval**: Hybrid search using Pinecone (vector similarity) and Neo4j (graph traversal) in parallel
  - **Vector Search**: Semantic search with Pinecone for unstructured data
  - **Knowledge Graph**: Entity extraction and relationship mapping stored in Neo4j AuraDB
  - **Result Merging**: Intelligent merging of vector and graph results with dual-source scoring and exhaustive retrieval for list queries
  - **Entity Extraction**: Batched extraction of entities from retrieved chunks for efficient graph traversal
  - **Augmentation**: Context building with conversation history
  - **Generation**: Response generation using Google Gemini AI
  - **Knowledge Storage**: CLI-driven ingestion into Pinecone with citations returned in responses
  - **Graceful Degradation**: System operates as vector-only if Neo4j is unavailable, and can fall back to static resume context from local knowledge files when live retrieval backends fail

For detailed architecture documentation, including component diagrams, data flows, and deployment strategies, see [ARCHITECTURE.md](ARCHITECTURE.md).

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        React[React Application]
    end

    subgraph "API Gateway"
        LB[Load Balancer / CDN]
    end

    subgraph "Application Layer"
        API[Express.js API Server]
        Auth[Authentication Service]
        Chat[Chat Service]
        Conv[Conversation Service]
    end

    subgraph "AI/ML Layer"
        RAG[RAG Pipeline]
        Gemini[Google Gemini AI]
        Embed[Embedding Service]
    end

    subgraph "Data Layer"
        MongoDB[(MongoDB)]
        Pinecone[(Pinecone Vector DB)]
        Neo4j[(Neo4j Graph DB)]
    end

    Browser --> React
    React --> LB
    LB --> API

    API --> Auth
    API --> Chat
    API --> Conv

    Chat --> RAG
    RAG --> Embed
    RAG --> Gemini
    RAG --> Pinecone
    RAG --> Neo4j

    Auth --> MongoDB
    Conv --> MongoDB
    Chat --> MongoDB

    style React fill:#4285F4
    style API fill:#339933
    style MongoDB fill:#47A248
    style Pinecone fill:#FF6F61
    style Neo4j fill:#008CC1
    style Gemini fill:#4285F4
```

### RAG (Retrieval-Augmented Generation) Flow

Hybrid retrieval from Pinecone and Neo4j in parallel, followed by intelligent merging, augmentation with conversation history, and response generation with Google Gemini AI. One failing retrieval path never blocks the other, and if live retrieval backends fail, Lumina can fall back to static resume context loaded from local manifest/files.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Pinecone
    participant Neo4j
    participant Gemini
    participant MongoDB

    User->>Frontend: Send chat message
    Frontend->>Backend: POST /api/chat/auth
    Backend->>MongoDB: Fetch conversation history
    MongoDB-->>Backend: Previous messages

    Note over Backend,Neo4j: Retrieval Phase (Parallel)
    par Parallel Retrieval
        Backend->>Pinecone: Vector similarity search
        Pinecone-->>Backend: Top-K vector matches
    and
        Backend->>Neo4j: Extract query entities + graph traversal
        Neo4j-->>Backend: Top-K graph matches
    end
    Backend->>Backend: Merge & deduplicate results

    Note over Backend,Gemini: Augmentation Phase
    Backend->>Backend: Build augmented context
    Backend->>Gemini: Send enriched prompt

    Note over Gemini: Generation Phase
    Gemini->>Gemini: Generate response
    Gemini-->>Backend: AI response + citations

    Backend->>MongoDB: Save message & sources
    MongoDB-->>Backend: Saved
    Backend-->>Frontend: Return AI response
    Frontend-->>User: Display response
```

### Data Flow Architecture

```mermaid
flowchart LR
    subgraph "Frontend"
        UI[User Interface]
        State[State Management]
        API_Client[API Client]
    end

    subgraph "Backend API"
        Routes[Route Handlers]
        Middleware[Auth Middleware]
        Services[Business Logic]
    end

    subgraph "Data Sources"
        MongoDB[(MongoDB)]
        Pinecone[(Pinecone)]
        Neo4j[(Neo4j)]
        Gemini[Gemini API]
    end

    UI --> State
    State --> API_Client
    API_Client -.HTTP/REST.-> Routes
    Routes --> Middleware
    Middleware --> Services

    Services --> MongoDB
    Services --> Pinecone
    Services --> Neo4j
    Services --> Gemini

    MongoDB -.Data.-> Services
    Pinecone -.Vectors.-> Services
    Neo4j -.Graph.-> Services
    Gemini -.AI Response.-> Services

    Services -.JSON.-> Routes
    Routes -.Response.-> API_Client
    API_Client --> State
    State --> UI

    style UI fill:#4285F4
    style Services fill:#339933
    style MongoDB fill:#47A248
    style Pinecone fill:#FF6F61
    style Neo4j fill:#008CC1
    style Gemini fill:#4285F4
```

> [!NOTE]
> These diagrams provide a high-level overview of the system architecture. For detailed component interactions, database schemas, deployment strategies, and security architecture, please refer to [ARCHITECTURE.md](ARCHITECTURE.md).

## Detailed Architecture Documentation

For comprehensive architecture documentation including:
- Detailed component diagrams and interactions
- Database schema and data models
- Security architecture and authentication flows
- Deployment strategies (Docker, AWS, Terraform)
- Performance optimization and scalability
- Monitoring and observability
- Disaster recovery and backup strategies

Please see **[ARCHITECTURE.md](ARCHITECTURE.md)**

## Setup & Installation

### Backend Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/hoangsonww/AI-Assistant-Chatbot.git
   cd AI-Assistant-Chatbot/server
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Variables:**  
   Create a `.env` file in the `server` folder with the following (adjust values as needed):

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

   # Passkeys (WebAuthn)
   # RP_ID is the apex domain that the browser binds the passkey to (no scheme,
   # no port). Use "localhost" for local development. EXPECTED_ORIGIN is a
   # comma-separated list of every front-end origin that may register or sign
   # in. Credentials are domain-bound, so changing RP_ID later invalidates all
   # previously-registered passkeys.
   WEBAUTHN_RP_ID=localhost
   WEBAUTHN_RP_NAME=Lumina AI
   WEBAUTHN_EXPECTED_ORIGIN=http://localhost:3000
   ```

4. **Run the server in development mode:**

   ```bash
   npm run dev
   ```

   This uses nodemon with `ts-node` to watch for file changes.

### Frontend Setup

1. **Navigate to the client folder:**

   ```bash
   cd ../client
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Run the frontend development server:**

   ```bash
   npm start
   ```

   The app will run on [http://localhost:3000](http://localhost:3000) (or any other port you've specified in the `.env` file's `PORT` key).

### AI/ML Setup

1. Install necessary Node.js packages:

   ```bash
   npm install
   ```

2. Ingest knowledge into Pinecone with the CLI (run from `server/`):

   ```bash
   npm run knowledge:repl
   ```

   Or run a single upsert command (use `--external-id` to update later):

   ```bash
   npm run knowledge:upsert -- \
     --title "Resume 2025" \
     --file ./knowledge/resume.txt \
     --type resume \
     --tags "resume,profile" \
     --external-id "resume-2025"
   ```

3. (Optional) Set up Neo4j graph database for hybrid retrieval:
   - Create a Neo4j AuraDB instance at [https://console.neo4j.io](https://console.neo4j.io)
   - Add `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE` to `server/.env`
   - Rebuild the knowledge graph:

     ```bash
     npm run knowledge:graph:rebuild
     ```

   - Check graph status:

     ```bash
     npm run knowledge:graph:status
     ```

4. Use the REPL to edit or delete sources (`edit <id>`, `delete <id>`) as your profile changes.
5. Ensure you ingest at least one knowledge source before using the chatbot so responses can be grounded and cited.

For detailed instructions on managing knowledge (adding, updating, deleting), see [UPDATE_KNOWLEDGE.md](UPDATE_KNOWLEDGE.md).

### Knowledge Management

The knowledge base supports manifest-based batch sync, making it straightforward to add, update, or delete knowledge sources in bulk. The manifest file (`server/knowledge/manifest.json`) declaratively describes all knowledge files and their metadata, enabling one-command synchronization via `npm run knowledge:sync`. The same manifest/file set also powers the static resume fallback used during live retrieval backend failures, so fallback knowledge is easy to maintain without code changes. For the full guide covering single-file upserts, batch sync, graph rebuilds, and deletion workflows, see **[UPDATE_KNOWLEDGE.md](UPDATE_KNOWLEDGE.md)**.

## Deployment

### Current Deployment (Vercel)

The application is currently deployed on Vercel with the following setup:

- **Frontend**: Deployed at [https://lumina-david.vercel.app/](https://lumina-david.vercel.app)
- **Backend**: Deployed at [https://ai-assistant-chatbot-server.vercel.app/](https://ai-assistant-chatbot-server.vercel.app/)
- **Database**: MongoDB Atlas (cloud-hosted)
- **Vector Database**: Pinecone (cloud-hosted)
- **Graph Database**: Neo4j AuraDB (cloud-hosted)

#### Deployment Architecture

```mermaid
graph TB
    subgraph "Client Devices"
        Browser[Web Browser]
        Mobile[Mobile Browser]
    end
    
    subgraph "CDN Layer"
        Vercel[Vercel Edge Network]
        Netlify[Netlify CDN - Backup]
    end
    
    subgraph "Frontend Deployment"
        FrontendVercel[React App on Vercel]
        FrontendNetlify[React App on Netlify]
        StaticAssets[Static Assets]
    end
    
    subgraph "Backend Deployment"
        BackendVercel[Express API on Vercel]
        ServerlessFunctions[Serverless Functions]
    end
    
    subgraph "External Services"
        MongoDB[(MongoDB Atlas)]
        Pinecone[(Pinecone Vector DB)]
        GeminiAPI[Google Gemini AI API]
    end
    
    subgraph "CI/CD Pipeline"
        GitHub[GitHub Repository]
        GitHubActions[GitHub Actions]
        AutoDeploy[Auto Deploy on Push]
    end
    
    subgraph "Monitoring & Analytics"
        VercelAnalytics[Vercel Analytics]
        Logs[Application Logs]
    end
    
    Browser --> Vercel
    Mobile --> Vercel
    Vercel --> FrontendVercel
    Netlify --> FrontendNetlify
    
    FrontendVercel --> StaticAssets
    FrontendVercel --> BackendVercel
    FrontendNetlify --> BackendVercel
    
    BackendVercel --> ServerlessFunctions
    ServerlessFunctions --> MongoDB
    ServerlessFunctions --> Pinecone
    ServerlessFunctions --> GeminiAPI
    
    GitHub --> GitHubActions
    GitHubActions --> AutoDeploy
    AutoDeploy --> Vercel
    AutoDeploy --> Netlify
    
    BackendVercel --> VercelAnalytics
    BackendVercel --> Logs
    FrontendVercel --> VercelAnalytics
    
    style Browser fill:#4285F4
    style Vercel fill:#000000
    style FrontendVercel fill:#61DAFB
    style BackendVercel fill:#339933
    style MongoDB fill:#47A248
    style Pinecone fill:#FF6F61
    style GeminiAPI fill:#4285F4
    style GitHub fill:#181717
```

### Docker Deployment

Run the entire application stack locally using Docker:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d

# Stop all services
docker-compose down
```

This will start:
- Frontend on `http://localhost:3000`
- Backend on `http://localhost:5000`
- MongoDB on `localhost:27017`

### AWS Production Deployment

For production-grade AWS deployment with high availability and scalability:

```bash
# Navigate to infrastructure directory
cd terraform/

# Initialize Terraform
terraform init

# Review deployment plan
terraform plan

# Deploy infrastructure
terraform apply

# Or use provided scripts
cd ../aws/scripts/
./deploy-production.sh
```

**AWS Infrastructure includes:**
- ECS/Fargate for container orchestration
- Application Load Balancer for traffic distribution
- DocumentDB (MongoDB-compatible) for database
- ElastiCache (Redis) for caching
- CloudFront CDN for static asset delivery
- CloudWatch for monitoring and logging
- Auto-scaling groups for high availability
- Multi-AZ deployment for fault tolerance

See [aws/README.md](aws/README.md) and [terraform/README.md](terraform/README.md) for detailed deployment instructions.

## Usage

- **Landing Page:**  
  The landing page provides an overview of the app’s features and two main actions: Create Account (for new users) and Continue as Guest.

- **Authentication:**  
  Users can sign up, log in, and reset their password. Authenticated users can save and manage their conversation history.

- **Chatting:**  
  The main chat area allows users to interact with the AI assistant. The sidebar displays saved conversations (for logged-in users) and allows renaming and searching.

- **Theme:**  
  Toggle between dark and light mode via the navbar. The chosen theme is saved in local storage and persists across sessions.

## Streaming Responses

Lumina features real-time streaming responses that make conversations feel more natural and engaging. Instead of waiting for the complete response, you'll see the AI's thoughts appear word-by-word as they're generated.

### How It Works

The streaming implementation uses **Server-Sent Events (SSE)** and **WebSockets (optional)** to deliver AI responses in real-time:

1. **User sends a message** → Frontend displays "Processing Message..."
2. **Backend processes** → Shows "Thinking & Reasoning..."
3. **Connection established** → Displays "Connecting..."
4. **Streaming begins** → Text appears word-by-word with a blinking cursor
5. **Response complete** → Message is saved to conversation history

### Technical Implementation

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Gemini AI
    
    User->>Frontend: Send message
    Frontend->>Frontend: Show "Processing..."
    Frontend->>Backend: POST /api/chat/auth/stream
    Backend->>Gemini AI: Request streaming response
    
    loop For each chunk
        Gemini AI-->>Backend: Stream text chunk
        Backend-->>Frontend: SSE: chunk data
        Frontend->>Frontend: Append to message bubble
        Frontend->>User: Display growing text + cursor
    end
    
    Gemini AI-->>Backend: Stream complete
    Backend->>Backend: Save to database
    Backend-->>Frontend: SSE: done event
    Frontend->>Frontend: Finalize message
```

### Key Features

- **Live Text Rendering:** See responses appear in real-time with markdown formatting
- **Visual Feedback:** Multiple loading states (Processing → Thinking → Connecting → Streaming)
- **Blinking Cursor:** Animated cursor indicates active streaming
- **Automatic Retries:** Up to 3 retry attempts with exponential backoff (1s, 2s, 4s); retries are disabled for edit requests to prevent corrupted message state
- **Error Handling:** Graceful degradation with user-friendly error messages
- **Works Everywhere:** Available for both authenticated and guest users

### API Endpoints

**Authenticated Streaming:**
```
POST /api/chat/auth/stream
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "Your question here",
  "conversationId": "optional-conversation-id",
  "editIndex": "optional-int — truncates conversation history at this index before sending"
}
```

**Guest Streaming:**
```
POST /api/chat/guest/stream
Content-Type: application/json

{
  "message": "Your question here",
  "guestId": "optional-guest-id",
  "editIndex": "optional-int — truncates conversation history at this index before sending"
}
```

### Event Types

The SSE stream sends different event types:

- **`conversationId`/`guestId`:** Sent at the start with the conversation identifier
- **`chunk`:** Each piece of text as it's generated from the AI
- **`done`:** Signals that streaming is complete
- **`error`:** Indicates an error occurred during streaming

### Error Recovery

If a connection fails during streaming:
1. **First retry:** Wait 1 second, then retry
2. **Second retry:** Wait 2 seconds, then retry
3. **Third retry:** Wait 4 seconds, then retry
4. **All failed:** Display error message to user

The retry logic uses exponential backoff to avoid overwhelming the server while providing a smooth user experience.

## User Interface

### Landing Page

<p align="center">
  <img src="img/landing.png" alt="Landing Page" width="100%">
</p>

### Homepage

<p align="center">
  <img src="img/home.png" alt="Homepage" width="100%">
</p>

### Homepage - Empty State

<p align="center">
  <img src="img/empty-home.png" alt="Homepage - Empty State" width="100%">
</p>

### Login Page

<p align="center">
  <img src="img/login.png" alt="Login Page" width="100%">
</p>

#### Login Page - Dark Mode

<p align="center">
  <img src="img/login-dark.png" alt="Login Page - Dark Mode" width="100%">
</p>

### Signup Page

<p align="center">
  <img src="img/register.png" alt="Signup Page" width="100%">
</p>

#### Signup Page - Dark Mode

<p align="center">
  <img src="img/register-dark.png" alt="Signup Page - Dark Mode" width="100%">
</p>

### Reset Password Page

<p align="center">
  <img src="img/reset-password.png" alt="Reset Password Page" width="100%">
</p>

#### Reset Password Page - Dark Mode

<p align="center">
  <img src="img/reset-password-dark.png" alt="Reset Password Page - Dark Mode" width="100%">
</p>

### Homepage - Unauthenticated User

<p align="center">
  <img src="img/unauthed-home.png" alt="Homepage - Unauthenticated User" width="100%">
</p>

#### Homepage - Unauthenticated User - Dark Mode

<p align="center">
  <img src="img/unauthed-home-dark.png" alt="Homepage - Unauthenticated User - Dark Mode" width="100%">
</p>

### 404 Page

<p align="center">
  <img src="img/404.png" alt="404 Page" width="100%">
</p>

## API Endpoints

### Authentication

- **POST /api/auth/signup:** Create a new user.
- **POST /api/auth/login:** Authenticate a user and return a JWT.
- **GET /api/auth/verify-email?email=example@example.com:** Check if an email exists.
- **POST /api/auth/reset-password:** Reset a user's password.
- **GET /api/auth/validate-token:** Validate the current JWT token.
- **POST /api/auth/passkey/register/options:** Begin passkey registration for the authenticated user. Returns WebAuthn options + an opaque `challengeId`.
- **POST /api/auth/passkey/register/verify:** Complete passkey registration. Persists the new credential.
- **POST /api/auth/passkey/login/options:** Begin passkey sign-in. Body may include `email` to scope the prompt; omit it for discoverable (usernameless) login.
- **POST /api/auth/passkey/login/verify:** Complete passkey sign-in and return a JWT (same shape as `/login`).
- **GET /api/auth/passkey:** List the authenticated user's registered passkeys.
- **DELETE /api/auth/passkey/:credentialId:** Remove a registered passkey.

#### Authentication Flow

```mermaid
flowchart TB
    Start([User Visits App]) --> CheckAuth{Has Valid<br/>Token?}
    
    CheckAuth -->|Yes| Dashboard[Access Dashboard]
    CheckAuth -->|No| Landing[Landing Page]
    
    Landing --> Choice{User Choice}
    Choice -->|Sign Up| SignupForm[Signup Form]
    Choice -->|Login| LoginForm[Login Form]
    Choice -->|Guest| GuestChat[Guest Chat Mode]
    
    SignupForm --> ValidateSignup{Valid<br/>Credentials?}
    ValidateSignup -->|No| SignupError[Show Error]
    SignupError --> SignupForm
    ValidateSignup -->|Yes| CreateUser[Create User in MongoDB]
    CreateUser --> GenerateToken[Generate JWT Token]
    
    LoginForm --> ValidateLogin{Valid<br/>Credentials?}
    ValidateLogin -->|No| LoginError[Show Error]
    LoginError --> LoginForm
    ValidateLogin -->|Yes| VerifyPassword[Verify Password with bcrypt]
    VerifyPassword -->|Invalid| LoginError
    VerifyPassword -->|Valid| GenerateToken
    
    GenerateToken --> StoreToken[Store Token in LocalStorage]
    StoreToken --> Dashboard
    
    Dashboard --> Protected[Protected Routes]
    Protected --> ConvHistory[Conversation History]
    Protected --> SavedChats[Saved Chats]
    Protected --> Settings[User Settings]
    
    GuestChat --> TempStorage[Temporary Storage]
    TempStorage --> LimitedFeatures[Limited Features]
    
    Dashboard --> Logout{Logout?}
    Logout -->|Yes| ClearToken[Clear Token]
    ClearToken --> Landing
    
    style Start fill:#4285F4
    style Dashboard fill:#34A853
    style GuestChat fill:#FBBC04
    style GenerateToken fill:#EA4335
    style CreateUser fill:#34A853
```

### Conversations

- **POST /api/conversations:** Create a new conversation.
- **GET /api/conversations:** Get all conversations for a user.
- **GET /api/conversations/:id:** Retrieve a conversation by ID.
- **PUT /api/conversations/:id:** Rename a conversation.
- **GET /api/conversations/search/:query:** Search for conversations by title or message content.
- **DELETE /api/conversations/:id:** Delete a conversation.

#### Conversation Management Flow

```mermaid
flowchart LR
    subgraph User["👤 User Actions"]
        NewChat[Start New Chat]
        LoadChat[Load Existing Chat]
        SearchChat[Search Conversations]
        RenameChat[Rename Conversation]
        DeleteChat[Delete Conversation]
    end
    
    subgraph Frontend["⚛️ React Frontend"]
        ChatUI[Chat Interface]
        Sidebar[Conversation Sidebar]
        SearchBar[Search Bar]
    end
    
    subgraph API["🔌 Express API"]
        ConvRoutes[api/conversations Route]
        AuthMiddleware{JWT Auth}
    end
    
    subgraph Database["🗄️ MongoDB"]
        ConvCollection[(Conversations Collection)]
        UserCollection[(Users Collection)]
    end
    
    subgraph Operations["📊 CRUD Operations"]
        Create[Create]
        Read[Read]
        Update[Update]
        Delete[Delete]
    end
    
    NewChat --> ChatUI
    LoadChat --> Sidebar
    SearchChat --> SearchBar
    RenameChat --> Sidebar
    DeleteChat --> Sidebar
    
    ChatUI --> ConvRoutes
    Sidebar --> ConvRoutes
    SearchBar --> ConvRoutes
    
    ConvRoutes --> AuthMiddleware
    AuthMiddleware -->|Valid Token| Operations
    AuthMiddleware -->|Invalid Token| ErrorAuth[401 Unauthorized]
    
    Create --> ConvCollection
    Read --> ConvCollection
    Update --> ConvCollection
    Delete --> ConvCollection
    
    ConvCollection -.User Reference.-> UserCollection
    
    ConvCollection --> ConvRoutes
    ConvRoutes --> Frontend
    
    style ChatUI fill:#4285F4
    style ConvCollection fill:#47A248
    style AuthMiddleware fill:#EA4335
    style Operations fill:#34A853
```

### Chat

- **POST /api/chat/auth:** Process a chat query for authenticated users and return an AI-generated response. Accepts an optional `editIndex` to truncate conversation history for message-edit branching.
- **POST /api/chat/auth/stream:** Stream AI responses in real-time for authenticated users using Server-Sent Events (SSE). Supports `editIndex` for conversation branching.
- **POST /api/chat/guest:** Process a chat query for guest users and return an AI-generated response. Accepts an optional `editIndex` for message-edit branching.
- **POST /api/chat/guest/stream:** Stream AI responses in real-time for guest users using Server-Sent Events (SSE). Supports `editIndex` for conversation branching.

### Swagger API Documentation

<p align="center">
  <img src="img/swagger.png" alt="Swagger API Documentation" width="100%">
</p>

## Project Structure

```
AI-Assistant-Chatbot/
├── docker-compose.yml
├── openapi.yaml
├── README.md
├── ARCHITECTURE.md
├── UPDATE_KNOWLEDGE.md
├── LICENSE
├── Jenkinsfile
├── package.json
├── tsconfig.json
├── .env
├── shell/                          # Shell scripts for app setups
├── terraform/                      # Infrastructure as Code (Terraform)
├── aws/                            # AWS deployment configurations
├── img/                            # Images and screenshots
├── agentic_ai/                     # Multi-agent AI pipeline with MCP client integration
├── mcp_server/                     # Standalone MCP server (30+ tools, resources, prompts)
├── client/                         # Frontend React application
│   ├── package.json
│   ├── tsconfig.json
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── src/
│       ├── App.tsx
│       ├── index.tsx
│       ├── theme.ts
│       ├── globals.css
│       ├── index.css
│       ├── dev/
│       │   ├── palette.tsx
│       │   ├── previews.tsx
│       │   ├── index.ts
│       │   └── useInitial.ts
│       ├── services/
│       │   └── api.ts              # API client with streaming support
│       ├── types/
│       │   ├── conversation.d.ts
│       │   └── user.d.ts
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── Sidebar.tsx
│       │   ├── ChatArea.tsx        # Main chat interface with streaming
│       │   └── CopyIcon.tsx
│       ├── styles/
│       │   └── (various style files)
│       └── pages/
│           ├── LandingPage.tsx
│           ├── Home.tsx
│           ├── Login.tsx
│           ├── Signup.tsx
│           ├── NotFoundPage.tsx
│           ├── ForgotPassword.tsx
│           └── Terms.tsx
└── server/                         # Backend Express application
    ├── package.json
    ├── tsconfig.json
    ├── Dockerfile
    ├── docker-compose.yml
    ├── knowledge/
    │   ├── manifest.json            # Declarative manifest for batch knowledge sync
    │   ├── son-nguyen-profile.txt
    │   ├── son-nguyen-honors-awards.txt
    │   ├── son-nguyen-publications.txt
    │   ├── son-nguyen-projects.txt
    │   └── son-nguyen-skills.txt
    └── src/
        ├── server.ts
        ├── models/
        │   ├── Conversation.ts
        │   ├── GuestConversation.ts
        │   ├── KnowledgeSource.ts
        │   └── User.ts
        ├── routes/
        │   ├── auth.ts
        │   ├── conversations.ts
        │   ├── chat.ts             # Authenticated chat with streaming
        │   └── guest.ts            # Guest chat with streaming
        ├── services/
        │   ├── geminiService.ts    # AI service with hybrid RAG + streaming
        │   ├── geminiEmbeddings.ts # Embedding generation
        │   ├── knowledgeBase.ts    # Chunking, embeddings, vector+graph retrieval
        │   ├── pineconeClient.ts   # Pinecone vector DB client
        │   ├── neo4jClient.ts      # Neo4j graph DB client
        │   ├── graphKnowledge.ts   # Graph entity extraction & retrieval
        │   └── staticResumeFallback.ts # File-backed fallback retrieval context
        ├── types/
        │   └── graph.ts            # Graph entity & relationship types
        ├── scripts/
        │   └── knowledgeCli.ts     # CLI + REPL ingestion
        ├── utils/
        │   └── (utility functions)
        ├── middleware/
        │   └── auth.ts
        └── public/
            └── favicon.ico
```

## MCP Server (Model Context Protocol)

Lumina includes a **standalone MCP server** (`mcp_server/`) that exposes 30+ tools, 7 resources, and 6 prompts through the standardized [Model Context Protocol](https://modelcontextprotocol.io). Any MCP-compatible client — Claude Desktop, ChatGPT, Cursor, VS Code Copilot — can connect and use Lumina's capabilities.

### Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| **Pipeline** | 5 | Run, monitor, cancel agentic AI pipelines |
| **Knowledge** | 4 | Search and retrieve RAG knowledge base documents |
| **Code** | 3 | Search code, analyze files, explore project structure |
| **File** | 5 | Read, write, list, search files |
| **Web** | 2 | Fetch URLs, extract structured content |
| **Data** | 3 | Parse CSV/JSON, transform data |
| **Git** | 4 | Status, log, diff, blame operations |
| **System** | 6 | Health checks, metrics, environment diagnostics |

### Quick Start

```bash
# Install MCP server dependencies
pip install -r mcp_server/requirements.txt

# Run with stdio transport (for Claude Desktop, Cursor, VS Code)
python -m mcp_server

# Run with SSE transport (for remote/network access)
python -m mcp_server --transport sse --port 8080
```

### Claude Desktop Integration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lumina": {
      "command": "python",
      "args": ["-m", "mcp_server"],
      "cwd": "/path/to/AI-RAG-Assistant-Chatbot"
    }
  }
}
```

> 📖 See [`mcp_server/README.md`](mcp_server/README.md) for the complete tool reference, configuration guide, and integration examples.

## Agentic AI Pipeline

Lumina includes a **multi-agent AI pipeline** implemented in Python (`agentic_ai/`). The pipeline uses LangGraph for agent orchestration and connects to the standalone MCP server as an MCP client, giving every agent access to 30+ real tools through the Model Context Protocol.

Key capabilities:

- **MCP Client Integration** — Agents connect to the standalone MCP server for tool access, enabling pipeline operations, knowledge retrieval, code search, file management, and more.
- **Intelligent Tool Routing** — The enhanced executor agent routes tool calls to the appropriate MCP tool category based on task context.
- **Tool-Aware Research** — The enhanced researcher agent leverages MCP tools for grounded, evidence-based research across code, knowledge, and web sources.
- **Multi-Agent Orchestration** — Coordinator, researcher, executor, and verifier agents collaborate through a LangGraph state machine.

The pipeline is located in the `agentic_ai/` directory and is optional for the main assistant.

> [!TIP]
> For more information on the Agentic AI pipeline, please refer to the [`agentic_ai/README.md`](agentic_ai/README.md) file.

## Dockerization

To run the application using Docker, simply run `docker-compose up` in the root directory of the project. This will start both the backend and frontend services as defined in the `docker-compose.yml` file.

**Why Dockerize?**

- **Consistency:** Ensures the application runs the same way in different environments.
- **Isolation:** Keeps dependencies and configurations contained.
- **Scalability:** Makes it easier to scale services independently.
- **Simplified Deployment:** Streamlines the deployment process.
- **Easier Collaboration:** Provides a consistent environment for all developers.

## OpenAPI Specification

There is an OpenAPI specification file (`openapi.yaml`) in the root directory that describes the API endpoints, request/response formats, and authentication methods. This can be used to generate client SDKs or documentation.

To view the API documentation, you can use tools like Swagger UI or Postman to import the `openapi.yaml` file. Or just go to the `/docs` endpoint of the deployed backend.

## CI / CD with GitHub Actions

This project includes a GitHub Actions workflow for continuous integration and deployment. The workflow is defined in the `.github/workflows/workflow.yml` file and includes steps to:
- Install dependencies for both the frontend and backend.
- Run tests for both the frontend and backend.
- Build the frontend and backend applications.
- Deploy the applications to Vercel and Netlify.
- Notify the team via email on successful deployments.
- Notify the team via email on failed builds or tests.
- Generate and upload artifacts for the frontend and backend builds.
- Run linting checks for both the frontend and backend code.
- _and more..._

This workflow ensures that every commit and pull request is tested and deployed automatically, providing a robust CI/CD pipeline.

Please ensure you have the necessary secrets configured in your GitHub repository for deployment (e.g, Vercel and Netlify tokens, etc.). Also, feel free to customize the workflow under [`.github/workflows/workflow.yml`](.github/workflows/workflow.yml) to suit your needs.

## Testing

This project includes unit and integration tests with Jest for both the frontend and backend. To run the tests:

- **Frontend:**  
  Navigate to the `client` directory and run:

  ```bash
  npm test
  ```
  
- **Backend:**  
  Navigate to the `server` directory and run:

  ```bash
  npm test
  ```

## Contributing

1. Fork the repository.
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

If you have any questions or suggestions, feel free to reach out to me:

- **David Nguyen**
  - [LinkedIn](https://www.linkedin.com/in/hoangsonw/)
  - [GitHub](https://github.com/hoangsonww)
  - [Email](mailto:hoangson091104@gmail.com)

---

Thank you for checking out the AI Assistant Project! If you have any questions or feedback, feel free to reach out. Happy coding! 🚀

[⬆️ Back to Top](#table-of-contents)
