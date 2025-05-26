import { v4 as uuidv4 } from "uuid";

/**
 * Ephemeral conversation store for temporary conversations.
 * This is a simple in-memory store, which will be reset when the server restarts.
 * It is not suitable for production use.
 */
export const ephemeralStore: Record<string, any[]> = {};

export function createEphemeralConversation(): string {
  const newId = uuidv4();
  ephemeralStore[newId] = [];
  return newId;
}
