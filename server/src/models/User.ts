import mongoose, { Schema, Document } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     PasskeyCredential:
 *       type: object
 *       properties:
 *         credentialID:
 *           type: string
 *           description: Base64url-encoded credential ID.
 *         publicKey:
 *           type: string
 *           description: Base64url-encoded COSE public key.
 *         counter:
 *           type: number
 *         transports:
 *           type: array
 *           items:
 *             type: string
 *         deviceType:
 *           type: string
 *         backedUp:
 *           type: boolean
 *         nickname:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         lastUsedAt:
 *           type: string
 *           format: date-time
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the user.
 *         email:
 *           type: string
 *           description: The user's email address.
 *         password:
 *           type: string
 *           description: The user's hashed password.
 *         credentials:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PasskeyCredential'
 *       example:
 *         email: user@example.com
 *         password: yourpassword
 */
export interface IPasskeyCredential {
  credentialID: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
  nickname?: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface IUser extends Document {
  email: string;
  password: string;
  credentials: IPasskeyCredential[];
}

const PasskeyCredentialSchema = new Schema<IPasskeyCredential>(
  {
    credentialID: { type: String, required: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: { type: String },
    backedUp: { type: Boolean },
    nickname: { type: String },
    createdAt: { type: Date, default: () => new Date() },
    lastUsedAt: { type: Date },
  },
  { _id: false },
);

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  credentials: { type: [PasskeyCredentialSchema], default: [] },
});

UserSchema.index({ "credentials.credentialID": 1 });

export default mongoose.model<IUser>("User", UserSchema);
