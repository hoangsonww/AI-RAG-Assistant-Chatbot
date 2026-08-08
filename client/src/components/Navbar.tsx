import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import AddCommentIcon from "@mui/icons-material/AddComment";
import AccountCircle from "@mui/icons-material/AccountCircle";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import StorageIcon from "@mui/icons-material/Storage";

import {
  createNewConversation,
  isAuthenticated,
  validateToken,
  clearGuestMessagesFromLocalStorage,
  createGuestConversationInLocalStorage,
  isAdminUser,
} from "../services/api";
import { useNavigate } from "react-router-dom";

/**
 * Props: The Navbar component props
 */
interface NavbarProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onRefreshConversations?: () => void;
  onSelectConversation?: (id: string | null) => void;
  onToggleTheme: () => void;
  darkMode: boolean;
  activeTitle?: string;
}

/**
 * The Navbar component
 *
 * @param sidebarOpen The sidebar open state
 * @param onToggleSidebar The sidebar toggle function
 * @param onRefreshConversations The refresh conversations function
 * @param onSelectConversation The select conversation function
 * @param onToggleTheme The toggle theme function
 * @param darkMode The dark mode state
 * @param setConversations The set conversations function
 * @constructor The Navbar component
 */
const Navbar: React.FC<NavbarProps> = ({
  sidebarOpen,
  onToggleSidebar,
  onRefreshConversations,
  onSelectConversation,
  onToggleTheme,
  darkMode,
  activeTitle = "",
}) => {
  const [newConvLoading, setNewConvLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const text = "Lumina AI";
  // Treat default placeholder titles as "no title" so the welcome line shows.
  const DEFAULT_TITLES = ["New Conversation", "Untitled Conversation"];
  const hasRealTitle =
    activeTitle.trim() !== "" && !DEFAULT_TITLES.includes(activeTitle.trim());
  // Bright/light hues that stay legible on the blue AppBar (no saturated blue).
  const colors = ["#FFD93D", "#FF8A8A", "#7CF0BD", "#FFFFFF", "#C792EA"];

  // State to track token validity
  const [isTokenValid, setIsTokenValid] = useState(isAuthenticated());
  // Ref to ensure the app reloads only once
  const hasReloadedRef = useRef(false);

  // Validate the token every 500ms and reload only once if invalid
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsTokenValid(false);
      return;
    }

    const interval = setInterval(async () => {
      const valid = await validateToken();
      if (!valid && !hasReloadedRef.current) {
        hasReloadedRef.current = true;
        console.warn("Token invalid, reloading app...");
        window.location.reload();
      }
      setIsTokenValid(valid);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  /**
   * Opens the menu anchor
   *
   * @param event The mouse event
   */
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  /**
   * Closes the menu anchor
   */
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  /**
   * Creates a new conversation
   */
  const handleCreateNewConversation = async () => {
    setNewConvLoading(true);

    if (!isAuthenticated()) {
      const newGuestConversation = createGuestConversationInLocalStorage();
      if (onRefreshConversations) onRefreshConversations();
      if (onSelectConversation) onSelectConversation(newGuestConversation._id);
      setNewConvLoading(false);
      return;
    }

    if (localStorage.getItem("guestConversationId")) {
      localStorage.removeItem("guestConversationId");
    }

    // Clear guest messages from localStorage
    clearGuestMessagesFromLocalStorage();

    try {
      const newConv = await createNewConversation();
      if (onRefreshConversations) onRefreshConversations();
      if (onSelectConversation) onSelectConversation(newConv._id);
    } catch (error: any) {
      if (onSelectConversation) onSelectConversation(null);
      if (onRefreshConversations) onRefreshConversations();
      if (error.response && error.response.status === 401) {
        console.warn(
          "User is not authenticated, clearing conversation in UI only.",
        );
      } else {
        console.error(error);
      }
      if (!hasReloadedRef.current) {
        hasReloadedRef.current = true;
        window.location.reload();
      }
    } finally {
      setNewConvLoading(false);
    }
  };

  /**
   * Logs out the user
   */
  const handleLogout = () => {
    localStorage.removeItem("token");
    // Drop the cached conversation list so the next user never sees stale data.
    localStorage.removeItem("cachedAuthConversations");
    navigate("/login");
  };

  /**
   * Toggles the theme
   */
  const handleToggleTheme = () => {
    onToggleTheme();
    localStorage.setItem("darkMode", JSON.stringify(!darkMode));
  };

  return (
    <AppBar position="static" sx={{ transition: "all 0.3s" }}>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          boxShadow: "0px 1px 5px 0px rgba(0,0,0,0.2)",
        }}
      >
        {/* Left: sidebar toggle + brand */}
        <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {onToggleSidebar && (
            <Tooltip title="Toggle Sidebar" arrow>
              <IconButton
                color="inherit"
                onClick={onToggleSidebar}
                edge="start"
                sx={{ mr: isMobile ? 0.5 : 1 }}
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
          )}

          {!isMobile && (
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{
                fontSize: "24px",
                fontWeight: "bold",
                textDecoration: "none",
                color: "inherit",
                whiteSpace: "nowrap",
                "&:hover": { textDecoration: "none" },
              }}
            >
              {text.split("").map((char, index) => {
                if (char === " ") {
                  return (
                    <Box key={index} component="span">
                      &nbsp;
                    </Box>
                  );
                }
                const color = colors[index % colors.length];
                return (
                  <Box
                    key={index}
                    component="span"
                    sx={{
                      color,
                      display: "inline-block",
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      transition: "transform 0.3s ease, color 0.3s ease",
                      "&:hover": { transform: "scale(1.25)" },
                    }}
                  >
                    {char}
                  </Box>
                );
              })}
            </Typography>
          )}
        </Box>

        {/* Center: active conversation title */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            justifyContent: "center",
            px: 1,
          }}
        >
          <Typography
            variant="subtitle1"
            noWrap
            sx={{
              fontWeight: 600,
              maxWidth: "100%",
              color: "inherit",
              opacity: hasRealTitle ? 0.95 : 0.8,
            }}
          >
            {hasRealTitle
              ? activeTitle
              : isMobile
                ? "Welcome to Lumina"
                : "Welcome to Lumina - ask me anything about David"}
          </Typography>
        </Box>

        {/* Right: actions */}
        <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {/* Dark/Light Mode Toggle */}
          <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"} arrow>
            <IconButton color="inherit" onClick={handleToggleTheme}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* New Conversation */}
          {onSelectConversation && onRefreshConversations && (
            <Tooltip title="New Conversation" arrow>
              <span>
                <IconButton
                  color="inherit"
                  onClick={handleCreateNewConversation}
                  disabled={newConvLoading}
                >
                  {newConvLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <AddCommentIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* Knowledge Manager (Admin Only) */}
          {isTokenValid && isAdminUser() && (
            <Tooltip title="Knowledge Manager" arrow>
              <IconButton
                color="inherit"
                onClick={() => navigate("/admin/knowledge")}
              >
                <StorageIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Login/Signup (if token is invalid) OR Account/Logout */}
          {!isTokenValid ? (
            <>
              <Tooltip title="Login or Register" arrow>
                <IconButton color="inherit" onClick={handleMenuOpen}>
                  <AccountCircle />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/login");
                  }}
                >
                  <LoginIcon fontSize="small" sx={{ mr: 1.25 }} />
                  Login
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/signup");
                  }}
                >
                  <PersonAddIcon fontSize="small" sx={{ mr: 1.25 }} />
                  Register
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Tooltip title="Account" arrow>
                <IconButton color="inherit" onClick={handleMenuOpen}>
                  <AccountCircle />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/passkeys");
                  }}
                >
                  <FingerprintIcon fontSize="small" sx={{ mr: 1.25 }} />
                  Passkeys
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    handleLogout();
                  }}
                >
                  <LogoutIcon
                    fontSize="small"
                    sx={{ mr: 1.25, color: "error.main" }}
                  />
                  <Box component="span" sx={{ color: "error.main" }}>
                    Sign Out
                  </Box>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
