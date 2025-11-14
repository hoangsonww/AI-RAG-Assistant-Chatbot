import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
  Box,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  useTheme,
  Link as MuiLink,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
  getConversationById,
  sendAuthedChatMessage,
  sendGuestChatMessage,
  streamAuthedChatMessage,
  streamGuestChatMessage,
  createNewConversation,
  isAuthenticated,
  getGuestIdFromLocalStorage,
  setGuestIdInLocalStorage,
  clearGuestIdFromLocalStorage,
  getGuestMessagesFromLocalStorage,
  setGuestMessagesInLocalStorage,
  clearGuestMessagesFromLocalStorage,
} from "../services/api";
import { IMessage, IConversation } from "../types/conversation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { motion, AnimatePresence } from "framer-motion";
import CopyIcon from "./CopyIcon";

/**
 * Props:
 *  - conversationId (string | null): If authenticated and you have a known conversation _id, pass it in.
 *  - onNewConversation (function): Called if you create a brand new conversation for an authenticated user.
 */
interface ChatAreaProps {
  conversationId: string | null; // For authenticated only
  onNewConversation?: (conv: IConversation) => void;
}

/**
 * A helper function that detects plain-text URLs (like "movieverse.com" or "https://xyz")
 * and turns them into Markdown links so that ReactMarkdown will render them as clickable <a> elements.
 *
 * @param text (string): The text to process.
 * @returns (string): The processed text with URLs turned into Markdown links.
 */
function linkifyText(text: string): string {
  // First, protect existing Markdown links by temporarily replacing them
  const markdownLinks: string[] = [];
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  // Store existing Markdown links and replace with placeholders
  let protectedText = text.replace(markdownLinkRegex, (match) => {
    markdownLinks.push(match);
    return `__MARKDOWN_LINK_${markdownLinks.length - 1}__`;
  });

  // Regex that detects plain URLs not already in Markdown format
  const urlRegex =
    /((?:https?:\/\/)?(?:[\w-]+\.)+[a-zA-Z]{2,}(?:\/[\w.,@?^=%&:/~+#-]*)?)/g;

  // Convert plain URLs to Markdown links
  protectedText = protectedText.replace(urlRegex, (match) => {
    // If it doesn't start with "http", prepend "https://"
    const hasProtocol =
      match.startsWith("http://") || match.startsWith("https://");
    const link = hasProtocol ? match : `https://${match}`;
    return `[${match}](${link})`;
  });

  // Restore the original Markdown links
  protectedText = protectedText.replace(
    /__MARKDOWN_LINK_(\d+)__/g,
    (match, index) => {
      return markdownLinks[parseInt(index)];
    },
  );

  return protectedText;
}

// Default avatar URLs (in public folder)
const BOT_AVATAR = "/bot.jpg";
const USER_AVATAR = "/OIP5.png";

/**
 * Props for CitationBubble.
 */
interface CitationBubbleProps {
  isAboutMe: boolean;
}

/**
 * A small component to display the citation bubble.
 *
 * Uses framer-motion for appear/disappear animations.
 */
const CitationBubble: React.FC<CitationBubbleProps> = ({ isAboutMe }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      sx={{ position: "absolute", bottom: "5px", right: "5px", zIndex: 10000 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The "?" icon */}
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "#ffd54f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          "&:hover": { backgroundColor: "#ffca28" },
        }}
      >
        <HelpOutlineIcon sx={{ fontSize: 16, color: "#000" }} />
      </Box>
      {/* AnimatePresence for the bubble on hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "absolute",
              bottom: "100%",
              right: 0,
              marginBottom: "8px",
              backgroundColor: "#ffd54f",
              color: "#000",
              borderRadius: "8px",
              padding: "0.4rem 0.6rem",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              zIndex: 10001,
            }}
          >
            {isAboutMe ? (
              <Typography sx={{ color: "inherit" }}>
                Source:{" "}
                <MuiLink
                  href="https://sonnguyenhoang.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: "inherit",
                    textDecoration: "underline",
                    transition: "color 0.3s",
                    "&:hover": { color: "#1976d2" },
                  }}
                >
                  Son (David) Nguyen's Website
                </MuiLink>
              </Typography>
            ) : (
              <Typography sx={{ color: "inherit" }}>
                Source: General AI Knowledge
              </Typography>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

function isMessageAboutMe(text: string): boolean {
  const lower = text.toLowerCase();
  const pattern = /(?=.*\bnguyen\b)(?=.*\b(?:david|son)\b)/;
  return pattern.test(lower);
}

/**
 * The main chat area component that displays messages and handles user input.
 *
 * @param conversationId (string | null): If authenticated and you have a known conversation _id, pass it in.
 * @param onNewConversation (function): Called if you create a brand new conversation for an authenticated user.
 * @constructor The main chat area component.
 */
const ChatArea: React.FC<ChatAreaProps> = ({
  conversationId,
  onNewConversation,
}) => {
  const theme = useTheme();

  // Load guest messages from localStorage on initial mount (before clearing anything)
  const initialMessages = !isAuthenticated()
    ? getGuestMessagesFromLocalStorage() || []
    : [];

  // The messages to render
  const [messages, setMessages] = useState<IMessage[]>(initialMessages);

  // The user's current input
  const [input, setInput] = useState("");

  // Keep track of the user's past messages (only the text).
  const [messageHistory, setMessageHistory] = useState<string[]>([]);

  // Current position in messageHistory; -1 => we're not in history mode
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Store the user's in-progress text when they jump into history mode
  const [tempInput, setTempInput] = useState("");

  // Loading states
  const [loadingState, setLoadingState] = useState<
    "idle" | "processing" | "thinking" | "streaming" | "error" | "done"
  >("idle");
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // State to control auto-scrolling. We'll only auto-scroll if the user is already near the bottom.
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Clear guestConversationId on page reload (but keep messages for persistence)
  useEffect(() => {
    const [navEntry] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    if (navEntry && navEntry.type === "reload") {
      localStorage.removeItem("guestConversationId");
    }
    // Fallback for older browsers:
    if (performance.navigation.type === 1) {
      localStorage.removeItem("guestConversationId");
    }
  }, []);

  // If we have an authenticated conversationId, load it from the server
  useEffect(() => {
    if (conversationId && isAuthenticated()) {
      loadConversation(conversationId);
    } else if (isAuthenticated()) {
      setMessages([]);
    }
  }, [conversationId]);

  // Save guest messages to localStorage whenever they change
  useEffect(() => {
    if (!isAuthenticated() && messages.length > 0) {
      setGuestMessagesInLocalStorage(messages);
    }
  }, [messages]);

  /**
   * Load a conversation by its ID.
   *
   * @param id The conversation ID to load.
   */
  const loadConversation = async (id: string) => {
    try {
      setLoadingConversation(true);
      const conv = await getConversationById(id);
      setMessages(conv.messages);
      console.log("Loaded conversation:", conv);
    } catch (err) {
      console.error("Error loading conversation:", err);
    } finally {
      setLoadingConversation(false);
    }
  };

  const loadConversationAux = async (id: string) => {
    try {
      const conv = await getConversationById(id);
      setMessages(conv.messages);
      console.log("Loaded conversation:", conv);
    } catch (err) {
      console.error("Error loading conversation:", err);
    }
  };

  /**
   * Send the user's message to the server and receive a streaming response.
   */
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    if (loadingState !== "idle" && loadingState !== "done") return;

    let currentConvId = conversationId;

    try {
      // Create new conversation if needed for authenticated users.
      if (isAuthenticated() && !currentConvId) {
        const newConv = await createNewConversation();
        currentConvId = newConv._id;
        if (onNewConversation) onNewConversation(newConv);
      }

      // Prepare and immediately add the user message locally.
      const userMessage: IMessage = {
        sender: "user",
        text: input,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setMessageHistory((prev) => [...prev, input]);
      setHistoryIndex(-1);
      setTempInput("");
      setInput("");

      // Update state: processing immediately.
      setLoadingState("processing");
      setIsStreaming(false);

      // Schedule state transitions:
      setTimeout(() => {
        setLoadingState("thinking");
      }, 300);

      setTimeout(() => {
        setLoadingState("streaming");
        setIsStreaming(true);
      }, 600);

      // Handle streaming response
      const handleChunk = (chunk: string) => {
        // When first chunk arrives, immediately show it (hide loading spinners)
        setLoadingState("done");
        setIsStreaming(true);

        // Update the LAST message in the messages array (the bot's streaming message)
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.sender === "assistant") {
            // Append chunk to existing bot message
            lastMsg.text += chunk;
          } else {
            // Create the bot message on first chunk if it doesn't exist
            newMessages.push({
              sender: "assistant",
              text: chunk,
              timestamp: new Date(),
            });
          }
          return newMessages;
        });
      };

      const handleComplete = (id: string) => {
        setIsStreaming(false);
        setLoadingState("done");
      };

      const handleError = (error: Error) => {
        console.error("Streaming error:", error);
        setIsStreaming(false);
        setLoadingState("error");

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: "Sorry, I encountered an error while streaming the response. Please try again.",
            timestamp: new Date(),
          },
        ]);

        setTimeout(() => setLoadingState("done"), 2000);
      };

      // Don't add empty bot message - it will be created on first chunk

      if (isAuthenticated()) {
        await streamAuthedChatMessage(
          userMessage.text,
          currentConvId!,
          handleChunk,
          handleComplete,
          handleError,
        );
      } else {
        const guestId = getGuestIdFromLocalStorage();
        await streamGuestChatMessage(
          userMessage.text,
          guestId,
          handleChunk,
          (newGuestId: string) => {
            if (!guestId) {
              setGuestIdInLocalStorage(newGuestId);
            }
            handleComplete(newGuestId);
          },
          handleError,
        );
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
      setLoadingState("done");
    }
  };

  /**
   * Handle keyboard events for history navigation.
   *
   * @param e The keyboard event.
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowUp") {
      if (messageHistory.length === 0) return; // no history to show
      e.preventDefault();
      // If not currently in history, store the current input into tempInput
      if (historyIndex === -1) {
        setTempInput(input);
        setHistoryIndex(messageHistory.length - 1);
        setInput(messageHistory[messageHistory.length - 1]);
      } else {
        // Move up the history if possible
        const newIndex = Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(messageHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      if (historyIndex === -1) return; // not in history, do nothing
      e.preventDefault();
      // Move down in history
      const newIndex = historyIndex + 1;
      // If we surpass the last history entry, restore tempInput
      if (newIndex > messageHistory.length - 1) {
        setHistoryIndex(-1);
        setInput(tempInput);
      } else {
        setHistoryIndex(newIndex);
        setInput(messageHistory[newIndex]);
      }
    } else if (e.key === "Enter") {
      // Preserve the existing Enter logic
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Handle copying text to clipboard.
   *
   * @param text The text to copy.
   */
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // Auto-scroll to bottom only if the user is already near the bottom.
  useEffect(() => {
    if (scrollRef.current && isAtBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAtBottom]);

  // Create a ref for the dummy element at the end of your messages list:
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the dummy element whenever messages update:
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  /**
   * Handle starting a new conversation for a guest user.
   */
  const handleNewGuestConversation = () => {
    clearGuestIdFromLocalStorage();
    clearGuestMessagesFromLocalStorage();
    setMessages([]);
    setMessageHistory([]);
    setHistoryIndex(-1);
    setTempInput("");
  };

  /**
   * A simple component that displays an animated ellipsis.
   *
   * @constructor The animated ellipsis component.
   */
  const AnimatedEllipsis: React.FC = () => {
    const [dotCount, setDotCount] = useState(0);
    useEffect(() => {
      const interval = setInterval(() => {
        setDotCount((prev) => (prev + 1) % 4);
      }, 500);
      return () => clearInterval(interval);
    }, []);
    return <span>{".".repeat(dotCount)}</span>;
  };

  // Link stylings for user vs. assistant messages:
  const userLinkSx = {
    color: "#fff",
    textDecoration: "underline",
    "&:hover": {
      color: "#ddd",
      textDecoration: "underline",
    },
  };

  const assistantLinkSx = {
    color: theme.palette.mode === "dark" ? "white" : "black",
    textDecoration: "underline",
    "&:hover": {
      color: theme.palette.primary.main,
      textDecoration: "underline",
    },
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      sx={{ overflowX: "hidden" }}
    >
      {/* Main chat area - displays messages */}
      <Box
        flex="1"
        overflow="auto"
        padding="1rem"
        ref={scrollRef}
        bgcolor={theme.palette.background.default}
        sx={{ transition: "background-color 0.3s ease", overflowX: "hidden" }}
        onScroll={() => {
          if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            // Determine if user is within 50px of the bottom
            setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
          }
        }}
      >
        {/* If no messages yet, show placeholder */}
        {messages.length === 0 &&
        !loadingConversation &&
        loadingState !== "streaming" &&
        loadingState !== "thinking" &&
        loadingState !== "processing" ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <ChatBubbleOutlineIcon
              sx={{ fontSize: 80, color: theme.palette.text.secondary, mb: 2 }}
            />
            <Typography variant="h6" align="center" color="textSecondary">
              Hello! 👋 I'm Lumina - David Nguyen's personal assistant. Send me
              a message to get started! 🚀
            </Typography>
          </Box>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isUser = msg.sender === "user";
              const isBot = !isUser;
              return (
                <Box
                  key={idx}
                  sx={{
                    width: "100%",
                    maxWidth: "100%",
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    mb: 1,
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: "flex",
                      flexDirection: isUser ? "row-reverse" : "row",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      mx={1}
                    >
                      <img
                        src={isUser ? USER_AVATAR : BOT_AVATAR}
                        alt="avatar"
                        style={{
                          borderRadius: "50%",
                          width: "40px",
                          height: "40px",
                          marginBottom: "4px",
                          transition: "transform 0.3s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLImageElement
                          ).style.transform = "scale(1.1)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLImageElement
                          ).style.transform = "scale(1.0)";
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.7rem",
                          opacity: 0.8,
                          transition: "color 0.3s",
                          color:
                            theme.palette.mode === "dark" ? "white" : "black",
                          "&:hover": { color: theme.palette.primary.main },
                        }}
                      >
                        {isUser ? "You" : "Lumina"}
                      </Typography>
                    </Box>
                    <Box
                      borderRadius="8px"
                      p="0.5rem 1rem"
                      bgcolor={
                        isUser
                          ? "#1976d2"
                          : theme.palette.mode === "dark"
                            ? theme.palette.grey[800]
                            : "#e0e0e0"
                      }
                      color={isUser ? "white" : theme.palette.text.primary}
                      maxWidth="60%"
                      boxShadow={1}
                      sx={{
                        transition: "background-color 0.3s",
                        wordBreak: "break-word",
                        maxWidth: "75%",
                        overflow: "visible",
                        "&:hover": {
                          backgroundColor: isUser
                            ? theme.palette.primary.dark
                            : theme.palette.mode === "dark"
                              ? theme.palette.grey[700]
                              : "#d5d5d5",
                        },
                        paddingTop: "1.1rem",
                        position: "relative",
                      }}
                    >
                      {/* Copy icon for bot messages */}
                      {isBot && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: 5,
                            right: 5,
                            zIndex: 2,
                          }}
                        >
                          <motion.div
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {msg.text.length > 100 ? (
                              <CopyIcon text={msg.text} />
                            ) : null}
                          </motion.div>
                        </Box>
                      )}
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          h1: ({ node, children, ...props }) => (
                            <Box
                              component="h1"
                              sx={{
                                fontSize: "2rem",
                                margin: "1rem 0",
                                fontWeight: "bold",
                                borderBottom: "2px solid #eee",
                                paddingBottom: "0.5rem",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                          h2: ({ node, children, ...props }) => (
                            <Box
                              component="h2"
                              sx={{
                                fontSize: "1.75rem",
                                margin: "1rem 0",
                                fontWeight: "bold",
                                borderBottom: "1px solid #eee",
                                paddingBottom: "0.5rem",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                          h3: ({ node, children, ...props }) => (
                            <Box
                              component="h3"
                              sx={{
                                fontSize: "1.5rem",
                                margin: "1rem 0",
                                fontWeight: "bold",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                          h4: ({ node, children, ...props }) => (
                            <Box
                              component="h4"
                              sx={{
                                fontSize: "1.25rem",
                                margin: "1rem 0",
                                fontWeight: "bold",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                          h5: ({ node, children, ...props }) => (
                            <Box
                              component="h5"
                              sx={{
                                fontSize: "1rem",
                                margin: "1rem 0",
                                fontWeight: "bold",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                          h6: ({ node, children, ...props }) => (
                            <Box
                              component="h6"
                              sx={{
                                fontSize: "0.875rem",
                                margin: "1rem 0",
                                fontWeight: "bold",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                          p: ({ node, children, ...props }) => (
                            <Box
                              component="p"
                              sx={{
                                margin: 0,
                                marginBottom: "0.75rem",
                                lineHeight: 1.5,
                                font: "inherit",
                                color: isUser
                                  ? "white"
                                  : theme.palette.mode === "dark"
                                    ? "white"
                                    : "black",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                          ul: ({ node, children, ...props }) => (
                            <ul
                              style={{
                                color:
                                  theme.palette.mode === "dark"
                                    ? "white"
                                    : "black",
                                font: "inherit",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </ul>
                          ),
                          ol: ({ node, children, ...props }) => (
                            <ol
                              style={{
                                color:
                                  theme.palette.mode === "dark"
                                    ? "white"
                                    : "black",
                                font: "inherit",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </ol>
                          ),
                          a: ({ node, ...props }) => (
                            // @ts-ignore
                            <MuiLink
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                color: "#f57c00",
                                textDecoration: "underline",
                                "&:hover": {
                                  color: isUser ? "white" : "#188bfb",
                                  cursor: "pointer",
                                },
                              }}
                            />
                          ),
                          blockquote: ({ node, children, ...props }) => (
                            <Box
                              component="blockquote"
                              sx={{
                                borderLeft: "4px solid #ddd",
                                margin: "1rem 0",
                                paddingLeft: "1rem",
                                fontStyle: "italic",
                                color: "#555",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                          hr: ({ node, ...props }) => (
                            <Box
                              component="hr"
                              sx={{
                                border: "none",
                                borderTop: "1px solid #eee",
                                margin: "1rem 0",
                              }}
                              {...(props as any)}
                            />
                          ),
                          // @ts-ignore
                          code: ({ inline, children, ...props }) => {
                            if (inline) {
                              return (
                                // @ts-ignore
                                <Box
                                  component="code"
                                  sx={{
                                    background: "#f5f5f5",
                                    color: "#333",
                                    padding: "0.2rem 0.4rem",
                                    borderRadius: "4px",
                                    fontFamily: "monospace",
                                    whiteSpace: "nowrap",
                                    overflowX: "auto",
                                  }}
                                  {...props}
                                >
                                  {children}
                                </Box>
                              );
                            }
                            // For block code, let the <pre> renderer take care of it.
                            return <code {...props}>{children}</code>;
                          },

                          // Override pre for block code blocks
                          pre: ({ node, children, ...props }) => (
                            // @ts-ignore
                            <Box
                              component="pre"
                              sx={{
                                background: "#f5f5f5",
                                color: "#333",
                                padding: "1rem",
                                borderRadius: "4px",
                                overflowX: "auto",
                                margin: "1rem 0",
                                maxWidth: "100%",
                                width: "100%",
                                boxSizing: "border-box",
                                whiteSpace: "pre-wrap", // wrap long lines if you prefer; use "pre" to preserve spacing without wrapping
                              }}
                              {...props}
                            >
                              {children}
                            </Box>
                          ),
                          table: ({ node, children, ...props }) => (
                            <Box
                              sx={{
                                overflowX: "auto",
                                mb: "1rem",
                              }}
                              {...(props as any)}
                            >
                              <Box
                                component="table"
                                sx={{
                                  width: "auto",
                                  minWidth: "100%",
                                  borderCollapse: "collapse",
                                  border:
                                    "1px solid " +
                                    (theme.palette.mode === "dark"
                                      ? "white"
                                      : "black"),
                                }}
                              >
                                {children}
                              </Box>
                            </Box>
                          ),
                          thead: ({ node, children, ...props }) => (
                            <Box component="thead" {...(props as any)}>
                              {children}
                            </Box>
                          ),
                          tbody: ({ node, children, ...props }) => (
                            <Box component="tbody" {...(props as any)}>
                              {children}
                            </Box>
                          ),
                          tr: ({ node, children, ...props }) => (
                            <tr {...(props as any)}>{children}</tr>
                          ),
                          th: ({ node, children, ...props }) => (
                            <Box
                              component="th"
                              sx={{
                                border:
                                  "1px solid " +
                                  (theme.palette.mode === "dark"
                                    ? "white"
                                    : "black"),
                                padding: "0.5rem",
                                backgroundColor:
                                  theme.palette.mode === "dark"
                                    ? "#333"
                                    : "#f5f5f5",
                                textAlign: "left",
                                fontWeight: "bold",
                                color:
                                  theme.palette.mode === "dark"
                                    ? "white"
                                    : "black",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                          td: ({ node, children, ...props }) => (
                            <Box
                              component="td"
                              sx={{
                                border:
                                  "1px solid " +
                                  (theme.palette.mode === "dark"
                                    ? "white"
                                    : "black"),
                                padding: "0.5rem",
                                textAlign: "left",
                                color:
                                  theme.palette.mode === "dark"
                                    ? "white"
                                    : "black",
                              }}
                              {...(props as any)}
                            >
                              {children}
                            </Box>
                          ),
                        }}
                      >
                        {linkifyText(msg.text)}
                      </ReactMarkdown>
                      {isBot && (
                        <CitationBubble
                          isAboutMe={isMessageAboutMe(msg.text)}
                        />
                      )}
                    </Box>
                  </motion.div>
                </Box>
              );
            })}
            <Box ref={chatEndRef} />
          </AnimatePresence>
        )}

        {/* Show "processing" or "streaming" or "thinking" messages */}
        {loadingState === "processing" && (
          <Box display="flex" alignItems="center" gap="0.5rem" mt="0.5rem">
            <CircularProgress size={18} />
            <Typography variant="caption" color="textSecondary">
              Processing Message
              <AnimatedEllipsis />
            </Typography>
          </Box>
        )}

        {loadingState === "thinking" && (
          <Box display="flex" alignItems="center" gap="0.5rem" mt="0.5rem">
            <CircularProgress size={18} />
            <Typography variant="caption" color="textSecondary">
              Thinking & Reasoning
              <AnimatedEllipsis />
            </Typography>
          </Box>
        )}

        {loadingState === "error" && (
          <Box display="flex" alignItems="center" gap="0.5rem" mt="0.5rem">
            <Typography variant="caption" color="error">
              Connection error. Retrying...
            </Typography>
          </Box>
        )}

        {loadingConversation && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
            }}
          >
            <Box display="flex" alignItems="center">
              <CircularProgress size={24} />
              <Typography
                variant="caption"
                ml={1}
                sx={{
                  color: theme.palette.mode === "dark" ? "white" : "black",
                }}
              >
                Loading Conversation...
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Input area */}
      <Box
        display="flex"
        flexDirection="column"
        p="1rem"
        pb="0.5rem"
        borderTop={`1px solid ${theme.palette.divider}`}
      >
        <Box display="flex">
          <TextField
            fullWidth
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              backgroundColor: theme.palette.background.paper,
              borderRadius: 1,
              transition: "background-color 0.3s ease",
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={loadingState !== "idle" && loadingState !== "done"}
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              borderRadius: 1,
              marginLeft: "0.5rem",
              transition: "background-color 0.3s ease",
              "&:hover": { backgroundColor: theme.palette.primary.dark },
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Terms and conditions */}
      <Typography
        variant="caption"
        align="center"
        mt={0}
        mb={1}
        color="textSecondary"
      >
        By using this AI assistant, you agree to its{" "}
        <MuiLink
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          sx={assistantLinkSx}
        >
          terms and conditions
        </MuiLink>
        .
      </Typography>
    </Box>
  );
};

export default ChatArea;
