/**
 * @fileoverview Types for conversation
 */

/**
 * Message interface
 */
export interface IMessage {
  sender: "user" | "assistant" | "model";
  text: string;
  sources?: ISourceCitation[];
  timestamp: Date;
}

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

/**
 * Conversation interface
 */
export interface IConversation {
  _id: string;
  user: string;
  title: string;
  messages: IMessage[];
  createdAt: string;
  updatedAt: string;
}
