import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Conversation, { IMessage } from "../models/Conversation";
import { chatWithAI, streamChatWithAI } from "../services/geminiService";

const router = express.Router();

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
router.post("/", async (req: Request, res: Response) => {
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
    let userId: string | null = null;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        id?: string;
      };
      if (decoded && decoded.id) {
        userId = decoded.id;
      } else {
        return res.status(401).json({ message: "Invalid token payload" });
      }
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    let conversation = null;
    let history: any[] = [];

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        user: userId,
      });

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      history = conversation.messages.map((msg: IMessage) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));
    } else {
      conversation = new Conversation({ user: userId, messages: [] });
      await conversation.save();
    }

    const aiResponse = await chatWithAI(history, message);
    conversation.messages.push({
      sender: "user",
      text: message,
      timestamp: new Date(),
    });
    conversation.messages.push({
      sender: "model",
      text: aiResponse.text,
      sources: aiResponse.sources,
      timestamp: new Date(),
    });

    await conversation.save();

    return res.json({
      answer: aiResponse.text,
      sources: aiResponse.sources,
      conversationId: conversation._id,
    });
  } catch (error: any) {
    console.error("Error in POST /api/chat/auth:", error);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/chat/auth/stream:
 *   post:
 *     summary: Stream chat responses from the AI assistant for authenticated users.
 *     description: >
 *       Streams a chat response from the AI assistant using Server-Sent Events.
 *       Requires a valid JWT in the Authorization header.
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
 *         description: Streamed AI response
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/stream", async (req: Request, res: Response) => {
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
    let userId: string | null = null;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        id?: string;
      };
      if (decoded && decoded.id) {
        userId = decoded.id;
      } else {
        return res.status(401).json({ message: "Invalid token payload" });
      }
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    let conversation = null;
    let history: any[] = [];

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        user: userId,
      });

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      history = conversation.messages.map((msg: IMessage) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));
    } else {
      conversation = new Conversation({ user: userId, messages: [] });
      await conversation.save();
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    res.write(
      `data: ${JSON.stringify({ type: "conversationId", conversationId: conversation._id })}\n\n`,
    );

    let fullResponse = "";
    let sources = [];
    try {
      const result = await streamChatWithAI(
        history,
        message,
        (chunk: string) => {
          res.write(
            `data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`,
          );
        },
      );
      fullResponse = result.text;
      sources = result.sources;

      conversation.messages.push({
        sender: "user",
        text: message,
        timestamp: new Date(),
      });
      conversation.messages.push({
        sender: "model",
        text: fullResponse,
        sources,
        timestamp: new Date(),
      });

      await conversation.save();
      res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Error streaming message:", error);
      res.write(
        `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
      );
      res.end();
    }
  } catch (error: any) {
    console.error("Error in POST /api/chat/auth/stream:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: error.message });
    }
  }
});

export default router;
