"use client";
import React, { type ElementType, type ReactNode } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip, { type ChipProps } from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import ListSubheader from "@mui/material/ListSubheader";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";
import { alpha, useTheme } from "@mui/material/styles";
import Stack from "./Stack";
import { TEAMS, EMPLOYEE_BY_ID, initials, avatarColor } from "@/lib/data";
import { useStatusHex } from "@/lib/theme";
import type { Achievement, StatusColorKey } from "@/lib/types";

/** Small colored status pill, used for task/project/ticket status everywhere. */
export function StatusChip({ label, color = "slate", size = "small", variant = "filled" }: {
  label: string; color?: StatusColorKey; size?: ChipProps["size"]; variant?: "filled" | "outlined";
}) {
  const STATUS_HEX = useStatusHex();
  const hex = STATUS_HEX[color] || STATUS_HEX.slate;
  return (
    <Chip
      label={label}
      size={size}
      sx={variant === "filled" ? {
        bgcolor: `color-mix(in srgb, ${hex} 22%, transparent)`,
        color: hex, border: `1px solid ${hex}`, fontWeight: 700, fontSize: 11.5,
      } : {
        color: hex, borderColor: hex, fontWeight: 700, fontSize: 11.5,
      }}
      variant={variant === "filled" ? "filled" : "outlined"}
    />
  );
}

/** Employee avatar with deterministic color + initials fallback (no image assets). */
export function EmployeeAvatar({ employeeId, size = 28 }: { employeeId?: string | null; size?: number }) {
  const emp = employeeId ? EMPLOYEE_BY_ID[employeeId] : undefined;
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
export function AchievementBadge({ achievement, size = "small" }: { achievement?: Achievement | null; size?: ChipProps["size"] }) {
  const STATUS_HEX = useStatusHex();
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

export function PendingApprovalChip({ size = "small" }: { size?: ChipProps["size"] }) {
  const STATUS_HEX = useStatusHex();
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
export function OrgSelect({ label, value, onChange, allowUnassigned = true, error, helperText, size = "small", fullWidth = true, required, disabled }: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  allowUnassigned?: boolean;
  error?: string | boolean;
  helperText?: string;
  size?: TextFieldProps["size"];
  fullWidth?: boolean;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <TextField
      select fullWidth={fullWidth} size={size} label={label} value={value || ""} error={!!error} disabled={disabled}
      helperText={(typeof error === "string" ? error : undefined) || helperText} required={required}
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

export interface StatTrend {
  direction: "up" | "down" | "flat";
  /** e.g. "2 vs last month" — rendered after the trend arrow. */
  text: string;
  /** Whether an "up" reading is good or bad news for this metric — colors the caption accordingly. Defaults to neutral gray. */
  tone?: "positive" | "negative" | "neutral";
}

/**
 * Small KPI tile — icon chip + value + label, used atop the dashboard and
 * team performance page. `trend` adds a small "vs last month" caption
 * (see Dashboard.tsx's baseline diff — a real snapshot comparison, not a
 * fabricated number); `tint` washes the whole card in `color` instead of
 * just the icon chip, for KPIs that deserve to stand out (e.g. delayed
 * tasks > 0).
 */
export function StatCard({ icon: Icon, label, value, color = "primary.light", trend, tint }: {
  icon: ElementType; label: string; value: ReactNode; color?: string; trend?: StatTrend; tint?: boolean;
}) {
  const theme = useTheme();
  const [group, shade] = color.split(".");
  const resolved = (theme.palette as unknown as Record<string, Record<string, string>>)[group]?.[shade] || theme.palette.primary.light;
  const toneColor = trend?.tone === "negative" ? theme.palette.error.main : trend?.tone === "positive" ? theme.palette.success.main : theme.palette.text.secondary;
  const TrendIcon = trend?.direction === "up" ? ArrowUpwardIcon : trend?.direction === "down" ? ArrowDownwardIcon : RemoveIcon;
  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 1.5, p: 1.75,
      bgcolor: tint ? alpha(resolved, 0.07) : "background.paper", border: "1px solid",
      borderColor: tint ? alpha(resolved, 0.3) : "divider", borderRadius: 3,
    }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: 2, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        bgcolor: alpha(resolved, 0.16), color: resolved,
      }}>
        <Icon sx={{ fontSize: 21 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{label}</Typography>
        {trend && (
          <Stack direction="row" alignItems="center" gap={0.3} sx={{ mt: 0.25 }}>
            <TrendIcon sx={{ fontSize: 11, color: toneColor }} />
            <Typography variant="caption" sx={{ color: toneColor, fontWeight: 600, fontSize: 10.5 }}>{trend.text}</Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
