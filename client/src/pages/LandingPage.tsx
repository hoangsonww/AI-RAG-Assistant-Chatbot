import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Fade,
  Grid,
  Grow,
  Slide,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import SecurityIcon from "@mui/icons-material/Security";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import StorageIcon from "@mui/icons-material/Storage";
import ExtensionIcon from "@mui/icons-material/Extension";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import InsightsIcon from "@mui/icons-material/Insights";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EastIcon from "@mui/icons-material/East";
import CodeIcon from "@mui/icons-material/Code";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import PsychologyIcon from "@mui/icons-material/Psychology";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { motion } from "framer-motion";

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [showHeader, setShowHeader] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowHeader(true), 300);
    return () => clearTimeout(t);
  }, []);

  const iconContainerStyle = {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: `linear-gradient(140deg, ${alpha(
      theme.palette.primary.main,
      0.18,
    )}, ${alpha(theme.palette.info.main, 0.12)})`,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 12px 26px rgba(0,0,0,0.45)"
        : "0 12px 26px rgba(15,23,42,0.12)",
    margin: "1.5rem 0 1rem 1.5rem",
  };

  const cardStyle = {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: alpha(
      theme.palette.background.paper,
      theme.palette.mode === "dark" ? 0.72 : 0.92,
    ),
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    backdropFilter: "blur(16px)",
    color: theme.palette.text.primary,
    transition:
      "transform 0.35s, box-shadow 0.35s, border-color 0.35s",
    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow:
        theme.palette.mode === "dark"
          ? "0 18px 40px rgba(0,0,0,0.45)"
          : "0 20px 45px rgba(15,23,42,0.16)",
      borderColor: alpha(theme.palette.primary.main, 0.5),
    },
    borderRadius: 3,
    overflow: "hidden",
    "& .MuiCardContent-root": {
      padding: "0 24px 24px",
    },
  };

  const accordionStyle = {
    backgroundColor: alpha(
      theme.palette.background.paper,
      theme.palette.mode === "dark" ? 0.6 : 0.92,
    ),
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    borderRadius: 2,
    boxShadow: "none",
    "&:before": { display: "none" },
    mb: 2,
    transition: "transform 0.25s, background 0.25s, border-color 0.25s",
    "&:hover": {
      transform: "translateY(-3px)",
      borderColor: alpha(theme.palette.primary.main, 0.4),
    },
  };

  const stepTextColor =
    theme.palette.mode === "dark"
      ? theme.palette.common.white
      : theme.palette.primary.contrastText;

  const stepBoxStyle = {
    px: 2.2,
    py: 0.65,
    borderRadius: 999,
    fontWeight: "bold",
    whiteSpace: "nowrap",
    background: `linear-gradient(120deg, ${alpha(
      theme.palette.primary.main,
      0.8,
    )}, ${alpha(theme.palette.info.main, 0.75)})`,
    color: stepTextColor,
    transition: "transform 0.3s, box-shadow 0.3s",
    "&:hover": {
      transform: "scale(1.05)",
      boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
    },
  };

  const animatedLinkStyle = {
    color: "inherit",
    textDecoration: "none",
    display: "inline-block",
    transition: "transform 0.3s",
    "&:hover": {
      transform: "scale(1.05)",
      color: "primary.main",
      textDecoration: "underline",
    },
  };

  const animatedLinkStyle1 = {
    ...animatedLinkStyle,
    textDecoration: "underline",
    mt: 4,
  };

  const pipelineSteps = ["Ask", "Retrieve", "Augment", "Generate", "Enjoy"];

  const sectionEyebrowSx = {
    textTransform: "uppercase",
    letterSpacing: "0.3em",
    fontWeight: 600,
    color:
      theme.palette.mode === "dark"
        ? alpha(theme.palette.common.white, 0.75)
        : alpha(theme.palette.text.primary, 0.6),
    display: "block",
    mb: 1,
  };

  const sectionTitleSx = {
    fontWeight: 700,
    mb: 1,
    color: theme.palette.mode === "dark" ? "white" : "black",
  };

  const secondaryTextColor =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.78)
      : theme.palette.text.secondary;

  const heroContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.16, delayChildren: 0.1 },
    },
  };

  const heroItemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const heroBadges = [
    "RAG + Pinecone",
    "LangChain Orchestration",
    "Streaming Replies",
    "Private by Design",
  ];

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const signalCards = [
    {
      title: "Streaming clarity",
      description:
        "Watch answers build live while sources and context stay visible.",
      icon: FlashOnIcon,
    },
    {
      title: "Private by design",
      description:
        "Blend your own knowledge base with trusted general intelligence.",
      icon: SecurityIcon,
    },
    {
      title: "Sharper reasoning",
      description:
        "RAG + vector search keep replies grounded and up to date.",
      icon: InsightsIcon,
    },
    {
      title: "Composable stack",
      description:
        "OpenAPI, modular services, and clean boundaries for teams.",
      icon: ExtensionIcon,
    },
  ];

  const integrationTags = [
    "OpenAPI",
    "React",
    "Node.js",
    "MongoDB",
    "Pinecone",
    "LangChain",
    "Vercel",
    "Docker",
  ];

  const useCases = [
    {
      title: "Launch strategy",
      description:
        "Craft crisp positioning, release plans, and competitive briefs.",
      tags: ["Briefs", "Roadmaps", "Checklists"],
      icon: RocketLaunchIcon,
    },
    {
      title: "Research synthesis",
      description:
        "Turn long docs into clear summaries and action‑ready insights.",
      tags: ["Summaries", "Insights", "Citations"],
      icon: PsychologyIcon,
    },
    {
      title: "Customer support",
      description:
        "Draft helpful replies and FAQ answers with the right tone.",
      tags: ["FAQs", "Tone", "Escalation"],
      icon: SupportAgentIcon,
    },
  ];

  const testimonials = [
    {
      quote:
        "Lumina helped us summarize research faster while keeping the source trail intact.",
      name: "Product Lead",
      role: "Growth Studio",
    },
    {
      quote:
        "The RAG layer makes answers feel grounded — it reads like a real analyst.",
      name: "Engineering Manager",
      role: "SaaS Platform",
    },
    {
      quote:
        "Our team moved from idea to launch plan in a single afternoon.",
      name: "Founder",
      role: "Venture Lab",
    },
  ];

  const stats = [
    {
      value: "1.6s",
      label: "Median first token",
      description: "Streaming answers start fast.",
    },
    {
      value: "98%",
      label: "Context relevance",
      description: "Grounded with retrieval signals.",
    },
    {
      value: "24/7",
      label: "Availability",
      description: "Always on, globally accessible.",
    },
    {
      value: "0 setup",
      label: "Minutes to launch",
      description: "Start chatting in seconds.",
    },
  ];

  const promptGallery = [
    [
      "Draft a go-to-market brief for a new SaaS",
      "Summarize these notes into an agenda",
      "Create a 90-day product roadmap",
      "Explain vector search to a PM",
      "Write a customer success update",
    ],
    [
      "Build a launch checklist with owners",
      "Compare two competitors quickly",
      "Turn research into key insights",
      "Suggest a better onboarding flow",
      "Outline a funding narrative",
    ],
  ];

  const trustPoints = [
    "End-to-end encrypted transport",
    "Scoped access via JWT",
    "Guest mode with local-only history",
    "Knowledge base isolation for privacy",
  ];

  const trustSignals = [
    { title: "Security posture", value: "Encrypted at rest & in transit" },
    { title: "Auth model", value: "JWT access with scoped endpoints" },
    { title: "Data retention", value: "You control saved history" },
  ];

  const glassPanelSx = {
    p: { xs: 2.5, sm: 3 },
    borderRadius: 3,
    backgroundColor: alpha(
      theme.palette.background.paper,
      theme.palette.mode === "dark" ? 0.72 : 0.92,
    ),
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    backdropFilter: "blur(16px)",
    color: theme.palette.text.primary,
    boxShadow:
      theme.palette.mode === "dark"
        ? "0 18px 40px rgba(0,0,0,0.4)"
        : "0 18px 40px rgba(15,23,42,0.12)",
  };

  const tagChipSx = {
    px: 1.2,
    py: 0.4,
    borderRadius: 999,
    fontSize: "0.72rem",
    fontWeight: 600,
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
    color: secondaryTextColor,
  };

  const pageBackground =
    theme.palette.mode === "dark"
      ? `radial-gradient(circle at 12% 18%, ${alpha(
          theme.palette.primary.main,
          0.25,
        )}, transparent 45%),
         radial-gradient(circle at 88% 12%, ${alpha(
           theme.palette.info.main,
           0.22,
         )}, transparent 45%),
         radial-gradient(circle at 70% 75%, ${alpha(
           theme.palette.success.main,
           0.18,
         )}, transparent 45%),
         linear-gradient(180deg, #0b0f1a 0%, #0f172a 45%, #111827 100%)`
      : `radial-gradient(circle at 12% 18%, ${alpha(
          theme.palette.primary.main,
          0.18,
        )}, transparent 45%),
         radial-gradient(circle at 88% 12%, ${alpha(
           theme.palette.info.main,
           0.16,
         )}, transparent 45%),
         radial-gradient(circle at 70% 75%, ${alpha(
           theme.palette.success.main,
           0.14,
         )}, transparent 45%),
         linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #f8fafc 100%)`;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        "@supports (height: 100svh)": {
          minHeight: "100svh",
        },
        background: pageBackground,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
        color: theme.palette.text.primary,
      }}
    >
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            opacity: theme.palette.mode === "dark" ? 0.15 : 0.08,
          }}
        />
        <Box
          component={motion.div}
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            width: { xs: 240, sm: 320, md: 420 },
            height: { xs: 240, sm: 320, md: 420 },
            top: "-12%",
            left: "-6%",
            borderRadius: "50%",
            background: `radial-gradient(circle at 30% 30%, ${alpha(
              theme.palette.primary.main,
              0.35,
            )}, transparent 65%)`,
            filter: "blur(6px)",
            opacity: theme.palette.mode === "dark" ? 0.6 : 0.85,
          }}
        />
        <Box
          component={motion.div}
          animate={{ x: [0, -30, 0], y: [0, 35, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            width: { xs: 260, sm: 360, md: 460 },
            height: { xs: 260, sm: 360, md: 460 },
            bottom: "-18%",
            right: "-8%",
            borderRadius: "50%",
            background: `radial-gradient(circle at 70% 30%, ${alpha(
              theme.palette.info.main,
              0.3,
            )}, transparent 70%)`,
            filter: "blur(10px)",
            opacity: theme.palette.mode === "dark" ? 0.55 : 0.75,
          }}
        />
        <Box
          component={motion.div}
          animate={{ x: [0, 25, 0], y: [0, 20, 0] }}
          transition={{ duration: 36, repeat: Infinity, ease: "easeInOut" }}
          sx={{
            position: "absolute",
            width: { xs: 200, sm: 280, md: 340 },
            height: { xs: 200, sm: 280, md: 340 },
            top: "38%",
            right: "28%",
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 50%, ${alpha(
              theme.palette.success.main,
              0.22,
            )}, transparent 70%)`,
            filter: "blur(12px)",
            opacity: theme.palette.mode === "dark" ? 0.45 : 0.65,
          }}
        />
      </Box>

      <Container
        maxWidth="lg"
        sx={{
          pt: { xs: 6, md: 10 },
          pb: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Grid
          container
          spacing={{ xs: 6, md: 8 }}
          alignItems="center"
        >
          <Grid item xs={12} md={6}>
            <Box
              component={motion.div}
              variants={heroContainerVariants}
              initial="hidden"
              animate={showHeader ? "visible" : "hidden"}
            >
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: "0.32em",
                  fontWeight: 600,
                  color: alpha(theme.palette.text.primary, 0.65),
                  display: "block",
                  mb: 2,
                }}
              >
                LUMINA AI ASSISTANT
              </Typography>
              <Box component={motion.div} variants={heroItemVariants}>
                <Typography
                  variant={isMobile ? "h3" : "h2"}
                  sx={{
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: theme.palette.mode === "dark" ? "white" : "black",
                    mb: 2,
                  }}
                >
                  Ask better questions, get{" "}
                  <Box
                    component="span"
                    sx={{
                      background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    sharper answers
                  </Box>
                  .
                </Typography>
              </Box>
              <Box component={motion.div} variants={heroItemVariants}>
                <Typography
                  variant="subtitle1"
                  color={secondaryTextColor}
                  sx={{ mb: 3, maxWidth: 520 }}
                >
                  Your personalized portal for everything about{" "}
                  <strong>Son&nbsp;(David) Nguyen</strong> and a wide world of
                  knowledge. Lumina blends Retrieval‑Augmented Generation,
                  Pinecone vector search, and LangChain orchestration to deliver
                  context‑rich answers in seconds.
                </Typography>
              </Box>
              <Box
                component={motion.div}
                variants={heroItemVariants}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  mb: 3,
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate("/chat")}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: "bold",
                    background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                    boxShadow: "0 16px 30px rgba(0,0,0,0.25)",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 20px 36px rgba(0,0,0,0.3)",
                    },
                  }}
                >
                  Start Chatting
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate("/signup")}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: "bold",
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                    color: theme.palette.text.primary,
                    transition: "border-color 0.3s, background-color 0.3s",
                    "&:hover": {
                      borderColor: theme.palette.primary.main,
                      backgroundColor: alpha(
                        theme.palette.primary.main,
                        0.08,
                      ),
                    },
                  }}
                >
                  Create Account
                </Button>
              </Box>
              <Box
                component={motion.div}
                variants={heroItemVariants}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                {heroBadges.map((badge) => (
                  <Box
                    key={badge}
                    sx={{
                      px: 1.6,
                      py: 0.6,
                      borderRadius: 999,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      backgroundColor: alpha(
                        theme.palette.background.paper,
                        theme.palette.mode === "dark" ? 0.6 : 0.8,
                      ),
                      border: `1px solid ${alpha(
                        theme.palette.divider,
                        0.6,
                      )}`,
                      color: secondaryTextColor,
                    }}
                  >
                    {badge}
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                position: "relative",
                height: { xs: "auto", md: 460 },
                display: { xs: "grid", md: "block" },
                gap: { xs: 2, sm: 3 },
              }}
            >
              <Box
                sx={{
                  position: { xs: "absolute", md: "absolute" },
                  inset: { xs: "auto", md: "12% 10%" },
                  display: { xs: "none", md: "block" },
                  borderRadius: "50%",
                  border: `1px solid ${alpha(
                    theme.palette.primary.main,
                    0.25,
                  )}`,
                }}
              />
              <Box
                component={motion.div}
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                sx={{
                  position: { xs: "relative", md: "absolute" },
                  top: { md: 0 },
                  left: { md: 0 },
                  right: { md: "18%" },
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 3,
                  backgroundColor: alpha(
                    theme.palette.background.paper,
                    theme.palette.mode === "dark" ? 0.65 : 0.95,
                  ),
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  color: theme.palette.text.primary,
                  boxShadow:
                    theme.palette.mode === "dark"
                      ? "0 18px 40px rgba(0,0,0,0.45)"
                      : "0 20px 44px rgba(15,23,42,0.15)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: "0.2em", color: secondaryTextColor }}
                >
                  Lumina Reply
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mt: 1 }}>
                  “Here&rsquo;s a crisp summary and a next‑step checklist for
                  your launch.”
                </Typography>
                <Typography variant="body2" color={secondaryTextColor} sx={{ mt: 1 }}>
                  Sources: personal knowledge base + curated web context
                </Typography>
              </Box>
              <Box
                component={motion.div}
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                sx={{
                  position: { xs: "relative", md: "absolute" },
                  top: { md: 140 },
                  right: { md: 0 },
                  left: { md: "18%" },
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 3,
                  backgroundColor: alpha(
                    theme.palette.background.paper,
                    theme.palette.mode === "dark" ? 0.6 : 0.92,
                  ),
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  color: theme.palette.text.primary,
                  boxShadow:
                    theme.palette.mode === "dark"
                      ? "0 14px 34px rgba(0,0,0,0.4)"
                      : "0 16px 36px rgba(15,23,42,0.12)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: "0.2em", color: secondaryTextColor }}
                >
                  Retrieval Layer
                </Typography>
                <Box sx={{ display: "grid", gap: 1, mt: 1 }}>
                  {["Pinecone vectors", "Private docs", "Live context"].map(
                    (item) => (
                      <Box
                        key={item}
                        sx={{
                          px: 1.4,
                          py: 0.6,
                          borderRadius: 2,
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.08,
                          ),
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.25,
                          )}`,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                        }}
                      >
                        {item}
                      </Box>
                    ),
                  )}
                </Box>
              </Box>
              <Box
                component={motion.div}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                sx={{
                  position: { xs: "relative", md: "absolute" },
                  bottom: { md: 0 },
                  left: { md: "10%" },
                  right: { md: "22%" },
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 3,
                  backgroundColor: alpha(
                    theme.palette.background.paper,
                    theme.palette.mode === "dark" ? 0.65 : 0.95,
                  ),
                  border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  color: theme.palette.text.primary,
                  boxShadow:
                    theme.palette.mode === "dark"
                      ? "0 16px 38px rgba(0,0,0,0.42)"
                      : "0 18px 38px rgba(15,23,42,0.14)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ letterSpacing: "0.2em", color: secondaryTextColor }}
                >
                  Pipeline
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  {pipelineSteps.map((step) => (
                    <Box
                      key={step}
                      sx={{
                        px: 1.2,
                        py: 0.4,
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        backgroundColor: alpha(
                          theme.palette.info.main,
                          0.12,
                        ),
                        border: `1px solid ${alpha(
                          theme.palette.info.main,
                          0.3,
                        )}`,
                      }}
                    >
                      {step}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

        <Fade in timeout={800}>
          <Box sx={{ mt: { xs: 6, md: 10 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              Momentum
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              A platform that feels instantly ready
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color={secondaryTextColor}
              sx={{ mb: 4, maxWidth: 720, mx: "auto" }}
            >
              Designed to move fast without losing clarity. Every response is
              grounded, traceable, and tuned to your workflow.
            </Typography>

            <Grid
              container
              spacing={3}
              sx={{
                position: "relative",
                zIndex: 1,
                mb: { xs: 3.5, sm: 4 },
              }}
            >
              {signalCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Grid item xs={12} sm={6} md={3} key={card.title}>
                    <Box
                      component={motion.div}
                      variants={fadeUpVariant}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, amount: 0.3 }}
                      sx={{
                        ...glassPanelSx,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.16,
                          ),
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.35,
                          )}`,
                        }}
                      >
                        <Icon
                          sx={{
                            fontSize: 22,
                            color: theme.palette.primary.main,
                          }}
                        />
                      </Box>
                      <Typography variant="h6">{card.title}</Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        {card.description}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Box
              sx={{
                mt: { xs: 4, sm: 5 },
                position: "relative",
                zIndex: 2,
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 1.5,
              }}
            >
              {integrationTags.map((tag) => (
                <Box
                  key={tag}
                  component={motion.div}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  sx={{
                    px: 2,
                    py: 0.7,
                    borderRadius: 999,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    backgroundColor: alpha(
                      theme.palette.background.paper,
                      theme.palette.mode === "dark" ? 0.65 : 0.9,
                    ),
                    border: `1px solid ${alpha(
                      theme.palette.divider,
                      0.6,
                    )}`,
                    color: secondaryTextColor,
                  }}
                >
                  {tag}
                </Box>
              ))}
            </Box>
          </Box>
        </Fade>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 6, md: 8 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              Impact
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              Built for speed and precision
            </Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {stats.map((stat) => (
                <Grid item xs={6} md={3} key={stat.label}>
                  <Box
                    component={motion.div}
                    variants={fadeUpVariant}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    sx={{
                      ...glassPanelSx,
                      textAlign: "left",
                      height: "100%",
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        mb: 0.5,
                        color:
                          theme.palette.mode === "dark" ? "white" : "black",
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="caption" color={secondaryTextColor}>
                      {stat.description}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 8, md: 10 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              Why Lumina
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              Key Features
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color={secondaryTextColor}
              sx={{ mb: 4, maxWidth: 640, mx: "auto" }}
            >
              Experience personalized, secure, and lightning‑fast AI assistance.
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={900}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <ChatBubbleOutlineIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Save Conversations
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Create an account to save and manage chat history
                        effortlessly.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1000}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <FlashOnIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Instant Responses
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Get immediate AI‑generated answers for any query.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1100}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <SecurityIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Secure &amp; Reliable
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        End‑to‑end encrypted chats keep your data private.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 8, md: 12 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              Built For Depth
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              Advanced Capabilities
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color={secondaryTextColor}
              sx={{ mb: 4, maxWidth: 640, mx: "auto" }}
            >
              RAG, Pinecone vector search, and LangChain orchestration combine
              so Lumina can retrieve, reason, and respond with depth.
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={900}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <AutoAwesomeIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        RAG‑Powered Knowledge
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Retrieval‑Augmented Generation enriches every answer
                        with relevant context.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1000}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <StorageIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Pinecone Vector Search
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Blazing‑fast similarity search retrieves the most
                        pertinent information in milliseconds.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1100}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <ExtensionIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        LangChain Orchestration
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Modular chains manage retrieval, reasoning, and
                        generation for seamless AI flows.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 8, md: 12 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              Use Cases
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              Built for real‑world workflows
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color={secondaryTextColor}
              sx={{ mb: 4, maxWidth: 640, mx: "auto" }}
            >
              From launch planning to knowledge synthesis, Lumina adapts to the
              depth and tone each moment needs.
            </Typography>

            <Grid container spacing={3}>
              {useCases.map((useCase) => {
                const Icon = useCase.icon;
                return (
                  <Grid item xs={12} md={4} key={useCase.title}>
                    <Box
                      component={motion.div}
                      variants={fadeUpVariant}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, amount: 0.3 }}
                      whileHover={{ y: -6 }}
                      transition={{ duration: 0.25 }}
                      sx={{
                        ...glassPanelSx,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 2.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: alpha(
                            theme.palette.info.main,
                            0.15,
                          ),
                          border: `1px solid ${alpha(
                            theme.palette.info.main,
                            0.35,
                          )}`,
                        }}
                      >
                        <Icon
                          sx={{
                            fontSize: 26,
                            color: theme.palette.info.main,
                          }}
                        />
                      </Box>
                      <Typography variant="h6">{useCase.title}</Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        {useCase.description}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          mt: "auto",
                        }}
                      >
                        {useCase.tags.map((tag) => (
                          <Box key={tag} sx={tagChipSx}>
                            {tag}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 8, md: 12 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              The Flow
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              How It Works
            </Typography>

            {/* Pipeline badges */}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
                gap: 1.5,
                mb: 4,
              }}
            >
              {pipelineSteps.map((step, idx) => (
                <React.Fragment key={step}>
                  <Box sx={stepBoxStyle}>{step}</Box>
                  {idx !== pipelineSteps.length - 1 && (
                    <EastIcon
                      sx={{
                        fontSize: 24,
                        color: secondaryTextColor,
                        mb: "-2px",
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>

            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Grow in timeout={900}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <TipsAndUpdatesIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent sx={{ textAlign: "left" }}>
                      <Typography variant="h6" gutterBottom>
                        1&nbsp;&nbsp;•&nbsp;&nbsp;Ask Anything
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Pose a question about David Nguyen or any topic.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} md={4}>
                <Grow in timeout={1000}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <InsightsIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent sx={{ textAlign: "left" }}>
                      <Typography variant="h6" gutterBottom>
                        2&nbsp;&nbsp;•&nbsp;&nbsp;Retrieve &amp; Augment
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Lumina fetches relevant context via Pinecone and
                        improves it with RAG.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} md={4}>
                <Grow in timeout={1100}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <FlashOnIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent sx={{ textAlign: "left" }}>
                      <Typography variant="h6" gutterBottom>
                        3&nbsp;&nbsp;•&nbsp;&nbsp;Generate Response
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        A polished answer is crafted and delivered instantly.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 8, md: 12 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              For Builders
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              Developer‑Centric Tools
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color={secondaryTextColor}
              sx={{ mb: 4, maxWidth: 640, mx: "auto" }}
            >
              OpenAPI‑first design, containerized deployment, and modular
              architecture make Lumina easy to extend and integrate.
            </Typography>

            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={900}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <CodeIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        OpenAPI &amp; Swagger
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Auto‑generated docs and client SDKs with the included
                        OpenAPI spec and Swagger UI.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1000}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <CloudDoneIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Dockerized Deployment
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Spin up the entire stack locally or in production with a
                        single <code>docker‑compose up</code>.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Grow in timeout={1100}>
                  <Card elevation={0} sx={cardStyle}>
                    <Box sx={iconContainerStyle}>
                      <BuildCircleIcon
                        sx={{ fontSize: 28, color: theme.palette.primary.main }}
                      />
                    </Box>
                    <CardContent>
                      <Typography gutterBottom variant="h6">
                        Modular Monorepo
                      </Typography>
                      <Typography variant="body2" color={secondaryTextColor}>
                        Cleanly separated frontend, backend, and ML modules
                        streamline contributions and testing.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 8, md: 12 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              Trust Layer
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              Built to keep your data confident
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color={secondaryTextColor}
              sx={{ mb: 4, maxWidth: 640, mx: "auto" }}
            >
              Lumina is designed to keep your answers grounded and your data
              protected.
            </Typography>

            <Grid container spacing={3} alignItems="stretch">
              <Grid item xs={12} md={6}>
                <Box
                  component={motion.div}
                  variants={fadeUpVariant}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  sx={{
                    ...glassPanelSx,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <Typography variant="h6">Privacy, by default</Typography>
                  <Typography variant="body2" color={secondaryTextColor}>
                    Built with encrypted transport, scoped authentication, and
                    clear retention controls for both guest and account users.
                  </Typography>
                  <Box sx={{ display: "grid", gap: 1 }}>
                    {trustPoints.map((point) => (
                      <Box
                        key={point}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          p: 1,
                          borderRadius: 2,
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.08,
                          ),
                          border: `1px solid ${alpha(
                            theme.palette.primary.main,
                            0.22,
                          )}`,
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: theme.palette.primary.main,
                          }}
                        />
                        <Typography variant="body2">{point}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  component={motion.div}
                  variants={fadeUpVariant}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  sx={{
                    ...glassPanelSx,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <Typography variant="h6">Operational reliability</Typography>
                  <Typography variant="body2" color={secondaryTextColor}>
                    Stay confident with clear guardrails and transparent
                    handling of data across environments.
                  </Typography>
                  <Box sx={{ display: "grid", gap: 1.5 }}>
                    {trustSignals.map((signal) => (
                      <Box
                        key={signal.title}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: alpha(
                            theme.palette.background.paper,
                            theme.palette.mode === "dark" ? 0.4 : 0.9,
                          ),
                          border: `1px solid ${alpha(
                            theme.palette.divider,
                            0.6,
                          )}`,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {signal.title}
                        </Typography>
                        <Typography variant="caption" color={secondaryTextColor}>
                          {signal.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 8, md: 12 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              Community Notes
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              Loved by builders and operators
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color={secondaryTextColor}
              sx={{ mb: 4, maxWidth: 640, mx: "auto" }}
            >
              Teams use Lumina to move faster without sacrificing context.
            </Typography>

            <Grid container spacing={3}>
              {testimonials.map((item, index) => (
                <Grid item xs={12} md={4} key={`${item.name}-${index}`}>
                  <Box
                    component={motion.div}
                    variants={fadeUpVariant}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.25 }}
                    sx={{
                      ...glassPanelSx,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 46,
                        height: 4,
                        borderRadius: 999,
                        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
                      }}
                    />
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      “{item.quote}”
                    </Typography>
                    <Box sx={{ mt: "auto" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color={secondaryTextColor}>
                        {item.role}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 8, md: 12 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              Prompt Gallery
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              Start anywhere, keep the momentum
            </Typography>
            <Typography
              variant="subtitle1"
              align="center"
              color={secondaryTextColor}
              sx={{ mb: 4, maxWidth: 640, mx: "auto" }}
            >
              Explore sample prompts that showcase how teams use Lumina daily.
            </Typography>

            {promptGallery.map((row, rowIndex) => {
              const marqueeItems = [...row, ...row];
              const isLeft = rowIndex % 2 === 0;
              return (
                <Box
                  key={`prompt-row-${rowIndex}`}
                  sx={{
                    overflow: "hidden",
                    width: "100%",
                    mt: rowIndex === 0 ? 0 : { xs: 1.5, sm: 2 },
                    maskImage:
                      "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
                  }}
                >
                  <Box
                    component={motion.div}
                    animate={{
                      x: isLeft ? ["0%", "-50%"] : ["-50%", "0%"],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: isLeft ? 26 : 30,
                      ease: "linear",
                    }}
                    sx={{
                      display: "flex",
                      gap: { xs: 1.2, sm: 1.6 },
                      width: "max-content",
                      py: { xs: 0.6, sm: 0.9 },
                    }}
                  >
                    {marqueeItems.map((prompt, idx) => (
                      <Box
                        key={`${prompt}-${idx}`}
                        component={motion.div}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.2 }}
                        sx={{
                          flex: "0 0 auto",
                          borderRadius: 999,
                          border: `1px solid ${alpha(
                            theme.palette.divider,
                            0.6,
                          )}`,
                          backgroundColor: alpha(
                            theme.palette.background.paper,
                            theme.palette.mode === "dark" ? 0.55 : 0.9,
                          ),
                          px: { xs: 1.6, sm: 2.2 },
                          py: { xs: 0.8, sm: 1 },
                          boxShadow:
                            theme.palette.mode === "dark"
                              ? "0 8px 20px rgba(0,0,0,0.35)"
                              : "0 10px 24px rgba(15,23,42,0.1)",
                          fontSize: { xs: "0.8rem", sm: "0.9rem" },
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {prompt}
                      </Box>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Slide>

        <Slide in timeout={800} direction="up">
          <Box sx={{ mt: { xs: 8, md: 12 } }}>
            <Typography variant="overline" align="center" sx={sectionEyebrowSx}>
              Quick Answers
            </Typography>
            <Typography
              variant="h4"
              align="center"
              gutterBottom
              sx={sectionTitleSx}
            >
              Frequently Asked Questions
            </Typography>

            <Box sx={{ maxWidth: 900, mx: "auto", mt: 4 }}>
              {/* Q1 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    How does Lumina differ from ChatGPT or Bard?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color={secondaryTextColor}>
                    Lumina is hyper‑focused on David Nguyen and leverages a
                    bespoke knowledge base plus RAG, Pinecone, and LangChain to
                    tailor answers. You still get general knowledge, but with
                    personalized context and saved conversations.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q2 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Can I use Lumina without creating an account?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color={secondaryTextColor}>
                    Absolutely! Choose “Continue as Guest” to chat instantly.
                    Note that guest chats are not stored once you leave.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q3 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Is my data secure?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color={secondaryTextColor}>
                    Yes. Conversations are encrypted in transit and at rest.
                    Auth‑only data is stored securely in MongoDB with JWT‑based
                    access controls.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q4 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    How can I contribute to Lumina?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color={secondaryTextColor}>
                    Lumina is open source! Check out the{" "}
                    <Box
                      component="a"
                      href="https://github.com/hoangsonww/AI-RAG-Assistant-Chatbot"
                      sx={{
                        textDecoration: "underline",
                        color: "primary.main",
                      }}
                    >
                      GitHub repository
                    </Box>{" "}
                    to report issues, suggest features, or submit pull requests.
                    We welcome contributions from the community.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q5 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    What technologies power Lumina?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color={secondaryTextColor}>
                    Lumina is built with a modern stack including{" "}
                    <strong>React</strong> for the frontend,{" "}
                    <strong>Node.js</strong> and <strong>Express</strong> for
                    the backend, <strong>MongoDB</strong> for data storage,{" "}
                    <strong>Pinecone</strong> for vector search,{" "}
                    <strong>LangChain</strong> for orchestration, and more!
                  </Typography>
                </AccordionDetails>
              </Accordion>

              {/* Q6 */}
              <Accordion sx={accordionStyle}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    What can I do with Lumina?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color={secondaryTextColor}>
                    You can ask Lumina about David Nguyen, his work, or any
                    general knowledge topic. It&rsquo;s designed to provide
                    personalized, context‑rich answers and save your chat
                    history for future reference. You can also use it as a
                    general AI assistant for various tasks, from answering
                    questions to providing recommendations. Feel free to create
                    an account to save your conversations and conveniently
                    access them later!
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          </Box>
        </Slide>

        <Fade in timeout={800}>
          <Box
            sx={{
              mt: { xs: 8, md: 12 },
              mb: { xs: 6, md: 8 },
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              borderRadius: 4,
              px: { xs: 3, sm: 6 },
              py: { xs: 6, sm: 7 },
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.18,
              )}, ${alpha(theme.palette.info.main, 0.18)})`,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 24px 50px rgba(0,0,0,0.45)"
                  : "0 24px 50px rgba(15,23,42,0.14)",
            }}
          >
            <Box
              component={motion.div}
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              sx={{
                position: "absolute",
                width: 260,
                height: 260,
                borderRadius: "50%",
                top: "-15%",
                left: "-10%",
                background: `radial-gradient(circle, ${alpha(
                  theme.palette.primary.main,
                  0.35,
                )}, transparent 70%)`,
                opacity: 0.7,
              }}
            />
            <Box
              component={motion.div}
              animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              sx={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: "50%",
                bottom: "-20%",
                right: "-8%",
                background: `radial-gradient(circle, ${alpha(
                  theme.palette.info.main,
                  0.3,
                )}, transparent 70%)`,
                opacity: 0.65,
              }}
            />
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Typography variant="overline" sx={sectionEyebrowSx}>
                Get Started
              </Typography>
              <Typography variant="h4" gutterBottom sx={sectionTitleSx}>
                Get Started Now
              </Typography>
              <Typography
                variant="subtitle1"
                color={secondaryTextColor}
                sx={{ mb: 4 }}
              >
                Create an account to save conversations or jump right in as a
                guest.
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={() => navigate("/signup")}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: "bold",
                    borderRadius: 2,
                    transition: "transform 0.3s",
                    "&:hover": { transform: "translateY(-4px) scale(1.05)" },
                  }}
                >
                  Create Account
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={() => navigate("/chat")}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: "bold",
                    borderRadius: 2,
                    transition: "transform 0.3s",
                    "&:hover": { transform: "translateY(-4px) scale(1.05)" },
                  }}
                >
                  Continue as Guest
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  onClick={() =>
                    (window.location.href =
                      "https://github.com/hoangsonww/AI-RAG-Assistant-Chatbot")
                  }
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontWeight: "bold",
                    borderRadius: 2,
                    borderStyle: "dashed",
                    transition: "transform 0.3s",
                    "&:hover": { transform: "translateY(-4px) scale(1.05)" },
                  }}
                >
                  GitHub Repository
                </Button>
              </Box>

              <Typography variant="subtitle1" color={secondaryTextColor}>
                <Box component="a" href="/terms" sx={animatedLinkStyle1}>
                  Terms of Service
                </Box>
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Container>

      <Box
        component="footer"
        sx={{
          py: 2,
          backgroundColor: alpha(
            theme.palette.background.paper,
            theme.palette.mode === "dark" ? 0.7 : 0.95,
          ),
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          textAlign: "center",
          mt: 0,
        }}
      >
        <Typography variant="body1" color={secondaryTextColor}>
          © {new Date().getFullYear()}{" "}
          <Box
            component="a"
            href="https://sonnguyenhoang.com"
            sx={animatedLinkStyle}
          >
            David Nguyen&rsquo;s
          </Box>{" "}
          AI Assistant. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default LandingPage;
