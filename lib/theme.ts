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

/**
 * Vivid, chart-appropriate hues for the dashboard's KPI icons, "Projects
 * by Status" donut, project-card accents, and the Upcoming Deadlines
 * widget — deliberately separate from STATUS_HEX above. STATUS_HEX is
 * tuned to work as *text* color on a translucent tint of itself, which
 * comes out muted/brownish for that purpose; these are meant purely as
 * solid fills/icons/badges, so they stay saturated and are used as-is in
 * both theme modes (no light/dark split needed).
 */
export const DASHBOARD_COLORS = {
  // Matches LIGHT_THEME's primary.main — the same blue the login card's
  // focused fields use — so the "Active Projects" KPI icon, the New
  // project/Raise ticket buttons, and the active navbar tab all read as
  // one consistent brand blue instead of drifting per-component.
  blue: "#3958D6",
  // Forest green rather than a brighter emerald/lime — the deliberately
  // deeper shade requested for every "healthy/on-track/completed" status
  // use (donut, KPI cards, project-card "On track" chip all read this).
  green: "#228B22",
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

// Standard system font stack — every platform resolves this to its own
// native UI font (San Francisco on macOS, Segoe UI on Windows, Roboto on
// Android/Chrome OS) instead of a webfont this app never actually loads
// (no <link>/next/font for "Inter"/"Space Grotesk"/"IBM Plex Mono", so
// those names were silently falling through to whatever's next in the
// stack anyway — inconsistent across machines and the source of the
// "blurry" look: a requested-but-missing family can trigger the browser's
// synthetic bold/italic rendering instead of real glyphs).
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

// Fixed light theme for surfaces that carry a fixed-color brand asset and
// therefore shouldn't follow the app-wide dark/light toggle — the login
// card and the navbar's white-backed Converge logo both need this so their
// asset's baked-in white background always sits on a matching surface
// instead of showing as a stray white rectangle in dark mode.
export const LIGHT_THEME = createAppTheme("light");

export default createAppTheme("dark");
