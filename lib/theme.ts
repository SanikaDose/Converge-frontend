import { createTheme, useTheme, type Theme } from "@mui/material/styles";
import type { StatusColorKey, ThemeMode } from "./types";

/**
 * Semantic status colors. Two maps because the dark values are bright hues
 * tuned to pop on a dark ground when used as text on a tint of themselves;
 * on white they fail contrast, so the light map darkens each hue. Components
 * read the active one via `useStatusHex()`.
 */
export const STATUS_HEX_DARK: Record<StatusColorKey, string> = {
  green: "#4cae7d",
  amber: "#f0a93a",
  red: "#e5615a",
  slate: "#5b6a7d",
  violet: "#9d7fe0",
  orange: "#e0813f",
};

export const STATUS_HEX_LIGHT: Record<StatusColorKey, string> = {
  green: "#1f8a57",
  amber: "#9a5b00",
  red: "#c53a34",
  slate: "#4d5b70",
  violet: "#6c3fc0",
  orange: "#b45309",
};

/** @deprecated prefer `useStatusHex()` inside components so colors follow theme mode. Kept as the dark map for any non-component callers. */
export const STATUS_HEX = STATUS_HEX_DARK;

/**
 * Vivid, saturated hues for solid fills — dashboard KPI icons, the status
 * donut, project-card accents. Separate from STATUS_HEX (which is tuned for
 * text-on-tint) and mode-independent.
 */
export const DASHBOARD_COLORS = {
  blue: "#3958D6",   // matches LIGHT_THEME primary.main — the app-wide brand blue
  green: "#228B22",  // deep forest green for healthy/on-track/completed
  amber: "#F59E0B",
  orange: "#F97316",
  red: "#EF4444",
  violet: "#8B5CF6",
  slate: "#9CA3AF",
} as const;

export function useStatusHex(): Record<StatusColorKey, string> {
  const theme = useTheme();
  return theme.palette.mode === "light" ? STATUS_HEX_LIGHT : STATUS_HEX_DARK;
}

// Native system font per platform — this app loads no webfont, so naming one
// (e.g. "Inter") would just fall through the stack inconsistently.
const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const typography = {
  fontFamily: SYSTEM_FONT_STACK,
  h4: { fontWeight: 600 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  button: { textTransform: "none" as const, fontWeight: 600 },
};

const components = {
  MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  MuiAppBar: { styleOverrides: { root: { backgroundImage: "none" } } },
  MuiButton: { styleOverrides: { root: { borderRadius: 8 } } },
  MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
};

export function createAppTheme(mode: ThemeMode): Theme {
  const isLight = mode === "light";
  return createTheme({
    palette: isLight ? {
      mode,
      primary: { main: "#3958D6", light: "#6C86E8", dark: "#25409E", contrastText: "#ffffff" },
      secondary: { main: "#3f6fb0" },
      background: { default: "#f5f7fb", paper: "#ffffff" },
      text: { primary: "#1a2027", secondary: "#5c6673" },
      divider: "#e3e7ee",
      success: { main: STATUS_HEX_LIGHT.green },
      warning: { main: STATUS_HEX_LIGHT.amber },
      error: { main: STATUS_HEX_LIGHT.red },
      info: { main: "#3f6fb0" },
    } : {
      mode,
      primary: { main: "#2fb3c7", light: "#6fd6e6", dark: "#1c7f8f", contrastText: "#04222a" },
      secondary: { main: "#3f6fb0" },
      background: { default: "#12161c", paper: "#1b212b" },
      text: { primary: "#e8ebee", secondary: "#8b94a3" },
      divider: "#2a323d",
      success: { main: STATUS_HEX_DARK.green },
      warning: { main: STATUS_HEX_DARK.amber },
      error: { main: STATUS_HEX_DARK.red },
      info: { main: "#3f6fb0" },
    },
    shape: { borderRadius: 10 },
    typography,
    components,
  });
}

// Fixed light theme for surfaces carrying a white-backed brand asset (login
// card, navbar logo) so the asset never shows a stray white rectangle in dark mode.
export const LIGHT_THEME = createAppTheme("light");

export default createAppTheme("dark");
