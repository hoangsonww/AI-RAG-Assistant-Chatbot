import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import favicon from "serve-favicon";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const corsOptions = {
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

app.use(cors(corsOptions));
app.use(express.json());

// Connect to MongoDB
const mongoURI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ai-assistant";
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error: ", err);
  });

// Swagger Options and Specification with Bearer Authentication
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Lumina AI Assistant API",
      version: "1.1.0",
      description: "API documentation for the Lumina AI Assistant application.",
      contact: {
        name: "David Nguyen",
        url: "https://sonnguyenhoang.com/",
        email: "hoangson091104@gmail.com",
      },
      license: {
        name: "MIT License",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.VERCEL_URL
          ? `https://ai-assistant-chatbot-server.vercel.app`
          : `http://localhost:${port}`,
        description: "Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    // Apply bearerAuth globally (optional)
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/routes/*.ts",
    "./src/routes/*.js",
    "./src/models/*.ts",
    "./src/models/*.js",
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.get("/api/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});
app.get("/docs", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Lumina AI Assistant API Docs</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function() {
          SwaggerUIBundle({
            url: '/api/swagger.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: "StandaloneLayout"
          });
        }
      </script>
    </body>
    </html>
  `);
});
app.get("/", (req, res) => {
  res.redirect("/docs");
});

import authRoutes from "./routes/auth";
import conversationRoutes from "./routes/conversations";
import chatRoutes from "./routes/chat";
import guestRoutes from "./routes/guest";

app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/chat/auth", chatRoutes);
app.use("/api/chat/guest", guestRoutes);

/*
 * IMPORTANT:
 * Remove app.listen() when deploying to Vercel.
 * Vercel automatically handles starting the server.
 */
if (process.env.NODE_ENV !== "production") {
  // For local development only.
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

// Export the Express app as the default export for Vercel's serverless function.
export default app;
