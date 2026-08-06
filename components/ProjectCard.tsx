"use client";
import React from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { CompletionRing } from "./CompletionRing";
import { fmt } from "@/lib/dateUtils";
import { useStatusHex } from "@/lib/theme";
import type { ProjectWithLiveStats } from "@/lib/types";

/** Unchanged card content from the original build — now an MUI Paper-ish Box, inside the status accordions. */
export function ProjectCard({ project, onOpen }: { project: ProjectWithLiveStats; onOpen: (id: string) => void }) {
  const STATUS_HEX = useStatusHex();
  const delayed = project.delayed > 0;
  return (
    <Box onClick={() => onOpen(project.id)} sx={{
      bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 2.5, p: 2.25,
      cursor: "pointer", transition: "border-color .15s ease, transform .15s ease",
      "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" },
    }}>
      <Stack direction="row" justifyContent="space-between" gap={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Chip label={project.type || "Product"} size="small" variant="outlined" sx={{ fontSize: 10 }} />
          <Typography sx={{ mt: 0.75, fontSize: 16, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {project.name}
          </Typography>
          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.5, color: "text.secondary" }}>
            <BusinessIcon sx={{ fontSize: 13 }} /><Typography variant="caption">{project.customer}</Typography>
          </Stack>
        </Box>
        <CompletionRing pct={project.pct} />
      </Stack>

      <Stack direction="row" spacing={0.4} sx={{ mt: 2 }}>
        {(project.phases || []).map((p, i) => (
          <Box key={i} title={`${p.name} — ${p.completed}/${p.total} done`} sx={{
            flex: 1, height: 6, borderRadius: 0.5,
            bgcolor: p.color === "slate" ? "divider" : STATUS_HEX[p.color],
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
          ? <Chip label={`${project.delayed} delayed`} size="small" color="error" />
          : <Chip label="On track" size="small" color="success" />}
      </Stack>
    </Box>
  );
}
