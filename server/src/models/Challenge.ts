import mongoose, { Schema, Document } from "mongoose";

/**
 * Short-lived WebAuthn challenge. Documents are auto-deleted by MongoDB once
 * `expiresAt` is in the past via the TTL index below.
 */
export interface IChallenge extends Document {
  challenge: string;
  type: "registration" | "authentication";
  userId?: string;
  expiresAt: Date;
}

const ChallengeSchema: Schema = new Schema({
  challenge: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["registration", "authentication"],
  },
  userId: { type: String },
  expiresAt: { type: Date, required: true },
});

// TTL: delete the doc as soon as `expiresAt` passes.
ChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IChallenge>("Challenge", ChallengeSchema);
