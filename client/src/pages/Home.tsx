import React, { useState, useEffect } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import { getConversations, isAuthenticated } from "../services/api";
import { IConversation } from "../types/conversation";

interface HomeProps {
  onToggleTheme: () => void;
  darkMode: boolean;
}

/**
 * The Home component
 *
 * @param onToggleTheme The toggle theme function
 * @param darkMode The dark mode state
 * @constructor The Home component
 */
const Home: React.FC<HomeProps> = ({ onToggleTheme, darkMode }) => {
  const guestSidebarKey = "guestSidebarOpen";
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (isAuthenticated()) {
      return true;
    }
    const storedPreference = localStorage.getItem(guestSidebarKey);
    if (storedPreference === null) {
      return false;
    }
    return storedPreference === "true";
  });
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(false);
  const [isStreamingOrProcessing, setIsStreamingOrProcessing] = useState(false);

  useEffect(() => {
    // Auth users follow responsive defaults; guests restore or default closed.
    if (isAuthenticated()) {
      setSidebarOpen(!isMobile);
      return;
    }
    const storedPreference = localStorage.getItem(guestSidebarKey);
    if (storedPreference === null) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(storedPreference === "true");
    }
  }, [isMobile]);

  /**
   * Toggle the sidebar open state
   */
  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const nextOpen = !prev;
      if (!isAuthenticated()) {
        localStorage.setItem(guestSidebarKey, String(nextOpen));
      }
      return nextOpen;
    });
  };

  /**
   * Load the conversations from the API
   */
  const loadConversations = async () => {
    setLoading(true);
    try {
      if (isAuthenticated()) {
        const resp = await getConversations();
        setConversations(resp);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  /**
   * Handle selecting a conversation
   *
   * @param id The conversation ID
   */
  const handleSelectConversation = (id: string | null) => {
    setSelectedConversationId(id);
  };

  /**
   * Handle creating a new conversation
   *
   * @param conv The new conversation
   */
  const handleNewConversation = (conv: IConversation) => {
    setSelectedConversationId(conv._id);

    // Update the conversation in the list instead of reloading everything
    setConversations((prev) => {
      const existingIndex = prev.findIndex((c) => c._id === conv._id);
      if (existingIndex >= 0) {
        // Update existing conversation
        const updated = [...prev];
        updated[existingIndex] = conv;
        return updated;
      } else {
        // Add new conversation to the beginning
        return [conv, ...prev];
      }
    });
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100vh"
      bgcolor={theme.palette.background.default}
      sx={{ transition: "background-color 0.3s ease" }}
    >
      <Navbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        onRefreshConversations={loadConversations}
        onSelectConversation={handleSelectConversation}
        onToggleTheme={onToggleTheme}
        darkMode={darkMode}
        setConversations={setConversations}
      />
      <Box display="flex" flex="1" overflow="hidden">
        <Sidebar
          open={sidebarOpen}
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConversationId}
          onRefresh={loadConversations}
          isMobile={isMobile}
          loadingConversations={loading}
          isStreamingOrProcessing={isStreamingOrProcessing}
        />
        {/* Fix ChatArea container to have a fixed height and hidden overflow */}
        <Box
          flex="1"
          sx={{
            height: "100%",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <ChatArea
            conversationId={selectedConversationId}
            onNewConversation={handleNewConversation}
            onStreamingChange={setIsStreamingOrProcessing}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
