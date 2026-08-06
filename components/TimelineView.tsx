"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTheme } from "@mui/material/styles";
import { STATUS_COLOR } from "@/lib/data";
import { isOverdue } from "@/lib/businessLogic";
import { fmt, addDays, diffDays, isWeekend } from "@/lib/dateUtils";
import { useStatusHex } from "@/lib/theme";
import type { Phase, Task, WeekDay } from "@/lib/types";

const ROW_H = 34;
const PHASE_ROW_H = 30;
const HEADER_H = 34;
const BAR_H = 18;
const ZOOM_PX: Record<string, number> = { Week: 26, Month: 11, Quarter: 4.5 };
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function LegendSwatch({ color, label, textColor }: { color: string; label: string; textColor?: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ color: textColor || "text.secondary" }}>{label}</Typography>
    </Stack>
  );
}

type Row =
  | { type: "phase"; name: string; id: string; critical: boolean; total: number; completed: number }
  | { type: "task"; task: Task };

/**
 * Enhanced Gantt/timeline. Bars are positioned from each task's actual
 * calendar `plannedStart`/`plannedFinish` (not the business-day
 * dayOffset, which is a *working-day* count and no longer matches the
 * pixel-per-calendar-day x-axis once weekends/week-off days are
 * skipped). Weekend/week-off columns are shaded, today gets a marker
 * line the view auto-scrolls to on load, achievement tasks get a
 * trophy glyph, phases collapse to tame the 62-task row count, and a
 * zoom control switches Week/Month/Quarter density.
 */
export function TimelineView({ phases, tasks, projectStartDate, projectEndDate, today, weekOff, onOpenPhase }: {
  phases: Phase[];
  tasks: Task[];
  projectStartDate: string;
  projectEndDate: string;
  today: string;
  weekOff: WeekDay[];
  onOpenPhase?: (phaseId: string) => void;
}) {
  const STATUS_HEX = useStatusHex();
  const theme = useTheme();
  const achievementIconColor = theme.palette.mode === "light" ? "#ffffff" : "#0c2b1e";
  const [zoom, setZoom] = useState("Week");
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const pxPerDay = ZOOM_PX[zoom];
  const scrollRef = useRef<HTMLDivElement>(null);

  const togglePhase = (id: string) => setCollapsedPhases(prev => ({ ...prev, [id]: !prev[id] }));

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    phases.forEach((p) => {
      const phaseTasks = tasks.filter(t => t.phaseId === p.id);
      out.push({
        type: "phase", name: p.name, id: p.id, critical: p.critical,
        total: phaseTasks.length, completed: phaseTasks.filter(t => t.status === "Completed").length,
      });
      if (collapsedPhases[p.id]) return;
      phaseTasks.sort((a, b) => a.order - b.order).forEach(t => out.push({ type: "task", task: t }));
    });
    return out;
  }, [phases, tasks, collapsedPhases]);

  const totalDays = useMemo(() => {
    const finishes = tasks.map(t => t.plannedFinish);
    const maxFinish = finishes.length ? finishes.reduce((a, b) => a > b ? a : b) : projectEndDate;
    return Math.max(diffDays(maxFinish, projectStartDate), diffDays(projectEndDate, projectStartDate)) + 3;
  }, [tasks, projectStartDate, projectEndDate]);

  // Week zoom has room for a mark every 7 days ("Wk N"); at Month/Quarter
  // density that same cadence would crowd into unreadable overlapping
  // labels, so those two switch to one mark per calendar month instead.
  const headerMarks = useMemo(() => {
    if (zoom === "Week") {
      const arr: { offset: number; label: string }[] = [];
      for (let d = 0; d <= totalDays; d += 7) arr.push({ offset: d, label: `Wk ${Math.floor(d / 7) + 1}` });
      return arr;
    }
    const arr: { offset: number; label: string }[] = [];
    let lastMonthKey = "";
    for (let d = 0; d <= totalDays; d++) {
      const iso = addDays(projectStartDate, d);
      const monthKey = iso.slice(0, 7);
      if (monthKey !== lastMonthKey) {
        lastMonthKey = monthKey;
        const [y, m] = iso.split("-");
        arr.push({ offset: d, label: `${MONTH_ABBR[Number(m) - 1]} ${y}` });
      }
    }
    return arr;
  }, [zoom, totalDays, projectStartDate]);

  const weekendBands = useMemo(() => {
    const bands: number[] = [];
    for (let d = 0; d <= totalDays; d++) {
      if (isWeekend(addDays(projectStartDate, d), weekOff)) bands.push(d);
    }
    return bands;
  }, [totalDays, projectStartDate, weekOff]);

  const contentWidth = totalDays * pxPerDay;
  const todayOffset = diffDays(today, projectStartDate);
  const bodyHeight = rows.reduce((h, r) => h + (r.type === "phase" ? PHASE_ROW_H : ROW_H), 0);

  // Bring "today" into view on load and whenever zoom density changes,
  // instead of leaving the viewer to hunt for it by scrolling right.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, todayOffset * pxPerDay - el.clientWidth / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={2.5} flexWrap="wrap" rowGap={1}>
          <LegendSwatch color={STATUS_HEX.slate} label="Not Started" />
          <LegendSwatch color={STATUS_HEX.amber} label="In Progress" />
          <LegendSwatch color={STATUS_HEX.violet} label="Pending Approval" />
          <LegendSwatch color={STATUS_HEX.red} label="Delayed" />
          <LegendSwatch color={STATUS_HEX.green} label="Completed" />
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <EmojiEventsIcon sx={{ fontSize: 13, color: STATUS_HEX.green }} />
            <Typography variant="caption" color="text.secondary">Achievement</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: "rgba(139,148,163,0.18)", border: "1px solid", borderColor: "divider" }} />
            <Typography variant="caption" color="text.secondary">Week off</Typography>
          </Stack>
        </Stack>
        <ToggleButtonGroup size="small" exclusive value={zoom} onChange={(_e, v: string | null) => v && setZoom(v)}>
          {Object.keys(ZOOM_PX).map(z => <ToggleButton key={z} value={z}>{z}</ToggleButton>)}
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ display: "flex", border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper", overflow: "hidden" }}>
        <Box sx={{ flexShrink: 0, width: 220, borderRight: "1px solid", borderColor: "divider" }}>
          <Box sx={{ height: HEADER_H, borderBottom: "1px solid", borderColor: "divider", position: "sticky", top: 0, zIndex: 3, bgcolor: "background.paper" }} />
          {rows.map((r, i) => r.type === "phase" ? (
            <Box
              key={i} onClick={() => togglePhase(r.id)}
              sx={{
                height: PHASE_ROW_H, display: "flex", alignItems: "center", gap: 0.5, px: 1, cursor: "pointer",
                bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider",
                textTransform: "uppercase", letterSpacing: 0.3, userSelect: "none",
                "&:hover": { bgcolor: "rgba(139,148,163,0.08)" },
              }}
            >
              <ExpandMoreIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0, transition: "transform .15s ease", transform: collapsedPhases[r.id] ? "rotate(-90deg)" : "none" }} />
              {r.critical && <Tooltip title="Critical phase — delays here delay the whole project"><Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: STATUS_HEX.red, flexShrink: 0 }} /></Tooltip>}
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}>{r.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, flexShrink: 0, textTransform: "none" }}>
                {r.completed}/{r.total}
              </Typography>
            </Box>
          ) : (
            <Box
              key={i} onClick={() => onOpenPhase?.(r.task.phaseId)}
              sx={{
                height: ROW_H, display: "flex", alignItems: "center", gap: 1, px: 1.75, borderBottom: "1px solid", borderColor: "divider",
                cursor: onOpenPhase ? "pointer" : "default", "&:hover": { bgcolor: "rgba(139,148,163,0.06)" },
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, bgcolor: isOverdue(r.task, today) ? STATUS_HEX.red : STATUS_HEX[STATUS_COLOR[r.task.status]] }} />
              <Typography variant="caption" noWrap title={r.task.name}>{r.task.name}</Typography>
              {r.task.achievement && <EmojiEventsIcon sx={{ fontSize: 12, color: STATUS_HEX.green, flexShrink: 0 }} />}
            </Box>
          ))}
        </Box>

        <Box ref={scrollRef} sx={{ flex: 1, overflowX: "auto" }}>
          <Box sx={{ position: "relative", width: contentWidth }}>
            {weekendBands.map(d => (
              <Box key={d} sx={{ position: "absolute", top: 0, bottom: 0, left: d * pxPerDay, width: pxPerDay, bgcolor: "rgba(139,148,163,0.08)", zIndex: 0 }} />
            ))}
            <Box sx={{ height: HEADER_H, borderBottom: "1px solid", borderColor: "divider", position: "sticky", top: 0, zIndex: 2, bgcolor: "background.default" }}>
              {headerMarks.map((mark, i) => (
                <Typography key={i} variant="caption" color="text.secondary" sx={{ position: "absolute", top: 0, height: "100%", display: "flex", alignItems: "center", left: mark.offset * pxPerDay + 4, borderLeft: "1px solid", borderColor: "divider", pl: 0.5, fontFamily: "IBM Plex Mono, monospace", whiteSpace: "nowrap" }}>
                  {mark.label}
                </Typography>
              ))}
            </Box>
            <Box sx={{ position: "relative", height: bodyHeight }}>
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <Box sx={{ position: "absolute", top: 0, bottom: 0, left: todayOffset * pxPerDay, width: 2, bgcolor: "primary.light", zIndex: 2 }}>
                  <Typography variant="caption" sx={{ position: "absolute", top: -18, left: 4, color: "primary.light", whiteSpace: "nowrap", fontFamily: "IBM Plex Mono, monospace" }}>Today</Typography>
                </Box>
              )}
              {(() => {
                let y = 0;
                return rows.map((r, i) => {
                  if (r.type === "phase") {
                    const rowY = y; y += PHASE_ROW_H;
                    return <Box key={i} sx={{ position: "absolute", left: 0, right: 0, top: rowY, height: PHASE_ROW_H, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" }} />;
                  }
                  const t = r.task;
                  const rowY = y; y += ROW_H;
                  const left = diffDays(t.plannedStart, projectStartDate) * pxPerDay;
                  const width = Math.max((diffDays(t.plannedFinish, t.plannedStart) + 1) * pxPerDay - 2, 6);
                  // Bars color by whether the task is actually overdue, not
                  // just its literal status field — a "Not Started" task
                  // whose planned finish has already passed is exactly what
                  // a Gantt chart exists to surface, so it renders red here
                  // even though nobody flipped its status to "Delayed".
                  const overdue = isOverdue(t, today);
                  const color = overdue ? STATUS_HEX.red : STATUS_HEX[STATUS_COLOR[t.status]];
                  return (
                    <React.Fragment key={i}>
                      <Box
                        onClick={() => onOpenPhase?.(t.phaseId)}
                        sx={{ position: "absolute", left: 0, right: 0, top: rowY, height: ROW_H, cursor: onOpenPhase ? "pointer" : "default", "&:hover": { bgcolor: "action.hover" } }}
                      />
                      <Tooltip title={`${t.name} · ${fmt(t.plannedStart)} → ${fmt(t.plannedFinish)} · ${overdue ? "Overdue · " : ""}${t.status}`}>
                        <Box
                          onClick={() => onOpenPhase?.(t.phaseId)}
                          sx={{
                            position: "absolute", top: rowY + (ROW_H - BAR_H) / 2, left, width, height: BAR_H, borderRadius: 1, bgcolor: color,
                            border: t.status === "Pending Approval" ? `1px dashed ${STATUS_HEX.violet}` : "none",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.35)", cursor: onOpenPhase ? "pointer" : "default",
                            display: "flex", alignItems: "center", justifyContent: "flex-end", pr: 0.25,
                          }}>
                          {t.achievement && <EmojiEventsIcon sx={{ fontSize: 11, color: achievementIconColor }} />}
                        </Box>
                      </Tooltip>
                    </React.Fragment>
                  );
                });
              })()}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
