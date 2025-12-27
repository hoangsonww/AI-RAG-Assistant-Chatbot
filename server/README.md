# Lumina Backend (Server) 🚀

This directory contains the **server** side of the **Lumina** project – a robust backend built with **Node.js** and **Express** using **TypeScript**. The backend provides all the necessary API endpoints for user authentication, conversation management, and AI chat interactions, as well as integrations with external services like MongoDB, OpenAI, and Pinecone.

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
- **External Integrations:** Connects with MongoDB for data storage, Pinecone for vector-based searches, and external AI APIs to generate responses.

---

## Key Features

- **Secure API:** Implements robust JWT authentication and authorization mechanisms.
- **Conversation Handling:** Supports creating, retrieving, updating, and deleting conversations.
- **AI Chat Service:** Facilitates dynamic interactions with the AI, leveraging advanced language models.
- **External Integrations:** Seamlessly integrates with MongoDB, Pinecone, and other external services.
- **Email & Password Management:** Endpoints for email verification and password reset functionality.

---

## Technologies Used

- **Node.js** & **Express** – Server framework for handling HTTP requests and routing.
- **TypeScript** – Enhances code quality and maintainability with static typing.
- **MongoDB** (with Mongoose) – Data storage and object modeling.
- **JWT (JSON Web Tokens)** – Secure authentication mechanism.
- **Additional Libraries:** bcrypt, cors, dotenv, multer, nodemailer, openai, uuid, etc.
- **Development Tools:** nodemon and ts-node for a smooth development experience.

---

## API Endpoints

### Authentication

- **POST /api/auth/signup:** Register a new user.
- **POST /api/auth/login:** Authenticate a user and return a JWT.
- **GET /api/auth/verify-email?email=example@example.com:** Verify if an email exists.
- **POST /api/auth/reset-password:** Reset a user’s password.

### Conversations

- **POST /api/conversations:** Create a new conversation.
- **GET /api/conversations:** Retrieve all conversations for a user.
- **GET /api/conversations/:id:** Retrieve a specific conversation by its ID.
- **PUT /api/conversations/:id:** Rename or update a conversation.
- **GET /api/conversations/search/:query:** Search conversations by title or content.
- **DELETE /api/conversations/:id:** Delete a conversation.

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
   ```

4. **Run the server in development mode:**

   ```bash
   npm run dev
   ```

   This command uses `nodemon` with `ts-node` to automatically restart the server upon changes.

---

## Knowledge Base Ingestion (CLI)

All knowledge ingestion is handled via CLI to keep the production UI locked down.

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
```

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
    ├── services/             # Business logic and external service integrations
    │   └── authService.ts
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
