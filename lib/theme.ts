import { createTheme, useTheme, type Theme } from "@mui/material/styles";
import type { StatusColorKey, ThemeMode } from "./types";

/**
 * Converge Projects theme — supports both a dark navy ground (the
 * original look, still the default) and a standard light/white theme,
 * switched via the navbar toggle (see AppContext's `mode`). Status
 * colors (green/amber/red/slate/violet) are semantic and kept separate
 * from the brand accent.
 *
 * Two status-hex maps exist because the dark-mode values are bright,
 * high-chroma colors chosen to pop against a dark ground — used
 * directly as *text* color on a translucent tint of themselves (see
 * StatusChip), those same values have poor contrast on a white page.
 * The light-mode map darkens/saturates each hue enough to stay legible
 * on white while keeping the same color identity. Components read the
 * active map via `useStatusHex()` rather than importing a static
 * object, so status colors follow the current theme mode.
 */
export const STATUS_HEX_DARK: Record<StatusColorKey, string> = {
  green: "#4cae7d",
  amber: "#f0a93a",
  red: "#e5615a",
  slate: "#5b6a7d",
  violet: "#9d7fe0",
};

export const STATUS_HEX_LIGHT: Record<StatusColorKey, string> = {
  green: "#1f8a57",
  amber: "#9a5b00",
  red: "#c53a34",
  slate: "#4d5b70",
  violet: "#6c3fc0",
};

/** @deprecated prefer `useStatusHex()` inside components so colors follow theme mode. Kept as the dark map for any non-component callers. */
export const STATUS_HEX = STATUS_HEX_DARK;

export function useStatusHex(): Record<StatusColorKey, string> {
  const theme = useTheme();
  return theme.palette.mode === "light" ? STATUS_HEX_LIGHT : STATUS_HEX_DARK;
}

const typography = {
  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  h1: { fontFamily: '"Space Grotesk", "Inter", sans-serif' },
  h2: { fontFamily: '"Space Grotesk", "Inter", sans-serif' },
  h3: { fontFamily: '"Space Grotesk", "Inter", sans-serif' },
  h4: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
  h5: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
  h6: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
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
      primary: { main: "#0f7f91", light: "#2fb3c7", dark: "#0a5b68", contrastText: "#ffffff" },
      secondary: { main: "#3f6fb0" },
      background: { default: "#f3f5f7", paper: "#ffffff" },
      text: { primary: "#1a2027", secondary: "#5c6673" },
      divider: "#e1e5ea",
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

export default createAppTheme("dark");
