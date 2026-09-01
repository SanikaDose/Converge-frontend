"use client";
import React from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlineOutlined";
import { CompletionRing } from "./CompletionRing";
import HistoryIcon from "@mui/icons-material/History";
import { fmt, fmtDateTime } from "@/lib/dateUtils";
import { DASHBOARD_COLORS } from "@/lib/theme";
import { useOrgContext } from "@/context/OrgContext";
import type { ProjectWithLiveStats } from "@/lib/types";

/** Unchanged card content from the original build — now an MUI Paper-ish Box, inside the status accordions. */
export function ProjectCard({ project, onOpen }: { project: ProjectWithLiveStats; onOpen: (id: string) => void }) {
  const { employeeLabel } = useOrgContext();
  const delayed = project.delayed > 0;
  return (
    <Box onClick={() => onOpen(project.id)} sx={{
      position: "relative",
      bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 2.5, p: 2.25,
      cursor: "pointer", transition: "border-color .15s ease, transform .15s ease",
      "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" },
    }}>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onOpen(project.id); }}
        sx={{ position: "absolute", top: 8, right: 8, color: "text.secondary" }}
      >
        <ArrowForwardIcon fontSize="small" />
      </IconButton>

      <Stack direction="row" justifyContent="space-between" gap={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Chip label={project.type || "Product"} size="small" variant="outlined" sx={{ fontSize: 10 }} />
          <Typography sx={{ mt: 0.75, fontSize: 16, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pr: 3 }}>
            {project.name}
          </Typography>
          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.5, color: "text.secondary" }}>
            <BusinessIcon sx={{ fontSize: 13 }} />
            <Typography variant="caption" noWrap sx={{ pr: 3 }}>
              {project.customer}{project.location ? ` · ${project.location}` : ""}
            </Typography>
          </Stack>
          {/* Project lead / team manager. */}
          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.35, color: "text.secondary" }}>
            <PersonOutlineIcon sx={{ fontSize: 13 }} />
            <Typography variant="caption" noWrap sx={{ pr: 3 }}>
              {project.owner ? employeeLabel(project.owner) : "No lead assigned"}
            </Typography>
          </Stack>
        </Box>
        {/* Nudged below the absolutely-positioned arrow button (top:8, ~34px tall) so its top-right edge doesn't sit under it. */}
        <Box sx={{ mt: 3.5, flexShrink: 0 }}>
          {/* Ring colour reflects status: green when fully complete, red when
              the project has overdue work, otherwise the default amber. */}
          <CompletionRing pct={project.pct} color={project.pct >= 100 ? "green" : delayed ? "red" : "amber"} />
        </Box>
      </Stack>

      <Stack direction="row" spacing={0.4} sx={{ mt: 2 }}>
        {(project.phases || []).map((p, i) => (
          <Box key={i} title={`${p.name} — ${p.completed}/${p.total} done`} sx={{
            flex: 1, height: 6, borderRadius: 0.5,
            bgcolor: p.color === "slate" ? "divider" : DASHBOARD_COLORS[p.color],
            opacity: p.color === "slate" ? 1 : (p.total && p.completed === p.total ? 1 : 0.85),
          }} />
        ))}
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.75 }}>
        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ color: "text.secondary" }}>
          <CalendarMonthIcon sx={{ fontSize: 13 }} />
          <Typography variant="caption">{fmt(project.startDate)} → {fmt(project.endDate)}</Typography>
        </Stack>
        {delayed
          ? <Chip label={`${project.delayed} delayed`} size="small" sx={{ bgcolor: DASHBOARD_COLORS.red, color: "#fff", fontWeight: 700 }} />
          : <Chip label="On track" size="small" sx={{ bgcolor: DASHBOARD_COLORS.green, color: "#fff", fontWeight: 700 }} />}
      </Stack>

      {project.updatedAt && (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1, color: "text.disabled" }}>
          <HistoryIcon sx={{ fontSize: 12 }} />
          <Typography variant="caption" sx={{ fontSize: 10.5 }}>Last updated {fmtDateTime(project.updatedAt)}</Typography>
        </Stack>
      )}
    </Box>
  );
}
