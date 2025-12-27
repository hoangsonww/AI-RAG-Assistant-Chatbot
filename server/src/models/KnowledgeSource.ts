import mongoose, { Schema, Document } from "mongoose";

export type KnowledgeSourceType =
  | "resume"
  | "note"
  | "link"
  | "project"
  | "bio"
  | "other";

export interface IKnowledgeSource extends Document {
  user?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  tags?: string[];
  externalId?: string;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeSourceSchema = new Schema<IKnowledgeSource>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    content: { type: String, required: true },
    sourceType: {
      type: String,
      enum: ["resume", "note", "link", "project", "bio", "other"],
      default: "note",
    },
    sourceUrl: { type: String },
    tags: [{ type: String }],
    externalId: { type: String },
    chunkCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

KnowledgeSourceSchema.index({ externalId: 1 }, { unique: true, sparse: true });

export default mongoose.model<IKnowledgeSource>(
  "KnowledgeSource",
  KnowledgeSourceSchema,
);
