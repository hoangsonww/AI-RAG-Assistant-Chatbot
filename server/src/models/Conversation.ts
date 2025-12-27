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
 *         sources:
 *           type: array
 *           description: Optional citations for the assistant response.
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               snippet:
 *                 type: string
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
 *         title: "Untitled Conversation"
 *         messages:
 *           - sender: user
 *             text: "Hello"
 *             timestamp: "2023-02-06T00:00:00.000Z"
 *         createdAt: "2023-02-06T00:00:00.000Z"
 *         updatedAt: "2023-02-06T00:00:00.000Z"
 */
export interface ISourceCitation {
  id: string;
  sourceId?: string;
  title?: string;
  url?: string;
  snippet: string;
  score?: number;
  sourceType?: string;
  chunkIndex?: number;
}

export interface IMessage {
  sender: "user" | "model";
  text: string;
  sources?: ISourceCitation[];
  timestamp: Date;
}

export interface IConversation extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema: Schema = new Schema(
  {
    id: { type: String, required: true },
    sourceId: { type: String },
    title: { type: String },
    url: { type: String },
    snippet: { type: String, required: true },
    score: { type: Number },
    sourceType: { type: String },
    chunkIndex: { type: Number },
  },
  { _id: false },
);

const MessageSchema: Schema = new Schema({
  sender: { type: String, enum: ["user", "model"], required: true },
  text: { type: String, required: true },
  sources: [SourceSchema],
  timestamp: { type: Date, default: Date.now },
});

const ConversationSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "Untitled Conversation" },
    messages: [MessageSchema],
  },
  { timestamps: true },
);

export default mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema,
);
