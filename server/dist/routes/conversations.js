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
const auth_1 = require("../middleware/auth");
const Conversation_1 = __importDefault(require("../models/Conversation"));
const router = express_1.default.Router();
/**
 * @swagger
 * /api/conversations:
 *   post:
 *     summary: Create a new conversation.
 *     description: Creates a new conversation for the authenticated user with a default title of "New Conversation".
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A conversation object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The unique identifier for the conversation.
 *                 user:
 *                   type: string
 *                   description: The ID of the user who owns this conversation.
 *                 title:
 *                   type: string
 *                   description: The title of the conversation.
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sender:
 *                         type: string
 *                         enum: [user, assistant]
 *                         description: The sender of the message.
 *                       text:
 *                         type: string
 *                         description: The content of the message.
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         description: The time when the message was sent.
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The creation time of the conversation.
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The last update time of the conversation.
 *               example:
 *                 _id: "603e5e534cc7d52e2c2f7c90"
 *                 user: "603e5e534cc7d52e2c2f7c90"
 *                 title: "New Conversation"
 *                 messages: []
 *                 createdAt: "2023-02-06T00:00:00.000Z"
 *                 updatedAt: "2023-02-06T00:00:00.000Z"
 *       500:
 *         description: Internal server error.
 */
router.post("/", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const conversation = new Conversation_1.default({
            user: userId,
            title: "New Conversation",
            messages: [],
        });
        yield conversation.save();
        res.json(conversation);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
/**
 * @swagger
 * /api/conversations:
 *   get:
 *     summary: Get all conversations for the authenticated user.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of conversations.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: The unique identifier for the conversation.
 *                   user:
 *                     type: string
 *                     description: The ID of the user who owns this conversation.
 *                   title:
 *                     type: string
 *                     description: The title of the conversation.
 *                   messages:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         sender:
 *                           type: string
 *                           enum: [user, assistant]
 *                           description: The sender of the message.
 *                         text:
 *                           type: string
 *                           description: The content of the message.
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           description: The time when the message was sent.
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: The creation time of the conversation.
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     description: The last update time of the conversation.
 *                 example:
 *                   - _id: "603e5e534cc7d52e2c2f7c90"
 *                     user: "603e5e534cc7d52e2c2f7c90"
 *                     title: "New Conversation"
 *                     messages: []
 *                     createdAt: "2023-02-06T00:00:00.000Z"
 *                     updatedAt: "2023-02-06T00:00:00.000Z"
 *       500:
 *         description: Internal server error.
 */
router.get("/", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const conversations = yield Conversation_1.default.find({ user: userId });
        res.json(conversations);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
/**
 * @swagger
 * /api/conversations/{id}:
 *   get:
 *     summary: Get a conversation by ID.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversation ID.
 *     responses:
 *       200:
 *         description: A conversation object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The unique identifier for the conversation.
 *                 user:
 *                   type: string
 *                   description: The ID of the user who owns this conversation.
 *                 title:
 *                   type: string
 *                   description: The title of the conversation.
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sender:
 *                         type: string
 *                         enum: [user, assistant]
 *                         description: The sender of the message.
 *                       text:
 *                         type: string
 *                         description: The content of the message.
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         description: The time when the message was sent.
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The creation time of the conversation.
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The last update time of the conversation.
 *               example:
 *                 _id: "603e5e534cc7d52e2c2f7c90"
 *                 user: "603e5e534cc7d52e2c2f7c90"
 *                 title: "New Conversation"
 *                 messages:
 *                   - sender: user
 *                     text: "Hello"
 *                     timestamp: "2023-02-06T00:00:00.000Z"
 *                 createdAt: "2023-02-06T00:00:00.000Z"
 *                 updatedAt: "2023-02-06T00:00:00.000Z"
 *       404:
 *         description: Conversation not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/:id", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const conversation = yield Conversation_1.default.findOne({
            _id: req.params.id,
            user: userId,
        });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        res.json(conversation);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
/**
 * @swagger
 * /api/conversations/{id}:
 *   put:
 *     summary: Rename (update) a conversation's title.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversation ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated Conversation Title"
 *     responses:
 *       200:
 *         description: The updated conversation object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: The unique identifier for the conversation.
 *                 user:
 *                   type: string
 *                   description: The ID of the user who owns this conversation.
 *                 title:
 *                   type: string
 *                   description: The title of the conversation.
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sender:
 *                         type: string
 *                         enum: [user, assistant]
 *                         description: The sender of the message.
 *                       text:
 *                         type: string
 *                         description: The content of the message.
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         description: The time when the message was sent.
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The creation time of the conversation.
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The last update time of the conversation.
 *               example:
 *                 _id: "603e5e534cc7d52e2c2f7c90"
 *                 user: "603e5e534cc7d52e2c2f7c90"
 *                 title: "Updated Conversation Title"
 *                 messages: []
 *                 createdAt: "2023-02-06T00:00:00.000Z"
 *                 updatedAt: "2023-02-06T00:00:00.000Z"
 *       404:
 *         description: Conversation not found.
 *       500:
 *         description: Internal server error.
 */
router.put("/:id", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { title } = req.body;
        const conversation = yield Conversation_1.default.findOneAndUpdate({ _id: req.params.id, user: userId }, { title }, { new: true });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        res.json(conversation);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
/**
 * @swagger
 * /api/conversations/search/{query}:
 *   get:
 *     summary: Search conversations by title or message content.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The search query.
 *     responses:
 *       200:
 *         description: A list of conversations matching the search criteria.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: The unique identifier for the conversation.
 *                   user:
 *                     type: string
 *                     description: The ID of the user who owns this conversation.
 *                   title:
 *                     type: string
 *                     description: The title of the conversation.
 *                   messages:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         sender:
 *                           type: string
 *                           enum: [user, assistant]
 *                           description: The sender of the message.
 *                         text:
 *                           type: string
 *                           description: The content of the message.
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           description: The time when the message was sent.
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: The creation time of the conversation.
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     description: The last update time of the conversation.
 *                 example:
 *                   - _id: "603e5e534cc7d52e2c2f7c90"
 *                     user: "603e5e534cc7d52e2c2f7c90"
 *                     title: "Conversation Title"
 *                     messages:
 *                       - sender: user
 *                         text: "Hello"
 *                         timestamp: "2023-02-06T00:00:00.000Z"
 *                     createdAt: "2023-02-06T00:00:00.000Z"
 *                     updatedAt: "2023-02-06T00:00:00.000Z"
 *       500:
 *         description: Internal server error.
 */
router.get("/search/:query", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const query = req.params.query;
        // Search by conversation title or within messages' text
        const conversations = yield Conversation_1.default.find({
            user: userId,
            $or: [
                { title: { $regex: query, $options: "i" } },
                { "messages.text": { $regex: query, $options: "i" } },
            ],
        });
        res.json(conversations);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
/**
 * @swagger
 * /api/conversations/{id}:
 *   delete:
 *     summary: Delete a conversation.
 *     tags:
 *       - Conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversation ID to delete.
 *     responses:
 *       200:
 *         description: Conversation deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Conversation deleted successfully"
 *       404:
 *         description: Conversation not found.
 *       500:
 *         description: Internal server error.
 */
router.delete("/:id", auth_1.authenticateJWT, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const conversation = yield Conversation_1.default.findOneAndDelete({
            _id: req.params.id,
            user: userId,
        });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }
        res.json({ message: "Conversation deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}));
exports.default = router;
