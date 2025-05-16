import express, { Request, Response } from "express";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import Conversation, { IMessage } from "../models/Conversation";

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
 *                 id:
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
 *                 id: "603e5e534cc7d52e2c2f7c90"
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
    const conversation = await Conversation.create({
      user: userId,
      title: "New Conversation",
      messages: [],
    });
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
 *                   id:
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
 *                   - id: "603e5e534cc7d52e2c2f7c90"
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
    const conversations = await Conversation.findAll({ where: { user: userId } });
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
 *                 id:
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
 *                 id: "603e5e534cc7d52e2c2f7c90"
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
      where: { id: req.params.id, user: userId },
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
 *                 id:
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
 *                 id: "603e5e534cc7d52e2c2f7c90"
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
    const conversation = await Conversation.findOne({
      where: { id: req.params.id, user: userId },
    });
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    conversation.title = title;
    await conversation.save();
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
 *                   id:
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
 *                   - id: "603e5e534cc7d52e2c2f7c90"
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
      const conversations = await Conversation.findAll({
        where: {
          user: userId,
          [Op.or]: [
            { title: { [Op.iLike]: `%${query}%` } },
            { messages: { [Op.contains]: [{ text: { [Op.iLike]: `%${query}%` } }] } },
          ],
        },
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
      const conversation = await Conversation.findOne({
        where: { id: req.params.id, user: userId },
      });
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      await conversation.destroy();
      res.json({ message: "Conversation deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
);

export default router;
