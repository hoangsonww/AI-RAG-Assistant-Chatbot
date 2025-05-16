import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

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

export class Conversation extends Model {
  public id!: string;
  public user!: string;
  public title!: string;
  public messages!: IMessage[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      defaultValue: "New Conversation",
    },
    messages: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: "Conversation",
    timestamps: true,
  }
);

export default Conversation;
