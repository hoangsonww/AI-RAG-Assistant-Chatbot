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
  Tooltip,
  Alert,
} from "@mui/material";
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
  const supported = passkeysSupported();

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
    if (
      !window.confirm(
        "Remove this passkey? You'll need another sign-in method to access your account from the device that used it.",
      )
    ) {
      return;
    }
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
        background: "linear-gradient(to right, #00c6ff, #0072ff)",
        py: { xs: 3, sm: 6 },
        px: 2,
      }}
    >
      <Paper sx={{ p: { xs: 2.5, sm: 4 }, maxWidth: 560, width: "100%" }}>
        <Box display="flex" alignItems="center" mb={1}>
          <Tooltip title="Back to chat">
            <IconButton onClick={() => navigate("/chat")} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h5" sx={{ flex: 1 }}>
            Your passkeys
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
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

        <Box display="flex" gap={1} alignItems="flex-start" mb={2}>
          <TextField
            label="Nickname (optional)"
            placeholder="e.g. iPhone, Work laptop"
            size="small"
            fullWidth
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={!supported || registering}
          />
          <Button
            variant="contained"
            startIcon={
              registering ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <FingerprintIcon />
              )
            }
            onClick={handleRegister}
            disabled={!supported || registering}
            sx={{ whiteSpace: "nowrap" }}
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
                    onClick={() => handleDelete(c.credentialID)}
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
    </Box>
  );
};

export default Passkeys;
