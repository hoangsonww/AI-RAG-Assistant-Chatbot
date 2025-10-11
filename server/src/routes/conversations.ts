import express, { Request, Response } from "express";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import Conversation, { IConversation, IMessage } from "../models/Conversation";
import { generateConversationSummary } from "../services/geminiService";

const router = express.Router();

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
router.post("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const conversation = new Conversation({
      user: userId,
      title: "New Conversation",
      messages: [],
    });
    await conversation.save();
    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

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
router.get("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ user: userId });
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

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
router.get("/:id", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      user: userId,
    });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

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
router.put("/:id", authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;
    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { title },
      { new: true },
    );
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

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
router.get(
  "/search/:query",
  authenticateJWT,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const query = req.params.query;
      // Search by conversation title or within messages' text
      const conversations = await Conversation.find({
        user: userId,
        $or: [
          { title: { $regex: query, $options: "i" } },
          { "messages.text": { $regex: query, $options: "i" } },
        ],
      });
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
);

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
router.delete(
  "/:id",
  authenticateJWT,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const conversation = await Conversation.findOneAndDelete({
        _id: req.params.id,
        user: userId,
      });
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      res.json({ message: "Conversation deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /api/conversations/{id}/summary:
 *   get:
 *     summary: Get the stored summary of a conversation.
 *     description: Retrieves the previously generated summary if it exists.
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
 *         description: Summary retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                 highlights:
 *                   type: array
 *                   items:
 *                     type: string
 *                 actionItems:
 *                   type: array
 *                   items:
 *                     type: string
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Conversation or summary not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/summary",
  authenticateJWT,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const conversation = await Conversation.findOne({
        _id: req.params.id,
        user: userId,
      });

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (!conversation.summary) {
        return res
          .status(404)
          .json({ message: "No summary available for this conversation" });
      }

      res.json({
        summary: conversation.summary.summary,
        highlights: conversation.summary.highlights,
        actionItems: conversation.summary.actionItems,
        generatedAt: conversation.summary.generatedAt,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /api/conversations/{id}/summary:
 *   post:
 *     summary: Generate AI-powered summary of a conversation.
 *     description: >
 *       Generates a concise summary, key highlights, and action items for the specified conversation.
 *       The summary is stored in the conversation document for future reference.
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
 *         description: Summary generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                   description: A concise summary of the conversation.
 *                 highlights:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Key highlights or important points.
 *                 actionItems:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Action items or follow-ups mentioned.
 *                 generatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: When the summary was generated.
 *               example:
 *                 summary: "Discussion about AI implementation and project timeline"
 *                 highlights: ["Decided on using RAG architecture", "Timeline set for Q2"]
 *                 actionItems: ["Review documentation", "Set up meeting for next week"]
 *                 generatedAt: "2023-02-06T00:00:00.000Z"
 *       400:
 *         description: No messages to summarize.
 *       404:
 *         description: Conversation not found.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "/:id/summary",
  authenticateJWT,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const conversation = await Conversation.findOne({
        _id: req.params.id,
        user: userId,
      });

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (!conversation.messages || conversation.messages.length === 0) {
        return res
          .status(400)
          .json({ message: "No messages to summarize" });
      }

      const summaryData = await generateConversationSummary(
        conversation.messages,
      );

      conversation.summary = {
        summary: summaryData.summary,
        highlights: summaryData.highlights,
        actionItems: summaryData.actionItems,
        generatedAt: new Date(),
      };

      await conversation.save();

      res.json({
        summary: conversation.summary.summary,
        highlights: conversation.summary.highlights,
        actionItems: conversation.summary.actionItems,
        generatedAt: conversation.summary.generatedAt,
      });
    } catch (error: any) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: error.message });
    }
  },
);

export default router;
