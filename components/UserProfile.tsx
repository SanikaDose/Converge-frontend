"use client";

import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlineOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import Stack from "./Stack";
import { avatarColor, initials } from "@/lib/data";
import { useAuth } from "@/context/AuthContext";
import { useChangePasswordMutation, useMeQuery, useUpdateProfileMutation } from "@/store/api/authApi";

/** Backend validation/business errors arrive as `{ message: string | string[] }`. */
function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string | string[] } })?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg || fallback;
}

const MIN_PASSWORD_LENGTH = 8;

/** One read-only identity row — the fields only an admin can change. */
function ReadOnlyField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.5} sx={{ py: 1.25 }}>
      <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{value || "—"}</Typography>
      </Box>
    </Stack>
  );
}

/**
 * The signed-in user's own profile: the details they can change (name,
 * password) and the ones only an admin can (employee ID, role, team).
 *
 * Everything here is scoped to *the caller* — there is no user id in any
 * request. The backend takes identity from the bearer token, so this page
 * can only ever read or write the account whose token it holds.
 */
export function UserProfile() {
  const { user, applyProfile, signOut } = useAuth();

  // Re-read from the server rather than rendering the login-time snapshot,
  // so a role/team change made by an admin since sign-in shows up here.
  const { data: profile, isLoading } = useMeQuery();
  const [updateProfile, { isLoading: savingName }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: savingPassword }] = useChangePasswordMutation();

  const [name, setName] = useState(user?.name ?? "");
  const [nameError, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [toast, setToast] = useState("");

  // Seed the editable field once the server copy lands. Guarded on the
  // saving flag so a refetch can't overwrite what's being typed.
  useEffect(() => {
    if (profile && !savingName) setName(profile.name);
  }, [profile, savingName]);

  const display = profile ?? user;
  const nameChanged = !!display && name.trim() !== display.name;

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError("Name must be at least 2 characters.");
      return;
    }
    setNameError("");
    try {
      const updated = await updateProfile({ name: trimmed }).unwrap();
      // Keep the navbar avatar/menu in step with the edit.
      applyProfile(updated);
      setToast("Your details have been updated.");
    } catch (err) {
      setNameError(errorMessage(err, "Could not save your details. Please try again."));
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The two new-password entries do not match.");
      return;
    }
    setPasswordError("");
    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setToast("Password changed. Sign in again with your new password.");
      // The old token stays valid after a password change, which would let
      // a stolen session outlive the reset it was meant to shut out. Ending
      // the session here makes the change take effect everywhere.
      window.setTimeout(() => signOut(), 1800);
    } catch (err) {
      setPasswordError(errorMessage(err, "Could not change your password. Please try again."));
    }
  };

  const passwordFormFilled = !!currentPassword && !!newPassword && !!confirmPassword;

  return (
    <Box sx={{ maxWidth: 1080, mx: "auto" }}>
      {/* Identity banner */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, md: 3 },
          mb: 3,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          gap: 2.5,
          flexWrap: "wrap",
        }}
      >
        {isLoading && !display ? (
          <>
            <Skeleton variant="circular" width={64} height={64} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width={180} height={28} />
              <Skeleton width={240} height={20} />
            </Box>
          </>
        ) : (
          <>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                fontSize: 22,
                fontWeight: 700,
                bgcolor: avatarColor(display?.name),
              }}
            >
              {initials(display?.name)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {display?.name ?? "—"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {display ? `${display.employeeCode} · ${display.team}` : ""}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={display?.appRole === "Admin" ? "Admin · full access" : "User · view only"}
              color={display?.appRole === "Admin" ? "primary" : "default"}
              variant={display?.appRole === "Admin" ? "filled" : "outlined"}
              sx={{ fontWeight: 600 }}
            />
          </>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* Your details */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Your details</Typography>
            <Typography variant="caption" color="text.secondary">
              Your display name is what teammates see on tasks and tickets.
            </Typography>

            <Box component="form" onSubmit={saveName} sx={{ mt: 2.5 }}>
              <TextField
                label="Full name"
                fullWidth
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(""); }}
                disabled={savingName || isLoading}
                error={!!nameError}
                helperText={nameError || " "}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={!nameChanged || savingName}
                startIcon={savingName ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {savingName ? "Saving…" : "Save changes"}
              </Button>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Managed by your administrator
            </Typography>
            <ReadOnlyField
              icon={<BadgeOutlinedIcon fontSize="small" />}
              label="Employee ID"
              value={display?.employeeCode ?? ""}
            />
            <ReadOnlyField
              icon={<GroupsOutlinedIcon fontSize="small" />}
              label="Team"
              value={display?.team ?? ""}
            />
            <ReadOnlyField
              icon={<ShieldOutlinedIcon fontSize="small" />}
              label="Role"
              value={display?.role ?? ""}
            />
          </Paper>
        </Grid>

        {/* Change password */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 2, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Change password</Typography>
            <Typography variant="caption" color="text.secondary">
              At least {MIN_PASSWORD_LENGTH} characters. You&apos;ll be signed out and asked to sign
              in again with the new one.
            </Typography>

            <Box component="form" onSubmit={savePassword} sx={{ mt: 2.5 }}>
              <TextField
                label="Current password"
                type={showCurrent ? "text" : "password"}
                fullWidth
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(""); }}
                disabled={savingPassword}
                sx={{ mb: 2 }}
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
                        <IconButton size="small" onClick={() => setShowCurrent(v => !v)} edge="end">
                          {showCurrent ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="New password"
                type={showNew ? "text" : "password"}
                fullWidth
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                disabled={savingPassword}
                sx={{ mb: 2 }}
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
                        <IconButton size="small" onClick={() => setShowNew(v => !v)} edge="end">
                          {showNew ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Confirm new password"
                type={showNew ? "text" : "password"}
                fullWidth
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                disabled={savingPassword}
                error={!!confirmPassword && confirmPassword !== newPassword}
                helperText={
                  !!confirmPassword && confirmPassword !== newPassword ? "Passwords do not match." : " "
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}

              <Button
                type="submit"
                variant="contained"
                disabled={!passwordFormFilled || savingPassword}
                startIcon={savingPassword ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {savingPassword ? "Updating…" : "Update password"}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}
