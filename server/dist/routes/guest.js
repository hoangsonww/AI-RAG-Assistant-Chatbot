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
const GuestConversation_1 = __importDefault(require("../models/GuestConversation"));
const geminiService_1 = require("../services/geminiService");
const uuid_1 = require("uuid");
const router = express_1.default.Router();
/**
 * @swagger
 * /api/chat/guest:
 *   post:
 *     summary: Chat with the AI assistant as a guest (unauthenticated).
 *     description: >
 *       Sends a chat message to the AI assistant. No token required. The conversation
 *       is stored in MongoDB's GuestConversation collection, keyed by a guestId.
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
 *                 example: "Hello from a guest user"
 *               guestId:
 *                 type: string
 *                 description: The ID returned from a previous request if continuing the same conversation (optional).
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: AI response for guest user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                 guestId:
 *                   type: string
 *       400:
 *         description: Bad Request
 *       500:
 *         description: Server error
 */
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { message, guestId } = req.body;
        if (!message || typeof message !== "string") {
            return res.status(400).json({ message: "Invalid or empty message." });
        }
        let guestConversation = null;
        // If a guestId was provided, try to load that conversation
        if (guestId) {
            guestConversation = yield GuestConversation_1.default.findOne({ guestId });
        }
        // If not found, create a new guest conversation
        if (!guestId) {
            const newGuestId = (0, uuid_1.v4)();
            const newGuestConv = new GuestConversation_1.default({
                guestId: newGuestId,
                messages: [],
            });
            yield newGuestConv.save();
            return handleGuestConversation(res, newGuestConv, message);
        }
        else if (!guestConversation && guestId) {
            // If a guestId was provided but no conversation was found, still create a new one but with the provided guestId
            const newGuestConv = new GuestConversation_1.default({
                guestId,
                messages: [],
            });
            yield newGuestConv.save();
            return handleGuestConversation(res, newGuestConv, message);
        }
        else {
            // We have an existing guest conversation
            // @ts-ignore
            return handleGuestConversation(res, guestConversation, message);
        }
    }
    catch (error) {
        console.error("Error in POST /api/chat/guest:", error);
        return res.status(500).json({ message: error.message });
    }
}));
function handleGuestConversation(res, guestConv, userMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        const history = guestConv.messages.map((m) => ({
            role: m.sender === "user" ? "user" : "model",
            parts: [{ text: m.text }],
        }));
        history.push({ role: "user", parts: [{ text: userMessage }] });
        const aiResponse = yield (0, geminiService_1.chatWithAI)(history, userMessage);
        guestConv.messages.push({
            sender: "user",
            text: userMessage,
            timestamp: new Date(),
        });
        guestConv.messages.push({
            sender: "model",
            text: aiResponse,
            timestamp: new Date(),
        });
        yield guestConv.save();
        return res.json({
            answer: aiResponse,
            guestId: guestConv.guestId,
        });
    });
}
exports.default = router;
// Flow: A guest user sends a message with no guestId yet -> server creates a new guestId and returns it along with the AI response ->
// The client stores this guestId in localStorage -> On subsequent messages, the client sends this guestId to continue the conversation
// When user reloads or creates a new conversation, the guestId should be deleted from localStorage. The user again will send a message
// without a guestId -> server creates a new guestId and returns it along with the AI response ...
// React: Bot messages or user messages might contain links <a> so ensure we format them as well
