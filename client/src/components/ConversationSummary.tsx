import React, { useState } from "react";
import {
  Box,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Chip,
  Alert,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SummarizeIcon from "@mui/icons-material/Summarize";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import { generateConversationSummary } from "../services/api";
import { ISummary } from "../types/conversation";

interface ConversationSummaryProps {
  conversationId: string | null;
  existingSummary?: ISummary;
  onSummaryGenerated?: (summary: ISummary) => void;
}

const ConversationSummary: React.FC<ConversationSummaryProps> = ({
  conversationId,
  existingSummary,
  onSummaryGenerated,
}) => {
  const theme = useTheme();
  const [summary, setSummary] = useState<ISummary | undefined>(
    existingSummary,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleGenerateSummary = async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await generateConversationSummary(conversationId);
      const newSummary: ISummary = {
        summary: result.summary,
        highlights: result.highlights,
        actionItems: result.actionItems,
        generatedAt: new Date(result.generatedAt),
      };
      setSummary(newSummary);
      setExpanded(true);
      if (onSummaryGenerated) {
        onSummaryGenerated(newSummary);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const exportToMarkdown = () => {
    if (!summary) return;

    let markdown = `# Conversation Summary\n\n`;
    markdown += `**Generated:** ${new Date(summary.generatedAt).toLocaleString()}\n\n`;
    markdown += `## Summary\n\n${summary.summary}\n\n`;

    if (summary.highlights.length > 0) {
      markdown += `## Key Highlights\n\n`;
      summary.highlights.forEach((highlight) => {
        markdown += `- ${highlight}\n`;
      });
      markdown += `\n`;
    }

    if (summary.actionItems.length > 0) {
      markdown += `## Action Items\n\n`;
      summary.actionItems.forEach((item) => {
        markdown += `- [ ] ${item}\n`;
      });
    }

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-summary-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!conversationId) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      {!summary ? (
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={20} /> : <SummarizeIcon />}
            onClick={handleGenerateSummary}
            disabled={loading}
            sx={{
              textTransform: "none",
              borderRadius: 2,
            }}
          >
            {loading ? "Generating Summary..." : "Generate Conversation Summary"}
          </Button>
        </Box>
      ) : (
        <Accordion
          expanded={expanded}
          onChange={(_, isExpanded) => setExpanded(isExpanded)}
          sx={{
            backgroundColor: theme.palette.mode === "dark" ? "#1e1e1e" : "#f5f5f5",
            borderRadius: 2,
            "&:before": {
              display: "none",
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              backgroundColor: theme.palette.mode === "dark" ? "#2a2a2a" : "#e0e0e0",
              borderRadius: expanded ? "8px 8px 0 0" : 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={1} width="100%">
              <SummarizeIcon color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">
                Conversation Summary
              </Typography>
              <Box flexGrow={1} />
              <Tooltip title="Regenerate Summary">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateSummary();
                  }}
                  disabled={loading}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export as Markdown">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportToMarkdown();
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography
                variant="caption"
                color="textSecondary"
                display="block"
                mb={2}
              >
                Generated {new Date(summary.generatedAt).toLocaleString()}
              </Typography>

              <Typography variant="body1" paragraph>
                {summary.summary}
              </Typography>

              {summary.highlights.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Key Highlights
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {summary.highlights.map((highlight, idx) => (
                      <Chip
                        key={idx}
                        label={highlight}
                        variant="outlined"
                        color="primary"
                        sx={{
                          justifyContent: "flex-start",
                          height: "auto",
                          padding: "8px",
                          "& .MuiChip-label": {
                            whiteSpace: "normal",
                            textAlign: "left",
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {summary.actionItems.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Action Items
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {summary.actionItems.map((item, idx) => (
                      <Chip
                        key={idx}
                        label={item}
                        variant="outlined"
                        color="secondary"
                        sx={{
                          justifyContent: "flex-start",
                          height: "auto",
                          padding: "8px",
                          "& .MuiChip-label": {
                            whiteSpace: "normal",
                            textAlign: "left",
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ConversationSummary;
