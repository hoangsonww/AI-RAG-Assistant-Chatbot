import mongoose, { Schema, Document } from "mongoose";

export interface IGuestMessage {
  sender: "user" | "model";
  text: string;
  sources?: IGuestSourceCitation[];
  timestamp: Date;
}

export interface IGuestSourceCitation {
  id: string;
  sourceId?: string;
  title?: string;
  url?: string;
  snippet: string;
  score?: number;
  sourceType?: string;
  chunkIndex?: number;
}

export interface IGuestConversation extends Document {
  guestId: string; // a random UUID or unique string
  messages: IGuestMessage[];
  createdAt?: Date;
  updatedAt?: Date;
}

const GuestSourceSchema = new Schema<IGuestSourceCitation>(
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

const GuestMessageSchema = new Schema<IGuestMessage>(
  {
    sender: { type: String, enum: ["user", "model"], required: true },
    text: { type: String, required: true },
    sources: [GuestSourceSchema],
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const GuestConversationSchema = new Schema<IGuestConversation>(
  {
    guestId: { type: String, required: true, unique: true },
    messages: [GuestMessageSchema],
  },
  { timestamps: true },
);

const GuestConversation = mongoose.model<IGuestConversation>(
  "GuestConversation",
  GuestConversationSchema,
);

export default GuestConversation;
