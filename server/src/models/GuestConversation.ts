import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database";

export interface IGuestMessage {
  sender: "user" | "model";
  text: string;
  timestamp: Date;
}

export class GuestConversation extends Model {
  public guestId!: string;
  public messages!: IGuestMessage[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GuestConversation.init(
  {
    guestId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    messages: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: "GuestConversation",
    timestamps: true,
  }
);

export default GuestConversation;
