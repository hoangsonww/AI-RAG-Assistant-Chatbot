import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  signupUser,
  setTokenInLocalStorage,
  loginUser,
  passkeysSupported,
  registerPasskey,
} from "../services/api";
import { useNavigate } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import FingerprintIcon from "@mui/icons-material/Fingerprint";

/**
 * The Signup component
 *
 * @constructor The Signup component
 */
const Signup: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [passkeyDialogOpen, setPasskeyDialogOpen] = useState(false);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  const navigate = useNavigate();

  /**
   * Handle the signup button click
   */
  const handleSignup = async () => {
    if (password !== confirmPassword) {
      alert("Passwords don't match");
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
      alert(err?.response?.data?.message || err.message);
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
      alert(msg);
    } finally {
      setRegisteringPasskey(false);
    }
  };

  const handleSkipPasskey = () => {
    setPasskeyDialogOpen(false);
    navigate("/chat");
  };

  return (
    <Box
      display="flex"
      height="100vh"
      justifyContent="center"
      alignItems="center"
      sx={{ background: "linear-gradient(to right, #00c6ff, #0072ff)" }}
    >
      <Paper style={{ padding: "2rem", maxWidth: 400, width: "100%" }}>
        <Typography
          variant="h4"
          marginBottom="1rem"
          sx={{ textAlign: "center" }}
        >
          Sign Up
        </Typography>
        <Typography
          variant="body2"
          marginBottom="1rem"
          sx={{ textAlign: "center" }}
        >
          Sign up to save your chat history, access your messages from any
          device, and more.
        </Typography>
        <TextField
          fullWidth
          label="Email"
          margin="normal"
          value={email}
          required={true}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSignup();
            }
          }}
          disabled={loadingSignup}
        />
        <TextField
          fullWidth
          label="Password"
          margin="normal"
          type={showPw ? "text" : "password"}
          value={password}
          required={true}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSignup();
            }
          }}
          disabled={loadingSignup}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPw(!showPw)}
                  disabled={loadingSignup}
                >
                  {showPw ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          label="Confirm Password"
          margin="normal"
          type={showConfirmPw ? "text" : "password"}
          value={confirmPassword}
          required={true}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSignup();
            }
          }}
          disabled={loadingSignup}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  disabled={loadingSignup}
                >
                  {showConfirmPw ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleSignup}
          style={{ marginTop: "1rem" }}
          disabled={
            loadingSignup ||
            email.trim() === "" ||
            password.trim() === "" ||
            confirmPassword.trim() === ""
          }
        >
          {loadingSignup ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Sign Up"
          )}
        </Button>
        <Box marginTop="1rem">
          <Typography variant="body2">
            Already have an account?{" "}
            <Button onClick={() => navigate("/login")}>Login</Button>
          </Typography>
          <Typography variant="body2">
            Don't want to login?{" "}
            <Button
              style={{ color: "green" }}
              onClick={() => navigate("/chat")}
            >
              Continue as Guest
            </Button>
          </Typography>
          <Typography variant="body2">
            Forgot your password?{" "}
            <Button
              style={{ color: "red" }}
              onClick={() => navigate("/forgot-password")}
            >
              Reset Password
            </Button>
          </Typography>
        </Box>
      </Paper>

      <Dialog
        open={passkeyDialogOpen}
        onClose={registeringPasskey ? undefined : handleSkipPasskey}
        aria-labelledby="passkey-setup-title"
      >
        <DialogTitle
          id="passkey-setup-title"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <FingerprintIcon color="primary" /> Set up a passkey?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sign in next time with Face ID, Touch ID, Windows Hello, or your
            phone — no password to type. You can always add or remove passkeys
            later from your account settings.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleSkipPasskey}
            disabled={registeringPasskey}
            color="inherit"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleEnrollPasskey}
            disabled={registeringPasskey}
            variant="contained"
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
    </Box>
  );
};

export default Signup;
