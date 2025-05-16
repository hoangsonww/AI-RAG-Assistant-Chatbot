import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { verifyEmail, resetPassword } from "../services/api";
import { useNavigate } from "react-router-dom";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  open,
  onClose,
  onOpenLogin,
}) => {
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const navigate = useNavigate();

  const handleVerifyEmail = async () => {
    setError("");
    setLoadingVerify(true);
    try {
      const response = await verifyEmail(email);
      if (response.exists) {
        setEmailVerified(true);
      } else {
        setError("Email not found");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    }
    setLoadingVerify(false);
  };

  const handleResetPassword = async () => {
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoadingReset(true);
    try {
      await resetPassword(email, newPassword);
      alert(
        "Password reset successfully. Please login with your new password."
      );
      navigate("/login");
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    }
    setLoadingReset(false);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Box
          bgcolor="background.paper"
          p={4}
          borderRadius={2}
          boxShadow={3}
          maxWidth={400}
          width="100%"
        >
          <Typography variant="h5" mb={2} textAlign="center">
            Forgot Password
          </Typography>
          {!emailVerified ? (
            <>
              <TextField
                fullWidth
                label="Email"
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleVerifyEmail();
                  }
                }}
                disabled={loadingVerify}
              />
              {error && (
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              )}
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleVerifyEmail}
                sx={{ mt: 2 }}
                disabled={loadingVerify || email.trim() === ""}
              >
                {loadingVerify ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Verify Email"
                )}
              </Button>
            </>
          ) : (
            <>
              <TextField
                fullWidth
                label="New Password"
                margin="normal"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                required
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleResetPassword();
                  }
                }}
                disabled={loadingReset}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        edge="end"
                        disabled={loadingReset}
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                margin="normal"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                required
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleResetPassword();
                  }
                }}
                disabled={loadingReset}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        edge="end"
                        disabled={loadingReset}
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {error && (
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              )}
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleResetPassword}
                sx={{ mt: 2 }}
                disabled={
                  loadingReset ||
                  newPassword.trim() === "" ||
                  confirmPassword.trim() === ""
                }
              >
                {loadingReset ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Reset Password"
                )}
              </Button>
            </>
          )}
          <Box mt={2} textAlign="center">
            <Typography variant="body2">
              Remembered your password?{" "}
              <Button onClick={onOpenLogin} color="primary">
                Login
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default ForgotPasswordModal;
