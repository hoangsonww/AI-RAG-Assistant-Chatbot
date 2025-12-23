import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import {
  Box,
  TextField,
  IconButton,
  ButtonBase,
  Typography,
  CircularProgress,
  useTheme,
  Link as MuiLink,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import SendIcon from "@mui/icons-material/Send";
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
  generateConversationTitle,
  renameConversation,
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
  onStreamingChange?: (isStreaming: boolean) => void;
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

const PROMPT_ROWS = [
  [
    "Summarize this article in 5 bullets",
    "Draft a polite follow-up email",
    "Plan a 3-day Tokyo itinerary",
    "Outline a product launch checklist",
    "Explain transformers in simple terms",
  ],
  [
    "Turn notes into a meeting agenda",
    "Suggest a 30-minute workout plan",
    "Brainstorm names for a travel app",
    "Write a SQL query for weekly sales",
    "Improve this resume bullet",
  ],
];

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
  onStreamingChange,
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

  // Notify parent when streaming state changes
  useEffect(() => {
    if (onStreamingChange) {
      onStreamingChange(
        isStreaming || (loadingState !== "idle" && loadingState !== "done"),
      );
    }
  }, [isStreaming, loadingState, onStreamingChange]);

  // State to control auto-scrolling. We'll only auto-scroll if the user is already near the bottom.
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Track the previous conversationId to avoid reloading when switching to a newly created conversation
  const prevConversationIdRef = useRef<string | null>(null);
  const isCreatingMessageRef = useRef<boolean>(false);

  // If we have an authenticated conversationId, load it from the server
  useEffect(() => {
    if (conversationId && isAuthenticated()) {
      // Only load if the conversationId actually changed AND we're not actively creating a message
      if (
        prevConversationIdRef.current !== conversationId &&
        !isCreatingMessageRef.current
      ) {
        loadConversation(conversationId);
        prevConversationIdRef.current = conversationId;
      } else if (prevConversationIdRef.current !== conversationId) {
        // Just update the ref without reloading
        prevConversationIdRef.current = conversationId;
      }
    } else if (isAuthenticated()) {
      setMessages([]);
      prevConversationIdRef.current = null;
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
    let isNewConversation = false;

    // Capture whether this is the first message BEFORE adding it
    const isFirstMessage = messages.length === 0;

    // Set flag to prevent conversation reload during message creation
    isCreatingMessageRef.current = true;

    try {
      // Create new conversation if needed for authenticated users.
      if (isAuthenticated() && !currentConvId) {
        console.log("[AUTO-TITLE] Creating new conversation...");
        const newConv = await createNewConversation();
        currentConvId = newConv._id;
        isNewConversation = true;
        console.log(
          "[AUTO-TITLE] New conversation created, ID:",
          currentConvId,
          "isNewConversation:",
          isNewConversation,
        );
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

        // Clear the flag to allow conversation reloading again
        isCreatingMessageRef.current = false;

        // Automatically generate title for new conversations
        // Use the captured isFirstMessage value from the outer scope
        if (isAuthenticated() && isFirstMessage && currentConvId) {
          console.log(
            "[AUTO-TITLE] Starting auto-title generation for conversation:",
            currentConvId,
          );

          // Run title generation asynchronously without blocking
          (async () => {
            try {
              console.log(
                "[AUTO-TITLE] Calling generateConversationTitle API...",
              );
              const { title } = await generateConversationTitle(currentConvId);
              console.log("[AUTO-TITLE] Generated title:", title);

              await renameConversation(currentConvId, title);
              console.log("[AUTO-TITLE] Title updated successfully");

              // Update the conversation in the parent component
              if (onNewConversation) {
                const updatedConv = await getConversationById(currentConvId);
                onNewConversation(updatedConv);
              }
            } catch (error) {
              // Silently fail - keep the conversation with default title
              console.error(
                "[AUTO-TITLE] Failed to auto-generate conversation title:",
                error,
              );
            }
          })();
        }
      };

      const handleError = (error: Error) => {
        console.error("Streaming error:", error);
        setIsStreaming(false);
        setLoadingState("error");

        // Clear the flag on error as well
        isCreatingMessageRef.current = false;

        const errorMessage =
          error.message && error.message.trim().length > 0
            ? error.message
            : "An unexpected error occurred while streaming the response.";

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: `Streaming error: ${errorMessage}`,
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
      isCreatingMessageRef.current = false; // Clear flag on catch error too
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

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    if (inputRef.current) {
      inputRef.current.focus();
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

  const isEmptyState =
    messages.length === 0 &&
    !loadingConversation &&
    loadingState !== "streaming" &&
    loadingState !== "thinking" &&
    loadingState !== "processing";

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      sx={{ overflowX: "hidden", position: "relative" }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Box
          component={motion.div}
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            width: { xs: 220, sm: 320, md: 380 },
            height: { xs: 220, sm: 320, md: 380 },
            top: "-12%",
            left: "-8%",
            opacity: theme.palette.mode === "dark" ? 0.5 : 0.7,
            background: `radial-gradient(circle at 30% 30%, ${alpha(
              theme.palette.primary.main,
              0.35,
            )}, transparent 65%)`,
            filter: "blur(6px)",
          }}
        />
        <Box
          component={motion.div}
          animate={{ x: [0, -35, 0], y: [0, 25, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            width: { xs: 240, sm: 360, md: 420 },
            height: { xs: 240, sm: 360, md: 420 },
            bottom: "-18%",
            right: "-10%",
            opacity: theme.palette.mode === "dark" ? 0.45 : 0.6,
            background: `radial-gradient(circle at 70% 30%, ${alpha(
              theme.palette.info.main,
              0.3,
            )}, transparent 70%)`,
            filter: "blur(10px)",
          }}
        />
        <Box
          component={motion.div}
          animate={{ x: [0, 25, 0], y: [0, 20, 0] }}
          transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            width: { xs: 180, sm: 240, md: 300 },
            height: { xs: 180, sm: 240, md: 300 },
            top: "35%",
            right: "20%",
            opacity: theme.palette.mode === "dark" ? 0.35 : 0.5,
            background: `radial-gradient(circle at 50% 50%, ${alpha(
              theme.palette.warning.main,
              0.25,
            )}, transparent 70%)`,
            filter: "blur(8px)",
          }}
        />
      </Box>
      {/* Main chat area - displays messages */}
      <Box
        flex="1"
        overflow="auto"
        padding="1rem"
        ref={scrollRef}
        sx={{
          position: "relative",
          zIndex: 1,
          backgroundColor: alpha(
            theme.palette.background.default,
            theme.palette.mode === "dark" ? 0.94 : 0.98,
          ),
          transition: "background-color 0.3s ease",
          overflowX: "hidden",
        }}
        onScroll={() => {
          if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            // Determine if user is within 50px of the bottom
            setIsAtBottom(scrollHeight - scrollTop - clientHeight < 50);
          }
        }}
      >
        {isEmptyState ? (
          <Box
            sx={{
              minHeight: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              px: { xs: 1, sm: 2 },
            }}
          >
            <Box sx={{ width: "100%", maxWidth: 720 }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}
              >
                Start a conversation with Lumina
              </Typography>
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ mb: { xs: 2, sm: 3 } }}
              >
                Ask a question or pick a prompt below to get going.
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                }}
              >
                <TextField
                  fullWidth
                  placeholder="Type your message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  inputRef={inputRef}
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
                    transition: "background-color 0.3s ease",
                    "&:hover": { backgroundColor: theme.palette.primary.dark },
                  }}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>
            <Box
              sx={{
                width: "100%",
                maxWidth: 960,
                mt: { xs: 2.5, sm: 3.5 },
              }}
            >
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{
                  display: "block",
                  mb: 1,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Suggested prompts
              </Typography>
              {PROMPT_ROWS.map((row, rowIndex) => {
                const marqueeItems = [...row, ...row];
                const isLeft = rowIndex % 2 === 0;
                return (
                  <Box
                    key={`prompt-row-${rowIndex}`}
                    sx={{
                      overflow: "hidden",
                      width: "100%",
                      mt: rowIndex === 0 ? 0 : { xs: 1.25, sm: 1.75 },
                      maskImage:
                        "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
                      WebkitMaskImage:
                        "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
                    }}
                  >
                    <Box
                      component={motion.div}
                      animate={{
                        x: isLeft ? ["0%", "-50%"] : ["-50%", "0%"],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: isLeft ? 28 : 32,
                        ease: "linear",
                      }}
                      sx={{
                        display: "flex",
                        gap: { xs: 1, sm: 1.5 },
                        width: "max-content",
                        py: { xs: 0.5, sm: 0.75 },
                      }}
                    >
                      {marqueeItems.map((prompt, idx) => (
                        <ButtonBase
                          key={`${prompt}-${idx}`}
                          disableRipple
                          onClick={() => handlePromptSelect(prompt)}
                          sx={{
                            flex: "0 0 auto",
                            borderRadius: 999,
                            border: `1px solid ${alpha(
                              theme.palette.divider,
                              0.7,
                            )}`,
                            backgroundColor: alpha(
                              theme.palette.background.paper,
                              theme.palette.mode === "dark" ? 0.6 : 0.9,
                            ),
                            px: { xs: 1.5, sm: 2 },
                            py: { xs: 0.75, sm: 1 },
                            textAlign: "left",
                            boxShadow:
                              theme.palette.mode === "dark"
                                ? "0 6px 18px rgba(0,0,0,0.35)"
                                : "0 6px 18px rgba(15,23,42,0.08)",
                            transition:
                              "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              borderColor: alpha(
                                theme.palette.primary.main,
                                0.7,
                              ),
                              backgroundColor: alpha(
                                theme.palette.background.paper,
                                theme.palette.mode === "dark" ? 0.75 : 1,
                              ),
                              boxShadow:
                                theme.palette.mode === "dark"
                                  ? "0 10px 22px rgba(0,0,0,0.4)"
                                  : "0 10px 24px rgba(15,23,42,0.12)",
                            },
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "nowrap",
                              fontSize: { xs: "0.8rem", sm: "0.9rem" },
                              color: "text.primary",
                            }}
                          >
                            {prompt}
                          </Typography>
                        </ButtonBase>
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
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
      {!isEmptyState && (
        <Box
          display="flex"
          flexDirection="column"
          p="1rem"
          pb="0.5rem"
          borderTop={`1px solid ${theme.palette.divider}`}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Box display="flex">
            <TextField
              fullWidth
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              inputRef={inputRef}
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
      )}

      {/* Terms and conditions */}
      <Typography
        variant="caption"
        align="center"
        mt={0}
        mb={1}
        color="textSecondary"
        sx={{ position: "relative", zIndex: 1 }}
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
