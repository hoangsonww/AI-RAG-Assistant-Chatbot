import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  InputBase,
  Box,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import LogoutIcon from "@mui/icons-material/Logout";
import AddCommentIcon from "@mui/icons-material/AddComment";
import AccountCircle from "@mui/icons-material/AccountCircle";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

import {
  createNewConversation,
  searchConversations,
  isAuthenticated,
  validateToken,
  clearGuestMessagesFromLocalStorage,
} from "../services/api";
import { useNavigate } from "react-router-dom";
import { IConversation } from "../types/conversation";

/**
 * Props: The Navbar component props
 */
interface NavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onRefreshConversations: () => void;
  onSelectConversation: (id: string | null) => void;
  onToggleTheme: () => void;
  darkMode: boolean;
  setConversations: React.Dispatch<React.SetStateAction<IConversation[]>>;
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
  setConversations,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [newConvLoading, setNewConvLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const text = "Lumina AI";
  const colors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#9D4EDD"];
  const debounceTimerRef = useRef<number | null>(null);

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
   * Debounces the search term
   *
   * @param value The search value
   */
  const debouncedSearch = (value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(async () => {
      if (!value.trim()) {
        onRefreshConversations();
        setSearchLoading(false);
        return;
      }
      try {
        const results = await searchConversations(value);
        setConversations(results);
      } catch (error) {
        console.error(error);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  /**
   * Handles the search change
   *
   * @param e The change event
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSearchLoading(true);
    debouncedSearch(value);
  };

  /**
   * Creates a new conversation
   */
  const handleCreateNewConversation = async () => {
    setNewConvLoading(true);

    if (localStorage.getItem("guestConversationId")) {
      localStorage.removeItem("guestConversationId");
    }

    // Clear guest messages from localStorage
    clearGuestMessagesFromLocalStorage();

    try {
      const newConv = await createNewConversation();
      onRefreshConversations();
      onSelectConversation(newConv._id);
    } catch (error: any) {
      onSelectConversation(null);
      onRefreshConversations();
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
          justifyContent: "space-between",
          boxShadow: "0px 1px 5px 0px rgba(0,0,0,0.2)",
        }}
      >
        <Box display="flex" alignItems="center" flex="1">
          {/* Sidebar Toggle */}
          <Tooltip title="Toggle Sidebar" arrow>
            <IconButton
              color="inherit"
              onClick={onToggleSidebar}
              edge="start"
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>

          {/* Dark/Light Mode Toggle */}
          <Tooltip title={darkMode ? "Light Mode" : "Dark Mode"} arrow>
            <IconButton
              color="inherit"
              onClick={handleToggleTheme}
              sx={{ mr: 1 }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Search Bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              backgroundColor: darkMode ? "grey.800" : "white",
              color: "black",
              borderRadius: 1,
              padding: 1,
              flex: 1,
              transition: "all 0.3s",
              boxShadow: "0px 1px 5px 0px rgba(0,0,0,0.2)",
            }}
          >
            <SearchIcon
              sx={{ color: darkMode ? "grey.200" : "grey.700", mr: 1 }}
            />
            <InputBase
              placeholder="Search for a Conversation..."
              sx={{
                borderRadius: 8,
                flex: 1,
                color: darkMode ? "grey.200" : "black",
              }}
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchLoading && (
              <CircularProgress size={20} sx={{ ml: 1, color: "#1976d2" }} />
            )}
          </Box>

          {/* New Conversation Icon Button */}
          <Tooltip title="New Conversation" arrow>
            <span>
              <IconButton
                sx={{ ml: 1 }}
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

          {/* Login/Signup (if token is invalid) OR Logout */}
          {!isTokenValid ? (
            <>
              <Tooltip title="Login or Register" arrow>
                <IconButton
                  sx={{ ml: 1 }}
                  color="inherit"
                  onClick={handleMenuOpen}
                >
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
                  Login
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate("/signup");
                  }}
                >
                  Register
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Tooltip title="Logout" arrow>
              <IconButton
                onClick={handleLogout}
                sx={{ ml: 1, color: "error.main" }}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Title on the Right (only if not mobile) */}
        {!isMobile && (
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              ml: 2,
              fontSize: "24px",
              fontWeight: "bold",
              textDecoration: "none",
              color: "inherit",
              "&:hover": {
                textDecoration: "none",
              },
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
                    transition: "transform 0.3s ease, color 0.3s ease",
                    "&:hover": {
                      transform: "scale(1.2)",
                      color: "#e19292",
                    },
                  }}
                >
                  {char}
                </Box>
              );
            })}
          </Typography>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
