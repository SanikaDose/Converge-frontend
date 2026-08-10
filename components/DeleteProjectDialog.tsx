"use client";

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "./Stack";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { loginApi, deleteProjectApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/**
 * Deleting a project is irreversible (cascades to every phase/task in it —
 * see ProjectsService.remove), so it's gated behind re-entering the
 * signed-in user's own password rather than a plain "are you sure?"
 * confirm. The password is verified the same way sign-in does (POST
 * /auth/login, bcrypt-compared server-side) — no new verification
 * mechanism, just re-running the real one that already exists.
 */
export function DeleteProjectDialog({ projectId, projectName, onClose, onDeleted }: {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !password || !user) return;
    setBusy(true);
    setError(null);
    try {
      await loginApi(user.employeeCode, password);
    } catch {
      setError("Incorrect password.");
      setBusy(false);
      return;
    }
    try {
      await deleteProjectApi(projectId);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <WarningAmberIcon fontSize="small" color="error" />
            Delete project
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, mb: 2 }}>
            This permanently deletes <strong>{projectName}</strong> and every phase, task, and
            history entry in it. This cannot be undone.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            autoFocus fullWidth required type="password" autoComplete="current-password"
            label="Confirm your password" value={password} disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            type="submit" variant="contained" color="error" disabled={busy || !password}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {busy ? "Deleting…" : "Delete project"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
