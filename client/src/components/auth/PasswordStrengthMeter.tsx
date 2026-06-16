import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

interface PasswordStrengthMeterProps {
  readonly password: string;
}

const LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"] as const;

/** Rates a password 0–4 based on length and character-class diversity. */
function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4);
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
}) => {
  const theme = useTheme();
  const score = useMemo(() => scorePassword(password), [password]);

  if (!password) return null;

  const color =
    score <= 1
      ? theme.palette.error.main
      : score === 2
        ? theme.palette.warning.main
        : score === 3
          ? theme.palette.info.main
          : theme.palette.success.main;

  return (
    <Box sx={{ mt: 1.25 }} aria-live="polite">
      <Box sx={{ display: "flex", gap: 0.5 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              height: 4,
              flex: 1,
              borderRadius: 999,
              backgroundColor:
                i < score ? color : alpha(theme.palette.text.primary, 0.14),
              transition: "background-color 0.3s",
            }}
          />
        ))}
      </Box>
      <Typography
        variant="caption"
        sx={{ color, fontWeight: 600, mt: 0.5, display: "block" }}
      >
        Password strength: {LABELS[score]}
      </Typography>
    </Box>
  );
};

export default PasswordStrengthMeter;
