import type { SxProps, Theme } from "@mui/material";
import { alpha } from "@mui/material/styles";

/** Rounded, brand-consistent styling for auth text fields. */
export const authFieldSx: SxProps<Theme> = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    backgroundColor: "transparent",
  },
};

/** Gradient text used to highlight a word inside an auth heading. */
export const gradientTextSx = (theme: Theme): SxProps<Theme> => ({
  background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
});

/** Primary call-to-action button with the Lumina gradient + lift on hover. */
export const brandButtonSx = (theme: Theme): SxProps<Theme> => ({
  py: 1.25,
  borderRadius: 2,
  fontWeight: 700,
  textTransform: "none",
  fontSize: "1rem",
  background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
  boxShadow: "0 14px 30px rgba(0,0,0,0.25)",
  transition: "transform 0.25s, box-shadow 0.25s",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 18px 36px rgba(0,0,0,0.3)",
  },
  "&.Mui-disabled": {
    background: alpha(theme.palette.primary.main, 0.25),
    color: alpha(theme.palette.common.white, 0.6),
    boxShadow: "none",
  },
});

/** Subtle text-button styling for the navigation links beneath each form. */
export const authLinkSx: SxProps<Theme> = {
  textTransform: "none",
  fontWeight: 600,
  minWidth: "auto",
  px: 0.75,
};
