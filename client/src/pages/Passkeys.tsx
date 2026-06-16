import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import {
  isAuthenticated,
  listPasskeys,
  registerPasskey,
  deletePasskey,
  passkeysSupported,
  PasskeySummary,
} from "../services/api";
import { gradientTextSx, authFieldSx } from "../components/auth/styles";

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const Passkeys: React.FC = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<PasskeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const supported = passkeysSupported();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const pageBackground = isDark
    ? `radial-gradient(circle at 15% 15%, ${alpha(
        theme.palette.primary.main,
        0.18,
      )}, transparent 45%),
       radial-gradient(circle at 85% 20%, ${alpha(
         theme.palette.info.main,
         0.16,
       )}, transparent 45%),
       linear-gradient(180deg, #0b0f1a 0%, #0f172a 60%, #111827 100%)`
    : `radial-gradient(circle at 15% 15%, ${alpha(
        theme.palette.primary.main,
        0.12,
      )}, transparent 45%),
       radial-gradient(circle at 85% 20%, ${alpha(
         theme.palette.info.main,
         0.1,
       )}, transparent 45%),
       linear-gradient(180deg, #f8fafc 0%, #eef2ff 60%, #f8fafc 100%)`;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPasskeys();
      setCredentials(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load passkeys",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    refresh();
  }, [refresh, navigate]);

  const handleRegister = async () => {
    setRegistering(true);
    setError(null);
    setInfo(null);
    try {
      await registerPasskey(nickname.trim() || undefined);
      setNickname("");
      setInfo("Passkey registered.");
      await refresh();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (err?.name === "InvalidStateError"
          ? "This authenticator already has a passkey for this account."
          : err?.name === "NotAllowedError"
            ? "Passkey prompt was dismissed."
            : err?.message) ||
        "Failed to register passkey";
      setError(msg);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (credentialID: string) => {
    setConfirmDeleteId(null);
    setDeletingId(credentialID);
    setError(null);
    setInfo(null);
    try {
      await deletePasskey(credentialID);
      setInfo("Passkey removed.");
      await refresh();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to remove passkey",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Box
      display="flex"
      minHeight="100vh"
      justifyContent="center"
      alignItems="flex-start"
      sx={{
        background: pageBackground,
        color: theme.palette.text.primary,
        position: "relative",
        overflow: "hidden",
        py: { xs: 5, sm: 8 },
        px: 2,
      }}
    >
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          opacity: isDark ? 0.12 : 0.05,
        }}
      />
      <Paper
        elevation={0}
        sx={{
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
          p: { xs: 2.5, sm: 4 },
          maxWidth: 560,
          width: "100%",
          borderRadius: 3,
          backgroundColor: alpha(
            theme.palette.background.paper,
            isDark ? 0.72 : 0.92,
          ),
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          backdropFilter: "blur(16px)",
          boxShadow: isDark
            ? "0 24px 50px rgba(0,0,0,0.45)"
            : "0 24px 50px rgba(15,23,42,0.12)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main}, ${theme.palette.secondary.main})`,
          }}
        />
        <Button
          onClick={() => navigate("/chat")}
          startIcon={<ArrowBackIcon />}
          sx={{
            textTransform: "none",
            color: "text.secondary",
            mb: 2.5,
            ml: -0.5,
            px: 1,
            minWidth: 0,
          }}
        >
          Back to chat
        </Button>
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
              boxShadow: "0 10px 22px rgba(0,0,0,0.22)",
            }}
          >
            <FingerprintIcon sx={{ color: "#fff", fontSize: 26 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            Your{" "}
            <Box component="span" sx={gradientTextSx(theme)}>
              passkeys
            </Box>
          </Typography>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2, mb: 2 }}
        >
          Passkeys let you sign in instantly with Face ID, Touch ID, Windows
          Hello, or your phone — no password to type. Your password still works
          as a fallback.
        </Typography>

        {!supported && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This browser doesn't support passkeys. Try a recent version of
            Chrome, Safari, Edge, or Firefox.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setInfo(null)}
          >
            {info}
          </Alert>
        )}

        <Box display="flex" gap={1} alignItems="center" mb={2}>
          <TextField
            label="Nickname (optional)"
            placeholder="e.g. iPhone, Work laptop"
            size="small"
            fullWidth
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={!supported || registering}
            sx={authFieldSx}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={
              registering ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <FingerprintIcon fontSize="small" />
              )
            }
            onClick={handleRegister}
            disabled={!supported || registering}
            sx={{
              whiteSpace: "nowrap",
              textTransform: "none",
              flexShrink: 0,
              px: 2.5,
              height: 40,
              borderRadius: 2,
              fontWeight: 700,
              background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
              boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-1px)" },
              "&.Mui-disabled": {
                background: alpha(theme.palette.primary.main, 0.3),
                color: alpha(theme.palette.common.white, 0.6),
              },
            }}
          >
            Add passkey
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : credentials.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 2 }}
          >
            No passkeys yet. Add one to enable instant sign-in.
          </Typography>
        ) : (
          <List dense>
            {credentials.map((c) => (
              <ListItem
                key={c.credentialID}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete passkey"
                    onClick={() => setConfirmDeleteId(c.credentialID)}
                    disabled={deletingId === c.credentialID}
                  >
                    {deletingId === c.credentialID ? (
                      <CircularProgress size={18} />
                    ) : (
                      <DeleteIcon />
                    )}
                  </IconButton>
                }
              >
                <ListItemText
                  primary={c.nickname || "Unnamed passkey"}
                  secondary={
                    <>
                      Added {formatDate(c.createdAt)}
                      {c.lastUsedAt
                        ? ` · last used ${formatDate(c.lastUsedAt)}`
                        : ""}
                      {c.deviceType
                        ? ` · ${c.deviceType === "multiDevice" ? "synced" : "device-bound"}`
                        : ""}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
      >
        <DialogTitle>Remove passkey?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You'll need another sign-in method to access your account from the
            device that used this passkey.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            color="error"
            variant="contained"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Passkeys;
