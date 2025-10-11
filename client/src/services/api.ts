import axios from "axios";
import { IConversation } from "../types/conversation";

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
 * Generate a summary for a conversation
 *
 * @param conversationId The conversation ID
 */
export const generateConversationSummary = async (
  conversationId: string,
): Promise<{
  summary: string;
  highlights: string[];
  actionItems: string[];
  generatedAt: string;
}> => {
  const resp = await API.post(`/conversations/${conversationId}/summary`);
  return resp.data;
};

/**
 * Get the existing summary for a conversation
 *
 * @param conversationId The conversation ID
 */
export const getConversationSummary = async (
  conversationId: string,
): Promise<{
  summary: string;
  highlights: string[];
  actionItems: string[];
  generatedAt: string;
}> => {
  const resp = await API.get(`/conversations/${conversationId}/summary`);
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
) => {
  const resp = await API.post("/chat/auth", {
    message,
    conversationId,
  });
  return resp.data; // { answer, conversationId }
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
) => {
  const payload: any = { message };
  if (guestId) payload.guestId = guestId;

  const resp = await API.post("/chat/guest", payload);
  return resp.data; // { answer, guestId }
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
