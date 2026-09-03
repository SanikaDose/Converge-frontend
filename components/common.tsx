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
import AvatarGroup from "@mui/material/AvatarGroup";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import OutlinedInput from "@mui/material/OutlinedInput";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import FormControlLabel from "@mui/material/FormControlLabel";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ScheduleIcon from "@mui/icons-material/Schedule";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";
import { alpha, useTheme } from "@mui/material/styles";
import Stack from "./Stack";
import { initials, avatarColor, STATUS_OPTIONS, STATUS_COLOR } from "@/lib/data";
import { useStatusHex } from "@/lib/theme";
import { useOrgContext } from "@/context/OrgContext";
import type { Achievement, StatusColorKey, TaskStatus } from "@/lib/types";

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
  const { employeeById } = useOrgContext();
  const emp = employeeId ? employeeById[employeeId] : undefined;
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

/**
 * Compact stack of assignee avatars (AvatarGroup) for a task with one or
 * more owners. Falls back to a single "?" avatar when empty so a task with
 * no owner still reads as an assignee slot rather than blank space.
 */
export function EmployeeAvatarStack({ employeeIds, size = 26, max = 4 }: { employeeIds: string[]; size?: number; max?: number }) {
  if (!employeeIds || employeeIds.length === 0) {
    return <EmployeeAvatar employeeId={null} size={size} />;
  }
  if (employeeIds.length === 1) return <EmployeeAvatar employeeId={employeeIds[0]} size={size} />;
  return (
    <AvatarGroup
      max={max}
      spacing="small"
      sx={{ "& .MuiAvatar-root": { width: size, height: size, fontSize: size * 0.38, border: "2px solid", borderColor: "background.paper" } }}
    >
      {employeeIds.map(id => <EmployeeAvatar key={id} employeeId={id} size={size} />)}
    </AvatarGroup>
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

/**
 * Red counterpart to AchievementBadge — shown on a task that was completed
 * AFTER its planned finish date. `days` is the working-days lateness
 * (lateWorkingDays); 0 renders nothing.
 */
export function LateBadge({ days, size = "small" }: { days: number; size?: ChipProps["size"] }) {
  const STATUS_HEX = useStatusHex();
  if (!days || days <= 0) return null;
  const label = `Finished ${days} Day${days === 1 ? "" : "s"} Late`;
  return (
    <Tooltip title={label}>
      <Chip
        icon={<ScheduleIcon sx={{ fontSize: 14 }} />}
        label={label}
        size={size}
        sx={{ bgcolor: alpha(STATUS_HEX.red, 0.14), color: STATUS_HEX.red, border: `1px solid ${STATUS_HEX.red}`, fontWeight: 700 }}
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
 * ListSubheader followed by its members (admins suffixed "(Admin)"),
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
  const { teams } = useOrgContext();
  return (
    <TextField
      select fullWidth={fullWidth} size={size} label={label} value={value || ""} error={!!error} disabled={disabled}
      helperText={(typeof error === "string" ? error : undefined) || helperText} required={required}
      onChange={(e) => onChange(e.target.value || null)}
    >
      {allowUnassigned && <MenuItem value="">Unassigned</MenuItem>}
      {teams.flatMap(team => [
        <ListSubheader key={`h-${team.id}`} sx={{ bgcolor: "transparent", lineHeight: "28px", color: "primary.light" }}>
          {team.name}
        </ListSubheader>,
        ...team.members.map(m => (
          <MenuItem key={m.id} value={m.id} sx={{ pl: 3 }}>
            {m.name}{m.role === "Admin" ? " (Admin)" : ""}
          </MenuItem>
        )),
      ])}
    </TextField>
  );
}

/**
 * Multi-owner variant of OrgSelect — the same grouped-by-team list, but with
 * checkboxes and a string[] value, for tasks that can have several owners.
 * renderValue shows the chosen members' names (or a placeholder).
 */
export function OrgMultiSelect({ label, value, onChange, size = "small", fullWidth = true, disabled, placeholder = "Unassigned" }: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  size?: "small" | "medium";
  fullWidth?: boolean;
  disabled?: boolean;
  /** Text shown when nothing is selected. */
  placeholder?: string;
}) {
  const { teams, employeeById } = useOrgContext();
  const selected = value || [];
  const labelId = React.useId();
  return (
    <FormControl fullWidth={fullWidth} size={size} disabled={disabled}>
      {/* shrink + a notched OutlinedInput keeps the floating label from
          overlapping the "Unassigned" placeholder that displayEmpty shows. */}
      {label && <InputLabel id={labelId} shrink>{label}</InputLabel>}
      <Select
        multiple
        labelId={label ? labelId : undefined}
        value={selected}
        input={<OutlinedInput label={label || undefined} notched={!!label} />}
        onChange={(e) => {
          const v = e.target.value;
          onChange(typeof v === "string" ? v.split(",") : v);
        }}
        renderValue={(ids) => {
          const arr = ids as string[];
          if (!arr.length) return <Box component="span" sx={{ color: "text.secondary" }}>{placeholder}</Box>;
          return arr.map(id => employeeById[id]?.name ?? "—").join(", ");
        }}
        displayEmpty
      >
        {teams.flatMap(team => [
          <ListSubheader key={`h-${team.id}`} sx={{ bgcolor: "transparent", lineHeight: "28px", color: "primary.light" }}>
            {team.name}
          </ListSubheader>,
          ...team.members.map(m => (
            <MenuItem key={m.id} value={m.id} sx={{ pl: 2 }}>
              <Checkbox size="small" checked={selected.includes(m.id)} sx={{ py: 0.25 }} />
              <ListItemText primary={`${m.name}${m.role === "Admin" ? " (Admin)" : ""}`} />
            </MenuItem>
          )),
        ])}
      </Select>
    </FormControl>
  );
}

/**
 * Statuses hidden by default on the Kanban boards. Delayed is a
 * derived/warning state and Not Required is out-of-scope work — neither is
 * somewhere active work sits, so both columns start collapsed until ticked.
 */
export const DEFAULT_HIDDEN_KANBAN_STATUSES: readonly TaskStatus[] = ["Delayed", "Not Required"];

/** The initial visible-status set for a Kanban board (everything but the defaults above). */
export function defaultKanbanVisible(): Set<TaskStatus> {
  return new Set(STATUS_OPTIONS.filter(s => !DEFAULT_HIDDEN_KANBAN_STATUSES.includes(s)));
}

/**
 * Compact row of status checkboxes for a Kanban board — sized to sit inline
 * next to the view toggle. Toggling one shows/hides that status column.
 * Delayed and Not Required start unticked (see above), same control as every
 * other status, just off by default.
 */
export function KanbanStatusFilter({ visible, onToggle }: { visible: Set<TaskStatus>; onToggle: (status: TaskStatus) => void }) {
  const STATUS_HEX = useStatusHex();
  return (
    <Stack direction="row" flexWrap="wrap" alignItems="center" sx={{ rowGap: 0 }}>
      {STATUS_OPTIONS.map(status => {
        const hex = STATUS_HEX[STATUS_COLOR[status]];
        return (
          <Tooltip key={status} title={status}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small" checked={visible.has(status)} onChange={() => onToggle(status)}
                  sx={{ p: 0.375, color: hex, "&.Mui-checked": { color: hex }, "& .MuiSvgIcon-root": { fontSize: 17 } }}
                />
              }
              label={<Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11, lineHeight: 1 }}>{status}</Typography>}
              sx={{ mr: 0.75, ml: 0 }}
            />
          </Tooltip>
        );
      })}
    </Stack>
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
 * Diffs a live count against a captured baseline (see backend's
 * DashboardBaseline / GET /dashboard-summary) into a StatTrend — shared
 * by the Dashboard and Tickets KPI rows so both read "vs last month" off
 * the same real snapshot instead of each fabricating their own number.
 */
export function computeStatTrend(current: number, base: number, unit: string, goodDirection: "up" | "down"): StatTrend {
  const diff = current - base;
  const direction: StatTrend["direction"] = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const tone: StatTrend["tone"] = diff === 0 ? "neutral" : (goodDirection === "up") === (diff > 0) ? "positive" : "negative";
  const text = diff === 0 ? "No change vs last month" : `${Math.abs(diff)}${unit} vs last month`;
  return { direction, text, tone };
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
  const paletteMatch = (theme.palette as unknown as Record<string, Record<string, string>>)[group]?.[shade];
  const resolved = paletteMatch || (color.startsWith("#") ? color : theme.palette.primary.light);
  const toneColor = trend?.tone === "negative" ? theme.palette.error.main : trend?.tone === "positive" ? theme.palette.success.main : theme.palette.text.secondary;
  const TrendIcon = trend?.direction === "up" ? ArrowUpwardIcon : trend?.direction === "down" ? ArrowDownwardIcon : RemoveIcon;
  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 1.5, p: 1.75, height: "100%", boxSizing: "border-box",
      bgcolor: tint ? alpha(resolved, 0.07) : "background.paper", border: "1px solid",
      borderColor: tint ? alpha(resolved, 0.3) : "divider", borderRadius: 1.25,
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
