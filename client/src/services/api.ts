import axios from "axios";
import type {
  IConversation,
  IMessage,
  ISourceCitation,
} from "../types/conversation";

// You can adjust the baseURL if your server is different
const API = axios.create({
  baseURL: "https://ai-assistant-chatbot-server.vercel.app/api",
});

// --- Token Handling ---

/**
 * Store the token in local storage
 *
 * @param token - The token to store
 */
export const setTokenInLocalStorage = (token: string) => {
  localStorage.setItem("token", token);
};

/**
 * Retrieve the token from local storage
 */
export const getTokenFromLocalStorage = (): string | null => {
  return localStorage.getItem("token");
};

/**
 * Clear the token from local storage
 */
export const isAuthenticated = (): boolean => {
  return !!getTokenFromLocalStorage();
};

// Attach token if available to all requests
API.interceptors.request.use((config) => {
  const token = getTokenFromLocalStorage();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// For guest users, store or retrieve the guestId
const GUEST_KEY = "guestConversationId";
const GUEST_MESSAGES_KEY = "guestMessages";
const GUEST_CONVERSATIONS_KEY = "guestConversations";
const GUEST_SELECTED_CONVERSATION_KEY = "guestSelectedConversationId";

/**
 * Store the guestId in local storage
 *
 * @param guestId - The guestId to store
 */
export const setGuestIdInLocalStorage = (guestId: string) => {
  localStorage.setItem(GUEST_KEY, guestId);
};

/**
 * Retrieve the guestId from local storage
 */
export const getGuestIdFromLocalStorage = (): string | null => {
  return localStorage.getItem(GUEST_KEY);
};

/**
 * Clear the guestId from local storage
 */
export const clearGuestIdFromLocalStorage = (): void => {
  localStorage.removeItem(GUEST_KEY);
};

/**
 * Store guest messages in local storage
 *
 * @param messages - The messages to store
 */
export const setGuestMessagesInLocalStorage = (messages: any[]) => {
  localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(messages));
};

/**
 * Retrieve guest messages from local storage
 */
export const getGuestMessagesFromLocalStorage = (): any[] | null => {
  const data = localStorage.getItem(GUEST_MESSAGES_KEY);
  return data ? JSON.parse(data) : null;
};

/**
 * Clear guest messages from local storage
 */
export const clearGuestMessagesFromLocalStorage = (): void => {
  localStorage.removeItem(GUEST_MESSAGES_KEY);
};

export type GuestConversation = IConversation & { guestId?: string };

const createGuestConversationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `guest-${crypto.randomUUID()}`;
  }
  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getNowIso = () => new Date().toISOString();

export const deriveGuestConversationTitle = (messages: IMessage[]): string => {
  const firstUserMessage = messages.find(
    (message) => message.sender === "user" && message.text.trim(),
  );
  const baseTitle = firstUserMessage?.text.trim() || "New Conversation";
  if (baseTitle.length <= 48) {
    return baseTitle;
  }
  return `${baseTitle.slice(0, 48).trim()}...`;
};

const normalizeGuestConversation = (
  conversation: Partial<GuestConversation> & { _id: string },
): GuestConversation => {
  const now = getNowIso();
  return {
    _id: conversation._id,
    user: conversation.user || "guest",
    title: conversation.title || "New Conversation",
    messages: Array.isArray(conversation.messages) ? conversation.messages : [],
    createdAt: conversation.createdAt || now,
    updatedAt: conversation.updatedAt || now,
    guestId: conversation.guestId,
  };
};

const sortGuestConversations = (conversations: GuestConversation[]) => {
  return [...conversations].sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || "");
    const bTime = Date.parse(b.updatedAt || "");
    return (
      (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
    );
  });
};

const setGuestConversationsInLocalStorage = (
  conversations: GuestConversation[],
) => {
  const normalized = conversations.map((conversation) =>
    normalizeGuestConversation(conversation),
  );
  localStorage.setItem(
    GUEST_CONVERSATIONS_KEY,
    JSON.stringify(sortGuestConversations(normalized)),
  );
};

export const getGuestConversationsFromLocalStorage =
  (): GuestConversation[] => {
    const raw = localStorage.getItem(GUEST_CONVERSATIONS_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return sortGuestConversations(
        parsed.map((conversation) => normalizeGuestConversation(conversation)),
      );
    } catch (error) {
      console.error("Failed to parse guest conversations:", error);
      return [];
    }
  };

export const getGuestConversationByIdFromLocalStorage = (
  conversationId: string,
): GuestConversation | null => {
  const conversations = getGuestConversationsFromLocalStorage();
  return conversations.find((conv) => conv._id === conversationId) || null;
};

export const getSelectedGuestConversationId = (): string | null => {
  return localStorage.getItem(GUEST_SELECTED_CONVERSATION_KEY);
};

export const setSelectedGuestConversationId = (
  conversationId: string | null,
): void => {
  if (conversationId) {
    localStorage.setItem(GUEST_SELECTED_CONVERSATION_KEY, conversationId);
  } else {
    localStorage.removeItem(GUEST_SELECTED_CONVERSATION_KEY);
  }
};

export const createGuestConversationInLocalStorage = (): GuestConversation => {
  const now = getNowIso();
  const conversation = normalizeGuestConversation({
    _id: createGuestConversationId(),
    title: "New Conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  });

  const conversations = getGuestConversationsFromLocalStorage();
  setGuestConversationsInLocalStorage([conversation, ...conversations]);
  setSelectedGuestConversationId(conversation._id);
  return conversation;
};

export const upsertGuestConversationInLocalStorage = (
  conversation: Partial<GuestConversation> & { _id: string },
): GuestConversation => {
  const conversations = getGuestConversationsFromLocalStorage();
  const now = getNowIso();
  const existingIndex = conversations.findIndex(
    (conv) => conv._id === conversation._id,
  );

  if (existingIndex >= 0) {
    const updated = normalizeGuestConversation({
      ...conversations[existingIndex],
      ...conversation,
      updatedAt: now,
    });
    const next = [...conversations];
    next[existingIndex] = updated;
    setGuestConversationsInLocalStorage(next);
    return updated;
  }

  const created = normalizeGuestConversation({
    ...conversation,
    createdAt: now,
    updatedAt: now,
  });
  setGuestConversationsInLocalStorage([created, ...conversations]);
  return created;
};

export const updateGuestConversationInLocalStorage = (
  conversationId: string,
  updates: Partial<GuestConversation>,
): GuestConversation | null => {
  const conversations = getGuestConversationsFromLocalStorage();
  const existingIndex = conversations.findIndex(
    (conv) => conv._id === conversationId,
  );
  if (existingIndex < 0) {
    return null;
  }

  const updated = normalizeGuestConversation({
    ...conversations[existingIndex],
    ...updates,
    updatedAt: getNowIso(),
  });
  const next = [...conversations];
  next[existingIndex] = updated;
  setGuestConversationsInLocalStorage(next);
  return updated;
};

export const deleteGuestConversationFromLocalStorage = (
  conversationId: string,
): void => {
  const conversations = getGuestConversationsFromLocalStorage();
  const next = conversations.filter((conv) => conv._id !== conversationId);
  setGuestConversationsInLocalStorage(next);

  if (getSelectedGuestConversationId() === conversationId) {
    setSelectedGuestConversationId(next[0]?._id || null);
  }
};

export const clearGuestConversationIdsFromLocalStorage = (): void => {
  const conversations = getGuestConversationsFromLocalStorage();
  if (conversations.length === 0) return;
  const cleared = conversations.map((conversation) => ({
    ...conversation,
    guestId: undefined,
  }));
  setGuestConversationsInLocalStorage(cleared);
};

// --- Auth Endpoints ---

/**
 * Sign up a new user
 *
 * @param email The user's email
 * @param password The user's password
 */
export const signupUser = async (
  email: string,
  password: string,
): Promise<void> => {
  const resp = await API.post("/auth/signup", { email, password });
  return resp.data;
};

/**
 * Log in a user
 *
 * @param email The user's email
 * @param password The user's password
 */
export const loginUser = async (
  email: string,
  password: string,
): Promise<string> => {
  const resp = await API.post("/auth/login", { email, password });
  return resp.data.token;
};

// --- Conversation Endpoints (for authenticated usage) ---

/**
 * Get all conversations
 */
export const getConversations = async (): Promise<IConversation[]> => {
  const resp = await API.get("/conversations");
  return resp.data;
};

/**
 * Get a conversation by ID
 *
 * @param id The conversation ID
 */
export const getConversationById = async (
  id: string,
): Promise<IConversation> => {
  const resp = await API.get(`/conversations/${id}`);
  return resp.data;
};

/**
 * Create a new conversation
 */
export const createNewConversation = async (): Promise<IConversation> => {
  const resp = await API.post("/conversations");
  return resp.data;
};

/**
 * Rename a conversation
 *
 * @param id The conversation ID
 * @param title The new title
 */
export const renameConversation = async (
  id: string,
  title: string,
): Promise<IConversation> => {
  const resp = await API.put(`/conversations/${id}`, { title });
  return resp.data;
};

/**
 * Search conversations
 *
 * @param query The search query
 */
export const searchConversations = async (
  query: string,
): Promise<IConversation[]> => {
  const resp = await API.get(`/conversations/search/${query}`);
  return resp.data;
};

/**
 * Verify if an email exists
 *
 * @param email The email to verify
 */
export const verifyEmail = async (
  email: string,
): Promise<{ exists: boolean }> => {
  const response = await API.get(
    `/auth/verify-email?email=${encodeURIComponent(email)}`,
  );
  return response.data;
};

/**
 * Reset a user's password
 *
 * @param email The user's email
 * @param newPassword The new password
 */
export const resetPassword = async (
  email: string,
  newPassword: string,
): Promise<{ message: string }> => {
  const response = await API.post("/auth/reset-password", {
    email,
    newPassword,
  });
  return response.data;
};

/**
 * Delete a conversation
 *
 * @param id The conversation ID
 */
export const deleteConversation = async (id: string): Promise<void> => {
  const resp = await API.delete(`/conversations/${id}`);
  return resp.data;
};

/**
 * Generate a conversation title using AI
 *
 * @param id The conversation ID
 */
export const generateConversationTitle = async (
  id: string,
): Promise<{ title: string }> => {
  const resp = await API.post(`/conversations/${id}/generate-title`);
  return resp.data;
};

/**
 * Generate a guest conversation title using AI
 *
 * @param messages The conversation messages
 * @param guestId Optional guestId to load stored messages
 */
export const generateGuestConversationTitle = async (
  messages: IMessage[],
  guestId?: string | null,
): Promise<{ title: string }> => {
  const payload: {
    messages?: Array<{ sender: string; text: string }>;
    guestId?: string;
  } = {};

  if (Array.isArray(messages)) {
    payload.messages = messages.map((message) => ({
      sender: message.sender,
      text: message.text,
    }));
  }

  if (guestId) {
    payload.guestId = guestId;
  }

  const resp = await API.post("/chat/guest/generate-title", payload);
  return resp.data;
};

// --- Chat Endpoints ---

/**
 * Authenticated user chat:
 * POST /chat/auth
 * Expects { message, conversationId? }
 * Returns { answer, conversationId }
 *
 * @param message The chat message
 * @param conversationId The conversation ID
 */
export const sendAuthedChatMessage = async (
  message: string,
  conversationId: string | null,
): Promise<{
  answer: string;
  sources: ISourceCitation[];
  conversationId: string;
}> => {
  const resp = await API.post("/chat/auth", {
    message,
    conversationId,
  });
  return resp.data; // { answer, sources, conversationId }
};

/**
 * Guest user chat (unauth):
 * POST /chat/guest
 * Expects { message, guestId? }
 * Returns { answer, guestId }
 *
 * @param message The chat message
 * @param guestId The guest ID
 */
export const sendGuestChatMessage = async (
  message: string,
  guestId: string | null,
): Promise<{ answer: string; sources: ISourceCitation[]; guestId: string }> => {
  const payload: any = { message };
  if (guestId) payload.guestId = guestId;

  const resp = await API.post("/chat/guest", payload);
  return resp.data; // { answer, sources, guestId }
};

/**
 * Validates the user's authentication token with retries.
 * Calls the backend `/api/auth/validate-token` to check if the token is still valid.
 *
 * @param retries - Number of retry attempts (default: 3).
 * @returns `true` if the token is valid, `false` otherwise.
 */
export const validateToken = async (retries: number = 3): Promise<boolean> => {
  const token = getTokenFromLocalStorage();

  if (!token) return false; // Immediately exit if no token

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await API.get("/auth/validate-token", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 200 && res.data.valid) {
        return true; // Token is valid, no need to retry
      }

      console.warn(
        `Token validation failed (Attempt ${attempt}/${retries}):`,
        res.data,
      );
    } catch (error: any) {
      console.error(
        `Error validating token (Attempt ${attempt}/${retries}):`,
        error.message,
      );
    }

    // Wait before retrying (only if not last attempt)
    if (attempt < retries) await delay(200 * attempt);
  }

  // If all retries failed, remove the token
  console.warn("All token validation attempts failed. Removing token.");
  localStorage.removeItem("token");
  return false;
};

/**
 * Helper function to handle SSE streaming with retries
 */
async function streamWithRetries(
  url: string,
  body: any,
  onChunk: (chunk: string) => void,
  onSources: (sources: ISourceCitation[]) => void,
  onComplete: (conversationId?: string, guestId?: string) => void,
  onError: (error: Error) => void,
  maxRetries: number = 3,
): Promise<void> {
  let retryCount = 0;
  const token = getTokenFromLocalStorage();

  const attemptStream = async (): Promise<void> => {
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API.defaults.baseURL}${url}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let conversationId: string | undefined;
      let guestId: string | undefined;
      let buffer = ""; // Buffer for incomplete lines

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "chunk") {
                onChunk(data.text);
              } else if (data.type === "sources") {
                onSources(Array.isArray(data.sources) ? data.sources : []);
              } else if (data.type === "conversationId") {
                conversationId = data.conversationId;
              } else if (data.type === "guestId") {
                guestId = data.guestId;
              } else if (data.type === "done") {
                onComplete(conversationId, guestId);
                return;
              } else if (data.type === "error") {
                onError(new Error(data.message || "Streaming error"));
                return;
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", line, e);
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim() && buffer.startsWith("data: ")) {
        try {
          const data = JSON.parse(buffer.slice(6));
          if (data.type === "chunk") {
            onChunk(data.text);
          } else if (data.type === "sources") {
            onSources(Array.isArray(data.sources) ? data.sources : []);
          } else if (data.type === "error") {
            onError(new Error(data.message || "Streaming error"));
            return;
          } else if (data.type === "done") {
            onComplete(conversationId, guestId);
            return;
          }
        } catch (e) {
          console.warn("Failed to parse final SSE data:", buffer, e);
        }
      }
    } catch (error: any) {
      console.error(`Stream attempt ${retryCount + 1} failed:`, error);

      if (retryCount < maxRetries - 1) {
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return attemptStream();
      } else {
        onError(error);
      }
    }
  };

  return attemptStream();
}

/**
 * Stream authenticated user chat with retry logic
 * @param message The chat message
 * @param conversationId The conversation ID
 * @param onChunk Callback for each chunk
 * @param onComplete Callback when complete
 * @param onError Callback on error
 */
export const streamAuthedChatMessage = async (
  message: string,
  conversationId: string | null,
  onChunk: (chunk: string) => void,
  onSources: (sources: ISourceCitation[]) => void,
  onComplete: (conversationId: string) => void,
  onError: (error: Error) => void,
) => {
  return streamWithRetries(
    "/chat/auth/stream",
    { message, conversationId },
    onChunk,
    onSources,
    (convId) => onComplete(convId!),
    onError,
  );
};

/**
 * Stream guest user chat with retry logic
 * @param message The chat message
 * @param guestId The guest ID
 * @param onChunk Callback for each chunk
 * @param onComplete Callback when complete
 * @param onError Callback on error
 */
export const streamGuestChatMessage = async (
  message: string,
  guestId: string | null,
  onChunk: (chunk: string) => void,
  onSources: (sources: ISourceCitation[]) => void,
  onComplete: (guestId: string) => void,
  onError: (error: Error) => void,
) => {
  const payload: any = { message };
  if (guestId) payload.guestId = guestId;

  return streamWithRetries(
    "/chat/guest/stream",
    payload,
    onChunk,
    onSources,
    (_, gId) => onComplete(gId!),
    onError,
  );
};
