import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";
import SyncIcon from "@mui/icons-material/Sync";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  createKnowledgeSource,
  deleteKnowledgeSource,
  isAdminUser,
  isAuthenticated,
  IKnowledgeSource,
  KnowledgeSourcePayload,
  listKnowledgeSources,
  reindexKnowledgeSource,
  SyncManifestEntry,
  syncKnowledgeManifest,
  updateKnowledgeSource,
} from "../services/api";

// ─── helpers ────────────────────────────────────────────────────────────────

const SOURCE_TYPES = ["resume", "note", "link", "project", "bio", "other"] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

const parseTags = (raw: string): string[] =>
  raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

const emptyForm = (): KnowledgeSourcePayload => ({
  title: "",
  content: "",
  sourceType: "note",
  sourceUrl: "",
  tags: [],
  externalId: "",
});

// ─── component ──────────────────────────────────────────────────────────────

interface KnowledgeAdminProps {
  onToggleTheme: () => void;
  darkMode: boolean;
}

const KnowledgeAdmin: React.FC<KnowledgeAdminProps> = ({ onToggleTheme, darkMode }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";

  // ── auth guard ──
  const isAdmin = isAdminUser();
  useEffect(() => {
    if (!isAuthenticated()) navigate("/login");
  }, [navigate]);

  // ── data ──
  const [sources, setSources] = useState<IKnowledgeSource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);

  // ── filters ──
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // ── dialogs ──
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IKnowledgeSource | null>(null);
  const [form, setForm] = useState<KnowledgeSourcePayload>(emptyForm());
  const [tagsRaw, setTagsRaw] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<IKnowledgeSource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [reindexingId, setReindexingId] = useState<string | null>(null);

  // ── sync panel ──
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncJson, setSyncJson] = useState("");
  const [syncing, setSyncing] = useState(false);

  // ── snackbar ──
  const [snack, setSnack] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  // ── styles ──

  const gradientText = {
    background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };

  // ── fetch ──
  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listKnowledgeSources({
        page,
        limit,
        search: search || undefined,
        type: typeFilter || undefined,
      });
      setSources(res.sources);
      setTotal(res.pagination.total);
    } catch (err: any) {
      setSnack({ msg: err?.response?.data?.message || "Failed to load sources", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, typeFilter]);

  useEffect(() => {
    if (isAdmin) fetchSources();
  }, [fetchSources, isAdmin]);

  // ── create / edit dialog ──
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setTagsRaw("");
    setDialogOpen(true);
  };

  const openEdit = (src: IKnowledgeSource) => {
    setEditTarget(src);
    setForm({
      title: src.title,
      content: "",           // content not returned in list — user must re-enter
      sourceType: src.sourceType,
      sourceUrl: src.sourceUrl || "",
      tags: src.tags || [],
      externalId: src.externalId || "",
    });
    setTagsRaw((src.tags || []).join(", "));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, tags: parseTags(tagsRaw) };
      if (editTarget) {
        await updateKnowledgeSource(editTarget._id, payload);
        setSnack({ msg: "Source updated and re-embedded.", severity: "success" });
      } else {
        await createKnowledgeSource(payload);
        setSnack({ msg: "Source created and embedded.", severity: "success" });
      }
      setDialogOpen(false);
      fetchSources();
    } catch (err: any) {
      setSnack({ msg: err?.response?.data?.message || "Save failed", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ── delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteKnowledgeSource(deleteTarget._id);
      setSnack({ msg: "Source deleted.", severity: "success" });
      setDeleteTarget(null);
      fetchSources();
    } catch (err: any) {
      setSnack({ msg: err?.response?.data?.message || "Delete failed", severity: "error" });
    } finally {
      setDeleting(false);
    }
  };

  // ── reindex ──
  const handleReindex = async (id: string) => {
    setReindexingId(id);
    try {
      const res = await reindexKnowledgeSource(id);
      setSnack({ msg: `Re-indexed — ${res.chunkCount} chunks.`, severity: "success" });
      fetchSources();
    } catch (err: any) {
      setSnack({ msg: err?.response?.data?.message || "Re-index failed", severity: "error" });
    } finally {
      setReindexingId(null);
    }
  };

  // ── sync ──
  const handleSync = async () => {
    setSyncing(true);
    try {
      const parsed = JSON.parse(syncJson);
      const sources: SyncManifestEntry[] = Array.isArray(parsed) ? parsed : parsed.sources;
      const res = await syncKnowledgeManifest(sources);
      setSnack({ msg: `Synced ${res.synced} source(s). Errors: ${res.errors.length}`, severity: "success" });
      setSyncJson("");
      fetchSources();
    } catch (err: any) {
      setSnack({ msg: err?.response?.data?.message || err.message || "Sync failed", severity: "error" });
    } finally {
      setSyncing(false);
    }
  };

  // ─── 403 guard ───────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: theme.palette.background.default,
          color: theme.palette.text.primary,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 5,
            borderRadius: 3,
            textAlign: "center",
            maxWidth: 420,
            backgroundColor: alpha(theme.palette.background.paper, isDark ? 0.75 : 0.92),
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            backdropFilter: "blur(16px)",
          }}
        >
          <LockIcon sx={{ fontSize: 64, color: theme.palette.error.main, mb: 2 }} />
          <Typography variant="h5" fontWeight={800} mb={1}>
            Access Denied
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            This page is restricted to admin users. Contact the repo owner to request access.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/chat")}
            sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
          >
            Back to chat
          </Button>
        </Paper>
      </Box>
    );
  }

  // ─── main UI ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.palette.background.default, color: theme.palette.text.primary }}>
      <Navbar
        onToggleTheme={onToggleTheme}
        darkMode={darkMode}
        activeTitle="Knowledge Manager"
      />
      {/* grid lines */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          opacity: isDark ? 0.1 : 0.04,
        }}
      />

      <Box sx={{ position: "relative", zIndex: 1, maxWidth: 1100, mx: "auto", py: { xs: 4, sm: 6 }, px: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                boxShadow: "0 10px 22px rgba(0,0,0,0.22)",
                flexShrink: 0,
              }}
            >
              <StorageIcon sx={{ color: "#fff", fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={gradientText}>
                Knowledge Manager
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {total} source{total !== 1 ? "s" : ""} · admin only
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/chat")}
              sx={{ textTransform: "none", color: "text.secondary", borderRadius: 2 }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                boxShadow: "0 8px 18px rgba(0,0,0,0.2)",
                "&:hover": { transform: "translateY(-1px)" },
                transition: "transform 0.2s",
              }}
            >
              Add Source
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2.5,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            placeholder="Search title or tags…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 220, flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <MenuItem value="">All</MenuItem>
              {SOURCE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton onClick={() => fetchSources()} size="small" title="Refresh">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Paper>

        {/* Sources Table */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 2.5,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            mb: 2,
            overflow: "hidden",
          }}
        >
          {/* gradient bar */}
          <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main}, ${theme.palette.secondary.main})` }} />
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Title", "Type", "Tags", "Chunks", "Updated", "Actions"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12, color: "text.secondary" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : sources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                    No knowledge sources found.
                  </TableCell>
                </TableRow>
              ) : (
                sources.map((src) => (
                  <TableRow
                    key={src._id}
                    hover
                    sx={{ "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.04) } }}
                  >
                    <TableCell sx={{ fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Tooltip title={src.externalId ? `externalId: ${src.externalId}` : ""}>
                        <span>{src.title}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip label={src.sourceType} size="small" sx={{ fontSize: 11, height: 20 }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {(src.tags || []).slice(0, 3).map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                        ))}
                        {(src.tags?.length || 0) > 3 && (
                          <Chip label={`+${(src.tags?.length || 0) - 3}`} size="small" sx={{ fontSize: 10, height: 18 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{src.chunkCount}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDate(src.updatedAt)}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(src)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Re-index">
                          <IconButton size="small" onClick={() => handleReindex(src._id)} disabled={reindexingId === src._id}>
                            {reindexingId === src._id ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(src)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {total > limit && (
          <Box display="flex" justifyContent="center" gap={1} mb={2}>
            <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} sx={{ textTransform: "none" }}>
              Previous
            </Button>
            <Typography variant="body2" sx={{ alignSelf: "center", color: "text.secondary" }}>
              Page {page} of {Math.ceil(total / limit)}
            </Typography>
            <Button size="small" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)} sx={{ textTransform: "none" }}>
              Next
            </Button>
          </Box>
        )}

        {/* Manifest Sync Panel */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2.5,
            bgcolor: theme.palette.background.paper,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            overflow: "hidden",
          }}
        >
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={2.5}
            py={1.5}
            sx={{ cursor: "pointer" }}
            onClick={() => setSyncOpen((v) => !v)}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <SyncIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
              <Typography fontWeight={700} fontSize={14}>
                Manifest Sync
              </Typography>
            </Box>
            <ExpandMoreIcon
              fontSize="small"
              sx={{
                color: "text.secondary",
                transform: syncOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.25s",
              }}
            />
          </Box>
          <Collapse in={syncOpen}>
            <Divider />
            <Box px={2.5} py={2}>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Paste a JSON array of sources (or <code>{`{ "sources": [...] }`}</code>). Each entry needs{" "}
                <code>externalId</code>, <code>title</code>, <code>content</code>, <code>sourceType</code>.
              </Typography>
              <TextField
                multiline
                minRows={5}
                fullWidth
                placeholder={`[\n  {\n    "externalId": "profile",\n    "title": "My Profile",\n    "content": "...",\n    "sourceType": "bio"\n  }\n]`}
                value={syncJson}
                onChange={(e) => setSyncJson(e.target.value)}
                sx={{ fontFamily: "monospace", mb: 1.5 }}
              />
              <Button
                variant="contained"
                startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
                disabled={syncing || !syncJson.trim()}
                onClick={handleSync}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                  "&:hover": { transform: "translateY(-1px)" },
                  transition: "transform 0.2s",
                }}
              >
                Sync
              </Button>
            </Box>
          </Collapse>
        </Paper>
      </Box>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main})` }} />
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editTarget ? "Edit Source" : "Add Knowledge Source"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField
            label="Title *"
            fullWidth
            size="small"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            label={editTarget ? "Content (leave blank to keep existing)" : "Content *"}
            fullWidth
            multiline
            minRows={5}
            size="small"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Source Type *</InputLabel>
            <Select
              label="Source Type *"
              value={form.sourceType}
              onChange={(e) => setForm({ ...form, sourceType: e.target.value as SourceType })}
            >
              {SOURCE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Source URL"
            fullWidth
            size="small"
            value={form.sourceUrl}
            onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
          />
          <TextField
            label="Tags (comma-separated)"
            fullWidth
            size="small"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="e.g. profile, bio, personal"
          />
          <TextField
            label="External ID"
            fullWidth
            size="small"
            value={form.externalId}
            onChange={(e) => setForm({ ...form, externalId: e.target.value })}
            placeholder="e.g. profile (stable key for upsert)"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.title.trim() || (!editTarget && !form.content.trim())}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
            }}
          >
            {editTarget ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete source?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{deleteTarget?.title}</strong> will be permanently removed from MongoDB, Pinecone, and the Neo4j graph. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <DeleteIcon />}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack !== null}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack?.severity} onClose={() => setSnack(null)} variant="filled" sx={{ borderRadius: 2 }}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default KnowledgeAdmin;
