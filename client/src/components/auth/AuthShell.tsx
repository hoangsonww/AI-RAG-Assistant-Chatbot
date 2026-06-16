import React from "react";
import { Box, Container, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { gradientTextSx } from "./styles";

const LuminaScene = React.lazy(() => import("../three/LuminaScene"));

interface AuthShellProps {
  /** Small uppercase label above the title. */
  readonly eyebrow: string;
  /** Page heading (may include a gradient-highlighted span). */
  readonly title: React.ReactNode;
  /** Supporting copy under the title. */
  readonly subtitle: React.ReactNode;
  /** Form content. */
  readonly children: React.ReactNode;
  /** Navigation links rendered beneath the form. */
  readonly footer?: React.ReactNode;
}

/**
 * Shared branded layout for the auth surfaces (login, signup, reset). Renders
 * the Lumina 3D atmosphere behind a frosted glass card with a branded header,
 * matching the landing page's visual language and adapting to the active theme.
 */
const AuthShell: React.FC<AuthShellProps> = ({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDark = theme.palette.mode === "dark";

  const pageBackground = isDark
    ? `radial-gradient(circle at 15% 20%, ${alpha(
        theme.palette.primary.main,
        0.25,
      )}, transparent 45%),
       radial-gradient(circle at 85% 15%, ${alpha(
         theme.palette.info.main,
         0.22,
       )}, transparent 45%),
       linear-gradient(180deg, #0b0f1a 0%, #0f172a 50%, #111827 100%)`
    : `radial-gradient(circle at 15% 20%, ${alpha(
        theme.palette.primary.main,
        0.16,
      )}, transparent 45%),
       radial-gradient(circle at 85% 15%, ${alpha(
         theme.palette.info.main,
         0.14,
       )}, transparent 45%),
       linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)`;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        "@supports (height: 100svh)": { minHeight: "100svh" },
        background: pageBackground,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
        color: theme.palette.text.primary,
      }}
    >
      {/* Ambient 3D atmosphere + grid texture (behind everything). */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <React.Suspense fallback={null}>
          <LuminaScene
            mode={isDark ? "dark" : "light"}
            colorA={theme.palette.primary.main}
            colorB={theme.palette.info.main}
            colorC={theme.palette.secondary.main}
          />
        </React.Suspense>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            opacity: isDark ? 0.15 : 0.07,
          }}
        />
      </Box>

      {/* Brand mark — returns to landing. */}
      <Box
        component={motion.button}
        type="button"
        onClick={() => navigate("/")}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        sx={{
          position: "absolute",
          top: { xs: 16, sm: 24 },
          left: { xs: 16, sm: 24 },
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          p: 0.5,
        }}
        aria-label="Go to Lumina home"
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
            boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 20, color: "#fff" }} />
        </Box>
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, ...gradientTextSx(theme) }}
        >
          Lumina
        </Typography>
      </Box>

      {/* Centered glass card. */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
          px: 2,
          py: { xs: 10, sm: 6 },
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            sx={{
              maxWidth: 440,
              mx: "auto",
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              position: "relative",
              overflow: "hidden",
              backgroundColor: alpha(
                theme.palette.background.paper,
                isDark ? 0.72 : 0.9,
              ),
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              backdropFilter: "blur(18px)",
              boxShadow: isDark
                ? "0 30px 60px rgba(0,0,0,0.5)"
                : "0 30px 60px rgba(15,23,42,0.16)",
            }}
          >
            {/* Gradient accent line along the top edge. */}
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

            <Typography
              variant="overline"
              sx={{
                letterSpacing: "0.28em",
                fontWeight: 700,
                color: alpha(theme.palette.text.primary, 0.6),
                display: "block",
                mb: 1,
              }}
            >
              {eyebrow}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                lineHeight: 1.15,
                mb: 1,
                color: isDark ? "#fff" : "#0f172a",
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.secondary, mb: 3 }}
            >
              {subtitle}
            </Typography>

            {children}

            {footer && (
              <Box
                sx={{
                  mt: 3,
                  pt: 2.5,
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                  display: "grid",
                  gap: 0.5,
                }}
              >
                {footer}
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default AuthShell;
