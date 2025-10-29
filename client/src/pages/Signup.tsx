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
} from "@mui/material";
import { signupUser, setTokenInLocalStorage, loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

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
      navigate("/chat");
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message);
    } finally {
      setLoadingSignup(false);
    }
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
    </Box>
  );
};

export default Signup;
