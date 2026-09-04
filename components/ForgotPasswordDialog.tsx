"use client";

import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { ThemeProvider } from "@mui/material/styles";
import { LIGHT_THEME } from "@/lib/theme";
import Stack from "./Stack";
import { useForgotPasswordMutation, useVerifyOtpMutation, useResetPasswordMutation } from "@/store/api/authApi";

type Step = "email" | "otp" | "reset" | "done";

/** Read a user-facing message off an RTK Query error, with a fallback. */
function errText(err: unknown, fallback: string): string {
  const msg = (err as { data?: { message?: string | string[] } })?.data?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg || fallback;
}

/**
 * Forgot-password flow: email → OTP → new password. Opens from the login
 * screen. The OTP is verified server-side for a short-lived reset token that
 * authorizes the final password change.
 */
export function ForgotPasswordDialog({ open, onClose, defaultEmail = "" }: {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [forgotPassword, { isLoading: sending }] = useForgotPasswordMutation();
  const [verifyOtp, { isLoading: verifying }] = useVerifyOtpMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  // Reset to a clean state each time the dialog opens.
  useEffect(() => {
    if (open) {
      setStep("email"); setEmail(defaultEmail); setOtp(""); setResetToken("");
      setPw(""); setPw2(""); setShowPw(false); setError(null);
    }
  }, [open, defaultEmail]);

  const sendCode = async () => {
    if (!email.trim()) return;
    setError(null);
    try {
      await forgotPassword({ email: email.trim() }).unwrap();
      setStep("otp");
    } catch (e) {
      setError(errText(e, "Couldn't send the code. Please try again."));
    }
  };

  const submitOtp = async () => {
    if (otp.trim().length < 6) return;
    setError(null);
    try {
      const { resetToken } = await verifyOtp({ email: email.trim(), otp: otp.trim() }).unwrap();
      setResetToken(resetToken);
      setStep("reset");
    } catch (e) {
      setError(errText(e, "That code isn't valid."));
    }
  };

  const submitReset = async () => {
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setError("Passwords don't match."); return; }
    setError(null);
    try {
      await resetPassword({ resetToken, newPassword: pw }).unwrap();
      setStep("done");
    } catch (e) {
      setError(errText(e, "Couldn't reset the password. Please start again."));
    }
  };

  const busy = sending || verifying || resetting;

  return (
    <ThemeProvider theme={LIGHT_THEME}>
      <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {step === "done" ? "Password updated" : "Reset your password"}
        </DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {step === "email" && (
            <>
              <Typography variant="body2" color="text.secondary">
                Enter your account email and we&apos;ll send you a 6-digit verification code.
              </Typography>
              <TextField label="Email" type="email" fullWidth autoFocus value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="e.g. sanikad@elansoltech.com"
                onKeyDown={(e) => { if (e.key === "Enter") sendCode(); }}
                slotProps={{ inputLabel: { shrink: true } }} />
            </>
          )}

          {step === "otp" && (
            <>
              <Typography variant="body2" color="text.secondary">
                If an account exists for <strong>{email}</strong>, a 6-digit code is on its way.
                Enter it below (it expires in 10 minutes).
              </Typography>
              <TextField label="Verification code" fullWidth autoFocus value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => { if (e.key === "Enter") submitOtp(); }}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: "numeric", style: { letterSpacing: 8, fontSize: 22, textAlign: "center", fontWeight: 700 } } }}
                placeholder="______" />
              <Button variant="text" size="small" disabled={sending} onClick={sendCode} sx={{ alignSelf: "flex-start" }}>
                Resend code
              </Button>
            </>
          )}

          {step === "reset" && (
            <>
              <Typography variant="body2" color="text.secondary">Choose a new password (at least 8 characters).</Typography>
              <TextField label="New password" fullWidth autoFocus type={showPw ? "text" : "password"} value={pw}
                onChange={(e) => setPw(e.target.value)} slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" edge="end" onClick={() => setShowPw(v => !v)} aria-label="toggle password">
                          {showPw ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }} />
              <TextField label="Confirm new password" fullWidth type={showPw ? "text" : "password"} value={pw2}
                onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitReset(); }}
                slotProps={{ inputLabel: { shrink: true } }} />
            </>
          )}

          {step === "done" && (
            <Stack alignItems="center" gap={1} sx={{ py: 1.5, textAlign: "center" }}>
              <CheckCircleOutlineIcon color="success" sx={{ fontSize: 48 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>Your password has been reset.</Typography>
              <Typography variant="body2" color="text.secondary">You can now sign in with your new password.</Typography>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          {step === "done" ? (
            <Button variant="contained" onClick={onClose}>Back to sign in</Button>
          ) : (
            <>
              <Button onClick={onClose} color="inherit" disabled={busy}>Cancel</Button>
              {step === "email" && (
                <Button variant="contained" onClick={sendCode} disabled={busy || !email.trim()}
                  startIcon={sending ? <CircularProgress size={16} color="inherit" /> : undefined}>
                  {sending ? "Sending…" : "Send code"}
                </Button>
              )}
              {step === "otp" && (
                <Button variant="contained" onClick={submitOtp} disabled={busy || otp.length < 6}
                  startIcon={verifying ? <CircularProgress size={16} color="inherit" /> : undefined}>
                  {verifying ? "Verifying…" : "Verify"}
                </Button>
              )}
              {step === "reset" && (
                <Button variant="contained" onClick={submitReset} disabled={busy || pw.length < 8 || !pw2}
                  startIcon={resetting ? <CircularProgress size={16} color="inherit" /> : undefined}>
                  {resetting ? "Saving…" : "Reset password"}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
