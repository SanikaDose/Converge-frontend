"use client";
import React from "react";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import ListSubheader from "@mui/material/ListSubheader";
import TextField from "@mui/material/TextField";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import { TEAMS, EMPLOYEE_BY_ID, initials, avatarColor } from "@/lib/data";
import { STATUS_HEX } from "@/lib/theme";

/** Small colored status pill, used for task/project/ticket status everywhere. */
export function StatusChip({ label, color = "slate", size = "small", variant = "filled" }) {
  const hex = STATUS_HEX[color] || STATUS_HEX.slate;
  return (
    <Chip
      label={label}
      size={size}
      sx={variant === "filled" ? {
        bgcolor: `color-mix(in srgb, ${hex} 22%, transparent)`,
        color: hex, border: `1px solid ${hex}`, fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5,
      } : {
        color: hex, borderColor: hex, fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5,
      }}
      variant={variant === "filled" ? "filled" : "outlined"}
    />
  );
}

/** Employee avatar with deterministic color + initials fallback (no image assets). */
export function EmployeeAvatar({ employeeId, size = 28 }) {
  const emp = EMPLOYEE_BY_ID[employeeId];
  if (!emp) {
    return (
      <Avatar sx={{ width: size, height: size, fontSize: size * 0.4, bgcolor: "rgba(139,148,163,0.25)" }}>?</Avatar>
    );
  }
  return (
    <Tooltip title={`${emp.name} · ${emp.role} · ${emp.team}`}>
      <Avatar sx={{ width: size, height: size, fontSize: size * 0.38, bgcolor: avatarColor(emp.name), fontWeight: 700 }}>
        {initials(emp.name)}
      </Avatar>
    </Tooltip>
  );
}

/** 🏆 achievement badge — used on task cards, timeline tooltips, dashboard. */
export function AchievementBadge({ achievement, size = "small" }) {
  if (!achievement) return null;
  return (
    <Tooltip title={achievement.label}>
      <Chip
        icon={<EmojiEventsIcon sx={{ fontSize: 14 }} />}
        label={achievement.label}
        size={size}
        sx={{ bgcolor: "rgba(76,174,125,0.16)", color: STATUS_HEX.green, border: `1px solid ${STATUS_HEX.green}`, fontWeight: 700 }}
      />
    </Tooltip>
  );
}

export function PendingApprovalChip({ size = "small" }) {
  return (
    <Chip
      icon={<HourglassTopIcon sx={{ fontSize: 14 }} />}
      label="Pending Approval"
      size={size}
      sx={{ bgcolor: "rgba(157,127,224,0.16)", color: STATUS_HEX.violet, border: `1px solid ${STATUS_HEX.violet}`, fontWeight: 700 }}
    />
  );
}

/**
 * Grouped organization-member <Select>. Renders every team as a
 * ListSubheader followed by its members ("Team Lead" suffixed "(TL)"),
 * used everywhere a free-text owner/assignee field used to live:
 * ProjectForm (project lead), TaskEditorDrawer (assigned to), TicketForm
 * (assign to).
 */
export function OrgSelect({ label, value, onChange, allowUnassigned = true, error, helperText, size = "small", fullWidth = true, required }) {
  return (
    <TextField
      select fullWidth={fullWidth} size={size} label={label} value={value || ""} error={!!error}
      helperText={error || helperText} required={required}
      onChange={(e) => onChange(e.target.value || null)}
    >
      {allowUnassigned && <MenuItem value="">Unassigned</MenuItem>}
      {TEAMS.flatMap(team => [
        <ListSubheader key={`h-${team.id}`} sx={{ bgcolor: "transparent", lineHeight: "28px", color: "primary.light" }}>
          {team.name}
        </ListSubheader>,
        ...team.members.map(m => (
          <MenuItem key={m.id} value={m.id} sx={{ pl: 3 }}>
            {m.name}{m.role === "Team Lead" ? " (TL)" : ""}
          </MenuItem>
        )),
      ])}
    </TextField>
  );
}
