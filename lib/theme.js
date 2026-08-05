import { createTheme } from "@mui/material/styles";

/**
 * Converge Projects theme. Blue/teal primary (matching the logo), dark
 * navy ground carried over from the original build (this app is used
 * for long dashboard sessions — a dark, low-glare surface was a
 * deliberate prior choice, not something this rebrand should undo).
 * Status colors (green/amber/red/slate) are semantic and kept separate
 * from the brand accent, plus a "violet" added for Pending Approval so
 * it reads distinctly from both amber (in progress) and red (delayed).
 */
export const STATUS_HEX = {
  green: "#4cae7d",
  amber: "#f0a93a",
  red: "#e5615a",
  slate: "#5b6a7d",
  violet: "#9d7fe0",
};

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#2fb3c7", light: "#6fd6e6", dark: "#1c7f8f", contrastText: "#04222a" },
    secondary: { main: "#3f6fb0" },
    background: { default: "#12161c", paper: "#1b212b" },
    text: { primary: "#e8ebee", secondary: "#8b94a3" },
    divider: "#2a323d",
    success: { main: STATUS_HEX.green },
    warning: { main: STATUS_HEX.amber },
    error: { main: STATUS_HEX.red },
    info: { main: "#3f6fb0" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    h1: { fontFamily: '"Space Grotesk", "Inter", sans-serif' },
    h2: { fontFamily: '"Space Grotesk", "Inter", sans-serif' },
    h3: { fontFamily: '"Space Grotesk", "Inter", sans-serif' },
    h4: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Space Grotesk", "Inter", sans-serif', fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiAppBar: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});

export default theme;
