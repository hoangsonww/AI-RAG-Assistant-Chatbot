import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  signupUser,
  setTokenInLocalStorage,
  loginUser,
  passkeysSupported,
  registerPasskey,
} from "../services/api";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AuthShell from "../components/auth/AuthShell";
import PasswordField from "../components/auth/PasswordField";
import PasswordStrengthMeter from "../components/auth/PasswordStrengthMeter";
import {
  authFieldSx,
  authLinkSx,
  brandButtonSx,
  gradientTextSx,
} from "../components/auth/styles";

/**
 * The Signup component
 *
 * @constructor The Signup component
 */
const Signup: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [passkeyDialogOpen, setPasskeyDialogOpen] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  const theme = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  /**
   * Handle the signup button click
   */
  const handleSignup = async () => {
    if (password !== confirmPassword) {
      showToast("Passwords don't match", "warning");
      return;
    }
    setLoadingSignup(true);
    try {
      await signupUser(email, password);
      // Automatically log in after sign up.
      const token = await loginUser(email, password);
      setTokenInLocalStorage(token);
      // Offer passkey enrollment one time, but only if the browser supports it.
      // Skipping this step still lands the user in /chat — they can always add
      // a passkey later from /passkeys.
      if (passkeysSupported()) {
        setPasskeyDialogOpen(true);
      } else {
        navigate("/chat");
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err.message, "error");
    } finally {
      setLoadingSignup(false);
    }
  };

  const handleEnrollPasskey = async () => {
    setRegisteringPasskey(true);
    try {
      await registerPasskey();
      setPasskeyDialogOpen(false);
      navigate("/chat");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err?.name === "NotAllowedError"
          ? "Passkey prompt was dismissed. You can add one later from your account."
          : err?.message) ||
        "Failed to set up passkey";
      showToast(msg, "error");
    } finally {
      setRegisteringPasskey(false);
    }
  };

  const handleSkipPasskey = () => {
    setPasskeyDialogOpen(false);
    navigate("/chat");
  };

  const canSubmit =
    !loadingSignup &&
    email.trim() !== "" &&
    password.trim() !== "" &&
    confirmPassword.trim() !== "" &&
    passwordsMatch;

  return (
    <AuthShell
      eyebrow="GET STARTED"
      title={
        <>
          Create your{" "}
          <Box component="span" sx={gradientTextSx(theme)}>
            account
          </Box>
        </>
      }
      subtitle="Sign up to save your chat history, access your messages from any device, and more."
      footer={
        <>
          <Typography variant="body2" align="center" color="text.secondary">
            Already have an account?{" "}
            <Button
              size="small"
              onClick={() => navigate("/login")}
              sx={authLinkSx}
            >
              Log In
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
          if (canSubmit) handleSignup();
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
          disabled={loadingSignup}
          sx={authFieldSx}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MailOutlineIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <Box>
          <PasswordField
            fullWidth
            label="Password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loadingSignup}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <PasswordStrengthMeter password={password} />
        </Box>

        <Box>
          <PasswordField
            fullWidth
            label="Confirm Password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loadingSignup}
            error={passwordsMismatch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {confirmPassword.length > 0 && (
            <Typography
              variant="caption"
              sx={{
                mt: 0.5,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: passwordsMatch
                  ? theme.palette.success.main
                  : theme.palette.error.main,
                fontWeight: 600,
              }}
            >
              {passwordsMatch ? (
                <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
              ) : (
                <ErrorOutlineIcon sx={{ fontSize: 16 }} />
              )}
              {passwordsMatch ? "Passwords match" : "Passwords don't match"}
            </Typography>
          )}
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={!canSubmit}
          sx={brandButtonSx(theme)}
        >
          {loadingSignup ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Create Account"
          )}
        </Button>
      </Box>

      <Dialog
        open={passkeyDialogOpen}
        onClose={registeringPasskey ? undefined : handleSkipPasskey}
        aria-labelledby="passkey-setup-title"
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            backgroundImage: "none",
            overflow: "hidden",
          },
        }}
      >
        <Box
          sx={{
            height: 4,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main}, ${theme.palette.secondary.main})`,
          }}
        />
        <DialogContent sx={{ textAlign: "center", pt: 3.5 }}>
          <Box
            sx={{
              mx: "auto",
              mb: 2,
              width: 56,
              height: 56,
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
              boxShadow: "0 12px 26px rgba(0,0,0,0.25)",
            }}
          >
            <FingerprintIcon sx={{ color: "#fff", fontSize: 30 }} />
          </Box>
          <Typography
            id="passkey-setup-title"
            variant="h6"
            sx={{ fontWeight: 800, mb: 1 }}
          >
            Set up a passkey?
          </Typography>
          <DialogContentText sx={{ mb: 2.5 }}>
            Sign in next time with Face ID, Touch ID, Windows Hello, or your
            phone — no password to type.
          </DialogContentText>
          <Box
            sx={{
              display: "grid",
              gap: 1,
              textAlign: "left",
              maxWidth: 320,
              mx: "auto",
            }}
          >
            {[
              "Faster, phishing‑resistant sign‑in",
              "No password to remember or type",
              "Add or remove anytime from settings",
            ].map((benefit) => (
              <Box
                key={benefit}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <CheckCircleOutlineIcon
                  sx={{ fontSize: 18, color: theme.palette.success.main }}
                />
                <Typography variant="body2" color="text.secondary">
                  {benefit}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={handleSkipPasskey}
            disabled={registeringPasskey}
            color="inherit"
            sx={{ textTransform: "none" }}
          >
            Skip for now
          </Button>
          <Button
            onClick={handleEnrollPasskey}
            disabled={registeringPasskey}
            variant="contained"
            sx={brandButtonSx(theme)}
            startIcon={
              registeringPasskey ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <FingerprintIcon />
              )
            }
          >
            {registeringPasskey ? "Waiting…" : "Set up passkey"}
          </Button>
        </DialogActions>
      </Dialog>
    </AuthShell>
  );
};

export default Signup;
