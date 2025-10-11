/**
 * @fileoverview Types for conversation
 */

/**
 * Message interface
 */
export interface IMessage {
  sender: "user" | "assistant";
  text: string;
  timestamp: Date;
}

/**
 * Summary interface
 */
export interface ISummary {
  summary: string;
  highlights: string[];
  actionItems: string[];
  generatedAt: Date;
}

/**
 * Conversation interface
 */
export interface IConversation {
  _id: string;
  user: string;
  title: string;
  messages: IMessage[];
  summary?: ISummary;
  createdAt: string;
  updatedAt: string;
}
