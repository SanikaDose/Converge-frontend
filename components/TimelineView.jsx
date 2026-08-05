"use client";
import React, { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack.jsx";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { STATUS_COLOR, TEMPLATE } from "@/lib/data";
import { fmt, addDays, diffDays, isWeekend } from "@/lib/dateUtils";
import { STATUS_HEX } from "@/lib/theme";

const ROW_H = 34;
const PHASE_ROW_H = 30;
const ZOOM_PX = { Week: 26, Month: 11, Quarter: 4.5 };

function LegendSwatch({ color, label, textColor }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ color: textColor || "text.secondary" }}>{label}</Typography>
    </Stack>
  );
}

/**
 * Enhanced Gantt/timeline. Bars are positioned from each task's actual
 * calendar `plannedStart`/`plannedFinish` (not the business-day
 * dayOffset, which is a *working-day* count and no longer matches the
 * pixel-per-calendar-day x-axis once weekends are skipped). Weekend
 * columns are shaded, today gets a marker line, achievement tasks get a
 * trophy glyph, and a zoom control switches Week/Month/Quarter density.
 */
export function TimelineView({ phases, tasks, projectStartDate, projectEndDate, today }) {
  const [zoom, setZoom] = useState("Week");
  const pxPerDay = ZOOM_PX[zoom];

  const rows = useMemo(() => {
    const out = [];
    phases.forEach((p) => {
      out.push({ type: "phase", name: p.name, id: p.id });
      tasks.filter(t => t.phaseId === p.id).sort((a, b) => a.order - b.order).forEach(t => out.push({ type: "task", task: t }));
    });
    return out;
  }, [phases, tasks]);

  const totalDays = useMemo(() => {
    const finishes = tasks.map(t => t.plannedFinish);
    const maxFinish = finishes.length ? finishes.reduce((a, b) => a > b ? a : b) : projectEndDate;
    return Math.max(diffDays(maxFinish, projectStartDate), diffDays(projectEndDate, projectStartDate)) + 3;
  }, [tasks, projectStartDate, projectEndDate]);

  const weeks = useMemo(() => {
    const arr = [];
    for (let d = 0; d <= totalDays; d += 7) arr.push(Math.floor(d / 7) + 1);
    return arr;
  }, [totalDays]);

  const weekendBands = useMemo(() => {
    const bands = [];
    for (let d = 0; d <= totalDays; d++) {
      if (isWeekend(addDays(projectStartDate, d))) bands.push(d);
    }
    return bands;
  }, [totalDays, projectStartDate]);

  const contentWidth = totalDays * pxPerDay;
  const todayOffset = diffDays(today, projectStartDate);
  const bodyHeight = rows.reduce((h, r) => h + (r.type === "phase" ? PHASE_ROW_H : ROW_H), 0);

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
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: "rgba(139,148,163,0.18)", border: "1px solid #2a323d" }} />
            <Typography variant="caption" color="text.secondary">Weekend</Typography>
          </Stack>
        </Stack>
        <ToggleButtonGroup size="small" exclusive value={zoom} onChange={(e, v) => v && setZoom(v)}>
          {Object.keys(ZOOM_PX).map(z => <ToggleButton key={z} value={z}>{z}</ToggleButton>)}
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ display: "flex", border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper", overflow: "hidden" }}>
        <Box sx={{ flexShrink: 0, width: 220, borderRight: "1px solid", borderColor: "divider" }}>
          <Box sx={{ height: 34, borderBottom: "1px solid", borderColor: "divider" }} />
          {rows.map((r, i) => r.type === "phase" ? (
            <Box key={i} sx={{ height: PHASE_ROW_H, display: "flex", alignItems: "center", px: 1.75, bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider", textTransform: "uppercase", letterSpacing: 0.3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} noWrap>{r.name}</Typography>
            </Box>
          ) : (
            <Box key={i} sx={{ height: ROW_H, display: "flex", alignItems: "center", gap: 1, px: 1.75, borderBottom: "1px solid", borderColor: "divider" }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, bgcolor: STATUS_HEX[STATUS_COLOR[r.task.status]] }} />
              <Typography variant="caption" noWrap title={r.task.name}>{r.task.name}</Typography>
              {r.task.achievement && <EmojiEventsIcon sx={{ fontSize: 12, color: STATUS_HEX.green, flexShrink: 0 }} />}
            </Box>
          ))}
        </Box>

        <Box sx={{ flex: 1, overflowX: "auto" }}>
          <Box sx={{ position: "relative", width: contentWidth }}>
            {weekendBands.map(d => (
              <Box key={d} sx={{ position: "absolute", top: 0, bottom: 0, left: d * pxPerDay, width: pxPerDay, bgcolor: "rgba(139,148,163,0.08)", zIndex: 0 }} />
            ))}
            <Box sx={{ height: 34, borderBottom: "1px solid", borderColor: "divider", position: "relative", bgcolor: "background.default" }}>
              {weeks.map((w, i) => (
                <Typography key={i} variant="caption" color="text.secondary" sx={{ position: "absolute", top: 0, height: "100%", display: "flex", alignItems: "center", left: i * 7 * pxPerDay + 4, borderLeft: "1px solid", borderColor: "divider", pl: 0.5, fontFamily: "IBM Plex Mono, monospace" }}>
                  Wk {w}
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
                  const color = STATUS_HEX[STATUS_COLOR[t.status]];
                  return (
                    <Tooltip key={i} title={`${t.name} · ${fmt(t.plannedStart)} → ${fmt(t.plannedFinish)} · ${t.status}`}>
                      <Box sx={{
                        position: "absolute", top: rowY + (ROW_H - 16) / 2, left, width, height: 16, borderRadius: 0.75, bgcolor: color,
                        border: t.status === "Pending Approval" ? `1px dashed ${STATUS_HEX.violet}` : "none",
                        display: "flex", alignItems: "center", justifyContent: "flex-end", pr: 0.25,
                      }}>
                        {t.achievement && <EmojiEventsIcon sx={{ fontSize: 11, color: "#0c2b1e" }} />}
                      </Box>
                    </Tooltip>
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
