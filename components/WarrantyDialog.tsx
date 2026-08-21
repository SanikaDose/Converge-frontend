"use client";

import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlineOutlined";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import Stack from "./Stack";
import { todayISO } from "@/lib/dateUtils";
import type { Warranty } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Captures warranty details when a project completes. Opened automatically the
 * first time a project reaches 100% (see ProjectDetail), and reachable again
 * from the header afterwards to view or edit. `initial` pre-fills it when the
 * warranty was already saved.
 */
export function WarrantyDialog({ initial, busy, onClose, onSave }: {
  initial?: Warranty | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (warranty: Warranty) => void;
}) {
  const [completionDate, setCompletionDate] = useState(initial?.completionDate || todayISO());
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [showErrors, setShowErrors] = useState(false);

  const emailInvalid = !!email && !EMAIL_RE.test(email.trim());
  const canSave = !!completionDate && !!contactPerson.trim() && !!phone.trim() && !!email.trim() && !emailInvalid;

  const submit = () => {
    if (!canSave) { setShowErrors(true); return; }
    onSave({
      completionDate,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pb: 0.5 }}>
        <VerifiedOutlinedIcon color="success" /> Warranty details
      </DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2.25 }}>
        <Typography variant="body2" color="text.secondary">
          This project is complete. Record its warranty contact so it's on file.
        </Typography>

        <TextField
          label="Completion date" type="date" fullWidth
          value={completionDate} onChange={(e) => setCompletionDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          error={showErrors && !completionDate}
        />

        <TextField
          label="Contact person" fullWidth value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          error={showErrors && !contactPerson.trim()}
          helperText={showErrors && !contactPerson.trim() ? "Required" : " "}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonOutlineIcon fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment> } }}
        />

        <TextField
          label="Contact number" fullWidth value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={showErrors && !phone.trim()}
          helperText={showErrors && !phone.trim() ? "Required" : " "}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><CallOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment> } }}
        />

        <TextField
          label="Contact email" type="email" fullWidth value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={(showErrors && !email.trim()) || emailInvalid}
          helperText={emailInvalid ? "Enter a valid email" : (showErrors && !email.trim() ? "Required" : " ")}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} /></InputAdornment> } }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="success" disabled={busy} onClick={submit}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <VerifiedOutlinedIcon />}>
          {busy ? "Saving…" : "Save warranty"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
