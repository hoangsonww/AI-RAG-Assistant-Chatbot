"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Conversation_1 = __importDefault(require("../models/Conversation"));
const geminiService_1 = require("../services/geminiService");
const router = express_1.default.Router();
/**
 * @swagger
 * /api/chat/auth:
 *   post:
 *     summary: Chat with the AI assistant as an authenticated user.
 *     description: >
 *       Sends a chat message to the AI assistant. Requires a valid JWT in the Authorization header.
 *       The conversation is stored in MongoDB's Conversation collection.
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Hello, AI!"
 *               conversationId:
 *                 type: string
 *                 description: The MongoDB _id of an existing conversation.
 *                 example: "60d5ec49f5a3c80015c0d9a4"
 *     responses:
 *       200:
 *         description: AI response for authenticated user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                 conversationId:
 *                   type: string
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { message, conversationId } = req.body;
        if (!message || typeof message !== "string") {
            return res.status(400).json({ message: "Invalid or empty message." });
        }
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Missing Authorization header" });
        }
        const token = authHeader.split(" ")[1];
        let userId = null;
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            if (decoded && decoded.id) {
                userId = decoded.id;
            }
            else {
                return res.status(401).json({ message: "Invalid token payload" });
            }
        }
        catch (_a) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        let conversation = null;
        let history = [];
        if (conversationId) {
            conversation = yield Conversation_1.default.findOne({
                _id: conversationId,
                user: userId,
            });
            if (!conversation) {
                return res.status(404).json({ message: "Conversation not found" });
            }
            history = conversation.messages.map((msg) => ({
                role: msg.sender === "user" ? "user" : "model",
                parts: [{ text: msg.text }],
            }));
        }
        else {
            conversation = new Conversation_1.default({ user: userId, messages: [] });
            yield conversation.save();
        }
        history.push({ role: "user", parts: [{ text: message }] });
        const aiResponse = yield (0, geminiService_1.chatWithAI)(history, message);
        conversation.messages.push({
            sender: "user",
            text: message,
            timestamp: new Date(),
        });
        conversation.messages.push({
            sender: "model",
            text: aiResponse,
            timestamp: new Date(),
        });
        yield conversation.save();
        return res.json({
            answer: aiResponse,
            conversationId: conversation._id,
        });
    }
    catch (error) {
        console.error("Error in POST /api/chat/auth:", error);
        return res.status(500).json({ message: error.message });
    }
}));
exports.default = router;
