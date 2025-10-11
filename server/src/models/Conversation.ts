import mongoose, { Schema, Document } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         sender:
 *           type: string
 *           enum: [user, model]
 *           description: The sender of the message.
 *         text:
 *           type: string
 *           description: The content of the message.
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: The time when the message was sent.
 *       example:
 *         sender: user
 *         text: "Hello, how are you?"
 *         timestamp: "2023-02-06T00:00:00.000Z"
 *
 *     Conversation:
 *       type: object
 *       required:
 *         - user
 *         - messages
 *       properties:
 *         _id:
 *           type: string
 *           description: The unique identifier for the conversation.
 *         user:
 *           type: string
 *           description: The ID of the user who owns this conversation.
 *         title:
 *           type: string
 *           description: The title of the conversation.
 *         messages:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Message'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The creation time of the conversation.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The last update time of the conversation.
 *       example:
 *         _id: "603e5e534cc7d52e2c2f7c90"
 *         user: "603e5e534cc7d52e2c2f7c90"
 *         title: "New Conversation"
 *         messages:
 *           - sender: user
 *             text: "Hello"
 *             timestamp: "2023-02-06T00:00:00.000Z"
 *         createdAt: "2023-02-06T00:00:00.000Z"
 *         updatedAt: "2023-02-06T00:00:00.000Z"
 */
export interface IMessage {
  sender: "user" | "model";
  text: string;
  timestamp: Date;
}

export interface ISummary {
  summary: string;
  highlights: string[];
  actionItems: string[];
  generatedAt: Date;
}

export interface IConversation extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  summary?: ISummary;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  sender: { type: String, enum: ["user", "model"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const SummarySchema: Schema = new Schema({
  summary: { type: String, required: true },
  highlights: [{ type: String }],
  actionItems: [{ type: String }],
  generatedAt: { type: Date, default: Date.now },
});

const ConversationSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New Conversation" },
    messages: [MessageSchema],
    summary: { type: SummarySchema, required: false },
  },
  { timestamps: true },
);

export default mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema,
);
