"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const path_1 = __importDefault(require("path"));
const serve_favicon_1 = __importDefault(require("serve-favicon"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, serve_favicon_1.default)(path_1.default.join(__dirname, "public", "favicon.ico")));
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
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/ai-assistant";
mongoose_1.default
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
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
const auth_1 = __importDefault(require("./routes/auth"));
const conversations_1 = __importDefault(require("./routes/conversations"));
const chat_1 = __importDefault(require("./routes/chat"));
const guest_1 = __importDefault(require("./routes/guest"));
app.use("/api/auth", auth_1.default);
app.use("/api/conversations", conversations_1.default);
app.use("/api/chat/auth", chat_1.default);
app.use("/api/chat/guest", guest_1.default);
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
exports.default = app;
