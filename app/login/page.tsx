"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "@/lib/theme";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Image from "next/image";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { ConvergeLogo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

const NAVY_GRADIENT = "linear-gradient(150deg, #0F172A 0%, #1E3A5F 100%)";

// The reference is a fixed navy/white brand screen, not something that
// should flip to a dark-on-dark card just because the last signed-in user
// happened to leave the app in dark mode — that would wash out the
// diagonal navy/white split entirely. Pinned to "light" regardless of the
// app's stored theme preference.
const LOGIN_THEME = createAppTheme("light");

/**
 * Sign-in screen — split card (brand panel / form panel) modelled on the
 * supplied reference. Rendered outside AppShell (see components/AuthGate)
 * so there's no navbar behind it.
 */
export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !employeeCode.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(employeeCode, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Box sx={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2,
      bgcolor: "background.default",
      // Faint dot field, echoing the reference's dotted world map without
      // shipping an image asset for it.
      backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
      backgroundSize: "22px 22px",
      color: (t) => t.palette.mode === "light" ? "rgba(79,110,247,0.13)" : "rgba(111,214,230,0.07)",
    }}>
      <ThemeProvider theme={LOGIN_THEME}>
      <Paper elevation={0} sx={{
        display: "flex", width: "100%", maxWidth: 1180, minHeight: 640, overflow: "hidden",
        borderRadius: 2, border: "1px solid", borderColor: "divider",
        boxShadow: "0 12px 40px rgba(16,24,40,0.12), 0 2px 8px rgba(16,24,40,0.06)",
      }}>
        {/* Brand panel — hidden on narrow screens so the form gets the full width. */}
        <Box sx={{
          display: { xs: "none", md: "flex" }, flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 2.5,
          width: "56%", flexShrink: 0, p: 5, background: NAVY_GRADIENT,
          // Diagonal right edge (forward-slash cut, wider at top), as in
          // the reference — steep enough to read clearly as a "/" rather
          // than a near-vertical seam.
          clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)",
        }}>
          <Image
            src="/Elansol-logo.png" alt="Elansol Technologies" width={1887} height={668}
            style={{ width: "62%", height: "auto", marginRight: "8%" }}
            priority
          />
        </Box>

        {/* Form panel */}
        <Box component="form" onSubmit={submit} sx={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
          px: { xs: 4, sm: 8 }, py: 6, bgcolor: "background.paper",
        }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 5 }}>
            <ConvergeLogo height={140} />
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

          <TextField
            label="Employee ID" fullWidth required autoFocus autoComplete="username" size="medium"
            value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)}
            placeholder="e.g. SD003" disabled={busy} sx={{ mb: 3, "& .MuiInputBase-input": { py: 1.85 } }}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <BadgeOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            label="Password" fullWidth required autoComplete="current-password" size="medium"
            type={showPassword ? "text" : "password"}
            value={password} onChange={(e) => setPassword(e.target.value)}
            disabled={busy} sx={{ mb: 4, "& .MuiInputBase-input": { py: 1.85 } }}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small" edge="end" onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      sx={{ color: "text.secondary" }}
                    >
                      {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            type="submit" variant="contained" fullWidth size="large"
            disabled={busy || !employeeCode.trim() || !password}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              py: 1.7, letterSpacing: 1.2, textTransform: "uppercase", fontSize: 14.5,
              background: NAVY_GRADIENT, color: "#fff",
              "&:hover": { background: "linear-gradient(150deg, #16213c 0%, #244674 100%)" },
              // Without this the gradient stays put while MUI greys only the
              // label, leaving unreadable text on a solid navy slab.
              "&.Mui-disabled": {
                background: "none",
                bgcolor: "action.disabledBackground",
                color: "action.disabled",
              },
            }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </Box>
      </Paper>
      </ThemeProvider>
    </Box>
  );
}
