import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  loginUser,
  setTokenInLocalStorage,
  loginWithPasskey,
  passkeysSupported,
} from "../services/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import AuthShell from "../components/auth/AuthShell";
import PasswordField from "../components/auth/PasswordField";
import {
  authFieldSx,
  authLinkSx,
  brandButtonSx,
  gradientTextSx,
} from "../components/auth/styles";

/**
 * The Login component
 *
 * @constructor The Login component
 */
const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingPasskey, setLoadingPasskey] = useState(false);
  const [canUsePasskey, setCanUsePasskey] = useState(false);

  const theme = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    setCanUsePasskey(passkeysSupported());
  }, []);

  /**
   * Handle the login button click
   */
  const handleLogin = async () => {
    setLoadingLogin(true);
    try {
      const token = await loginUser(email, password);
      setTokenInLocalStorage(token);
      navigate("/chat");
    } catch (err: any) {
      showToast(err?.response?.data?.message || err.message, "error");
    } finally {
      setLoadingLogin(false);
    }
  };

  /**
   * Handle "Sign in with passkey". If email is empty, the browser will prompt
   * the user to pick any discoverable passkey bound to this site.
   */
  const handlePasskeyLogin = async () => {
    setLoadingPasskey(true);
    try {
      const token = await loginWithPasskey(email.trim() || undefined);
      setTokenInLocalStorage(token);
      navigate("/chat");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.name === "NotAllowedError"
          ? "Passkey prompt was dismissed."
          : err?.message) ||
        "Passkey sign-in failed.";
      showToast(message, "error");
    } finally {
      setLoadingPasskey(false);
    }
  };

  const busy = loadingLogin || loadingPasskey;

  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title={
        <>
          Sign in to{" "}
          <Box component="span" sx={gradientTextSx(theme)}>
            Lumina
          </Box>
        </>
      }
      subtitle="Log in to save your chat history and continue as a registered user."
      footer={
        <>
          <Typography variant="body2" align="center" color="text.secondary">
            Don&apos;t have an account?{" "}
            <Button
              size="small"
              onClick={() => navigate("/signup")}
              sx={authLinkSx}
            >
              Sign Up
            </Button>
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary">
            Prefer not to sign in?{" "}
            <Button
              size="small"
              onClick={() => navigate("/chat")}
              sx={{ ...authLinkSx, color: theme.palette.success.main }}
            >
              Continue as Guest
            </Button>
          </Typography>
        </>
      }
    >
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && email.trim() && password.trim()) handleLogin();
        }}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          fullWidth
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          sx={authFieldSx}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MailOutlineIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <PasswordField
          fullWidth
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ textAlign: "right", mt: -0.5 }}>
          <Button
            size="small"
            onClick={() => navigate("/forgot-password")}
            sx={{ ...authLinkSx, color: theme.palette.text.secondary }}
          >
            Forgot password?
          </Button>
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={busy || email.trim() === "" || password.trim() === ""}
          sx={brandButtonSx(theme)}
        >
          {loadingLogin ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Log In"
          )}
        </Button>

        {canUsePasskey && (
          <>
            <Divider sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
              or
            </Divider>
            <Button
              type="button"
              variant="outlined"
              fullWidth
              startIcon={
                loadingPasskey ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <FingerprintIcon />
                )
              }
              onClick={handlePasskeyLogin}
              disabled={busy}
              sx={{
                py: 1.1,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              {loadingPasskey ? "Waiting for passkey…" : "Sign in with passkey"}
            </Button>
            <Typography
              variant="caption"
              display="block"
              sx={{ color: "text.secondary", textAlign: "center", mt: -0.5 }}
            >
              {email.trim()
                ? "We'll use a passkey registered for this email."
                : "Leave email blank to choose any saved passkey."}
            </Typography>
          </>
        )}
      </Box>
    </AuthShell>
  );
};

export default Login;
