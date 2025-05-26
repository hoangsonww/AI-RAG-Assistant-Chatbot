import express, { Request, Response } from "express";
import GuestConversation, {
  IGuestConversation,
  IGuestMessage,
} from "../models/GuestConversation";
import { chatWithAI } from "../services/geminiService";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

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
router.post("/", async (req: Request, res: Response) => {
  try {
    const { message, guestId } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Invalid or empty message." });
    }
    let guestConversation: IGuestConversation | null = null;

    // If a guestId was provided, try to load that conversation
    if (guestId) {
      guestConversation = await GuestConversation.findOne({ guestId });
    }
    // If not found, create a new guest conversation
    if (!guestId) {
      const newGuestId = uuidv4();
      const newGuestConv = new GuestConversation({
        guestId: newGuestId,
        messages: [],
      });
      await newGuestConv.save();
      return handleGuestConversation(res, newGuestConv, message);
    } else if (!guestConversation && guestId) {
      // If a guestId was provided but no conversation was found, still create a new one but with the provided guestId
      const newGuestConv = new GuestConversation({
        guestId,
        messages: [],
      });
      await newGuestConv.save();
      return handleGuestConversation(res, newGuestConv, message);
    } else {
      // We have an existing guest conversation
      // @ts-ignore
      return handleGuestConversation(res, guestConversation, message);
    }
  } catch (error: any) {
    console.error("Error in POST /api/chat/guest:", error);
    return res.status(500).json({ message: error.message });
  }
});

async function handleGuestConversation(
  res: Response,
  guestConv: IGuestConversation,
  userMessage: string,
) {
  const history = guestConv.messages.map((m) => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
  history.push({ role: "user", parts: [{ text: userMessage }] });
  const aiResponse = await chatWithAI(history, userMessage);
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
  await guestConv.save();
  return res.json({
    answer: aiResponse,
    guestId: guestConv.guestId,
  });
}

export default router;

// Flow: A guest user sends a message with no guestId yet -> server creates a new guestId and returns it along with the AI response ->
// The client stores this guestId in localStorage -> On subsequent messages, the client sends this guestId to continue the conversation
// When user reloads or creates a new conversation, the guestId should be deleted from localStorage. The user again will send a message
// without a guestId -> server creates a new guestId and returns it along with the AI response ...
// React: Bot messages or user messages might contain links <a> so ensure we format them as well
