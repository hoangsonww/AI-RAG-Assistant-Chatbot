import React, { useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { isAuthenticated } from "../services/api";
import { IConversation } from "../types/conversation";
import { useTheme } from "@mui/material/styles";
import {
  renameConversation,
  deleteConversation,
  generateConversationTitle,
} from "../services/api";

/**
 * Props: The Sidebar component props
 */
interface SidebarProps {
  open: boolean;
  conversations: IConversation[];
  onSelectConversation: (id: string) => void;
  selectedConversationId: string | null;
  onRefresh: () => void;
  isMobile: boolean;
  loadingConversations: boolean;
}

/**
 * The Sidebar component
 *
 * @param open The sidebar open state
 * @param conversations The list of conversations
 * @param onSelectConversation The select conversation function
 * @param selectedConversationId The selected conversation ID
 * @param onRefresh The refresh conversations function
 * @param isMobile The mobile state
 * @param loadingConversations The loading conversations state
 * @constructor The Sidebar component
 */
const Sidebar: React.FC<SidebarProps> = ({
  open,
  conversations,
  onSelectConversation,
  selectedConversationId,
  onRefresh,
  isMobile,
  loadingConversations,
}) => {
  const theme = useTheme();
  const [loadingRenameId, setLoadingRenameId] = useState<string | null>(null);
  const [loadingDeleteId, setLoadingDeleteId] = useState<string | null>(null);
  const [loadingGenerateTitle, setLoadingGenerateTitle] = useState(false);

  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameConvId, setRenameConvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);

  // On mobile, set the sidebar to full width but below the navbar (assume navbar height = 64px)
  const widthValue = isMobile ? "100%" : "240px";
  const positionValue = isMobile ? "absolute" : "relative";
  const topValue = isMobile ? "56px" : 0;
  const heightValue = isMobile ? "calc(100vh - 64px)" : "auto";

  /**
   * Handle renaming a conversation
   *
   * @param convId The conversation ID
   * @param currentTitle The current conversation title
   */
  const handleRename = (convId: string, currentTitle: string) => {
    setRenameConvId(convId);
    setRenameValue(currentTitle);
    setRenameDialogOpen(true);
  };

  /**
   * Execute the rename operation
   */
  const executeRename = async () => {
    if (renameConvId && renameValue.trim() !== "") {
      try {
        setLoadingRenameId(renameConvId);
        await renameConversation(renameConvId, renameValue);
        onRefresh();
        setRenameDialogOpen(false);
      } catch (error) {
        console.error("Failed to rename conversation", error);
      } finally {
        setLoadingRenameId(null);
      }
    }
  };

  /**
   * Handle deleting a conversation
   *
   * @param convId The conversation ID
   */
  const handleDelete = (convId: string) => {
    setDeleteConvId(convId);
    setDeleteDialogOpen(true);
  };

  /**
   * Execute the delete operation
   */
  const executeDelete = async () => {
    if (deleteConvId) {
      try {
        setLoadingDeleteId(deleteConvId);
        await deleteConversation(deleteConvId);
        onRefresh();
        setDeleteDialogOpen(false);
      } catch (error) {
        console.error("Failed to delete conversation", error);
      } finally {
        setLoadingDeleteId(null);
      }
    }
  };

  /**
   * Generate a conversation title using AI
   */
  const handleGenerateTitle = async () => {
    if (renameConvId) {
      try {
        setLoadingGenerateTitle(true);
        const response = await generateConversationTitle(renameConvId);
        setRenameValue(response.title);
      } catch (error) {
        console.error("Failed to generate conversation title", error);
      } finally {
        setLoadingGenerateTitle(false);
      }
    }
  };

  return (
    <Box
      sx={{
        position: positionValue,
        top: topValue,
        left: 0,
        height: heightValue,
        width: open ? widthValue : 0,
        borderRight: isMobile ? "none" : `1px solid ${theme.palette.divider}`,
        overflowY: "auto",
        transition:
          "width 0.3s ease-in-out, left 0.3s ease-in-out, background-color 0.3s ease",
        backgroundColor: theme.palette.background.paper,
        zIndex: isMobile ? 12000 : "auto", // Overlay on mobile
        boxShadow: isMobile && open ? 5 : 0,
      }}
    >
      {loadingConversations && (
        <Box textAlign="center" padding="1rem">
          <CircularProgress />
        </Box>
      )}

      {/* If the user is authenticated */}
      {isAuthenticated() ? (
        conversations.length === 0 ? (
          // Show a centered message if there are no conversations
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              p: 2,
            }}
          >
            <Typography variant="body1" color="textSecondary" align="center">
              No conversations yet. Start by sending a message to Lumina!
            </Typography>
          </Box>
        ) : (
          // Otherwise, render the conversation list
          <List>
            {conversations.map((conv) => (
              <ListItemButton
                key={conv._id}
                selected={conv._id === selectedConversationId}
                onClick={() => onSelectConversation(conv._id)}
                sx={{ justifyContent: "space-between" }}
              >
                <ListItemText
                  primary={conv.title}
                  primaryTypographyProps={{
                    noWrap: true, // clip text and add ellipsis if too long
                    sx: {
                      color:
                        theme.palette.mode === "dark"
                          ? theme.palette.common.white
                          : theme.palette.text.primary,
                    },
                  }}
                  sx={{ minWidth: 0 }} // ensures proper shrinking in flex layout
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(conv._id, conv.title);
                    }}
                    disabled={loadingRenameId === conv._id}
                  >
                    {loadingRenameId === conv._id ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <EditIcon fontSize="small" />
                    )}
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(conv._id);
                    }}
                    disabled={loadingDeleteId === conv._id}
                    sx={{ color: theme.palette.error.main }}
                  >
                    {loadingDeleteId === conv._id ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <DeleteIcon fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              </ListItemButton>
            ))}
          </List>
        )
      ) : (
        // If not authenticated, show a prompt to log in
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            p: 2,
          }}
        >
          <Typography variant="body1" color="textSecondary" align="center">
            Log in to save conversation history
          </Typography>
        </Box>
      )}

      {/* Rename Dialog */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rename Conversation</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Conversation Name"
            type="text"
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                executeRename();
              }
            }}
            disabled={loadingRenameId !== null || loadingGenerateTitle}
          />
          <Button
            onClick={handleGenerateTitle}
            startIcon={<AutoAwesomeIcon />}
            disabled={loadingRenameId !== null || loadingGenerateTitle}
            sx={{ mt: 2 }}
            variant="outlined"
            fullWidth
          >
            {loadingGenerateTitle ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Generate Name with AI"
            )}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRenameDialogOpen(false)}
            disabled={loadingRenameId !== null || loadingGenerateTitle}
          >
            Cancel
          </Button>
          <Button
            onClick={executeRename}
            variant="contained"
            disabled={
              loadingRenameId !== null ||
              renameValue.trim() === "" ||
              loadingGenerateTitle
            }
          >
            {loadingRenameId ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Rename"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Conversation</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this conversation? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={loadingDeleteId !== null}
          >
            Cancel
          </Button>
          <Button
            onClick={executeDelete}
            variant="contained"
            color="error"
            disabled={loadingDeleteId !== null}
          >
            {loadingDeleteId ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sidebar;
