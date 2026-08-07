"use client";
import React, { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import BusinessIcon from "@mui/icons-material/Business";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { CompletionRing } from "./CompletionRing";
import { fmt } from "@/lib/dateUtils";
import { DASHBOARD_COLORS } from "@/lib/theme";
import type { ProjectWithLiveStats } from "@/lib/types";

/** Unchanged card content from the original build — now an MUI Paper-ish Box, inside the status accordions. */
export function ProjectCard({ project, onOpen }: { project: ProjectWithLiveStats; onOpen: (id: string) => void }) {
  const delayed = project.delayed > 0;
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  return (
    <Box onClick={() => onOpen(project.id)} sx={{
      position: "relative",
      bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 2.5, p: 2.25,
      cursor: "pointer", transition: "border-color .15s ease, transform .15s ease",
      "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" },
    }}>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
        sx={{ position: "absolute", top: 8, right: 8, color: "text.secondary" }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={(e) => { (e as { stopPropagation?: () => void })?.stopPropagation?.(); setMenuAnchor(null); }}
        onClick={(e) => e.stopPropagation()}>
        <MenuItem onClick={() => { setMenuAnchor(null); onOpen(project.id); }}>
          <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
          Open project
        </MenuItem>
      </Menu>

      <Stack direction="row" justifyContent="space-between" gap={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Chip label={project.type || "Product"} size="small" variant="outlined" sx={{ fontSize: 10 }} />
          <Typography sx={{ mt: 0.75, fontSize: 16, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pr: 3 }}>
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
    </Box>
  );
}
