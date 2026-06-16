import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  InputAdornment,
  CircularProgress,
  Alert,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { verifyEmail, resetPassword } from "../services/api";
import AuthShell from "../components/auth/AuthShell";
import PasswordField from "../components/auth/PasswordField";
import PasswordStrengthMeter from "../components/auth/PasswordStrengthMeter";
import {
  authFieldSx,
  authLinkSx,
  brandButtonSx,
  gradientTextSx,
} from "../components/auth/styles";

const STEPS = ["Verify email", "New password"] as const;

/**
 * The ForgotPassword component
 *
 * @constructor The ForgotPassword component
 */
const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const theme = useTheme();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const activeStep = emailVerified ? 1 : 0;
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  /**
   * Handle the verify email button click
   */
  const handleVerifyEmail = async () => {
    setError("");
    setLoadingVerify(true);
    try {
      const response = await verifyEmail(email); // Should return { exists: boolean }
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

  /**
   * Handle the reset password button click
   */
  const handleResetPassword = async () => {
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoadingReset(true);
    try {
      await resetPassword(email, newPassword);
      showToast(
        "Password reset successfully. Please login with your new password.",
        "success",
      );
      navigate("/login");
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    }
    setLoadingReset(false);
  };

  const handleBackToEmail = () => {
    setEmailVerified(false);
    setError("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const canReset =
    !loadingReset &&
    newPassword.trim() !== "" &&
    confirmPassword.trim() !== "" &&
    passwordsMatch;

  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title={
        <>
          Reset your{" "}
          <Box component="span" sx={gradientTextSx(theme)}>
            password
          </Box>
        </>
      }
      subtitle={
        emailVerified
          ? "Choose a strong new password for your account."
          : "Enter the email tied to your account and we'll help you reset your password."
      }
      footer={
        <>
          <Typography variant="body2" align="center" color="text.secondary">
            Remembered your password?{" "}
            <Button
              size="small"
              onClick={() => navigate("/login")}
              sx={authLinkSx}
            >
              Log In
            </Button>
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary">
            Just exploring?{" "}
            <Button
              size="small"
              onClick={() => navigate("/chat")}
              sx={{ ...authLinkSx, color: theme.palette.success.main }}
            >
              Back to Chat
            </Button>
          </Typography>
        </>
      }
    >
      {/* Step indicator */}
      <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}>
        {STEPS.map((label, i) => {
          const active = i === activeStep;
          const done = i < activeStep;
          const highlight = active || done;
          return (
            <Box key={label} sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: highlight ? "#fff" : theme.palette.text.secondary,
                    background: highlight
                      ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`
                      : alpha(theme.palette.text.primary, 0.1),
                  }}
                >
                  {done ? <CheckIcon sx={{ fontSize: 15 }} /> : i + 1}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: active
                      ? theme.palette.text.primary
                      : theme.palette.text.secondary,
                  }}
                >
                  {label}
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 3,
                  mt: 1,
                  borderRadius: 999,
                  background: highlight
                    ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`
                    : alpha(theme.palette.text.primary, 0.12),
                }}
              />
            </Box>
          );
        })}
      </Box>

      {!emailVerified ? (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!loadingVerify && email.trim()) handleVerifyEmail();
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
            disabled={loadingVerify}
            sx={authFieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailOutlineIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loadingVerify || email.trim() === ""}
            sx={brandButtonSx(theme)}
          >
            {loadingVerify ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Verify Email"
            )}
          </Button>
        </Box>
      ) : (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (canReset) handleResetPassword();
          }}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Box>
            <PasswordField
              fullWidth
              label="New Password"
              autoComplete="new-password"
              autoFocus
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loadingReset}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <PasswordStrengthMeter password={newPassword} />
          </Box>

          <Box>
            <PasswordField
              fullWidth
              label="Confirm New Password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loadingReset}
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

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={!canReset}
            sx={brandButtonSx(theme)}
          >
            {loadingReset ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Reset Password"
            )}
          </Button>
          <Button
            type="button"
            onClick={handleBackToEmail}
            disabled={loadingReset}
            startIcon={<ArrowBackIcon />}
            sx={{ ...authLinkSx, alignSelf: "center", color: "text.secondary" }}
          >
            Use a different email
          </Button>
        </Box>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;
