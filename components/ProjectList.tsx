"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { alpha } from "@mui/material/styles";
import { EmployeeAvatar } from "./common";
import { fmt } from "@/lib/dateUtils";
import { DASHBOARD_COLORS } from "@/lib/theme";
import { useOrgContext } from "@/context/OrgContext";
import { projectsApi } from "@/store/api/projectsApi";
import type { ProjectWithLiveStats } from "@/lib/types";

// Shared column template so the header row and every data row line up. Kept as
// a single string used by both — a min-width per column plus an overall minWidth
// on the scroll container means the table stays aligned and scrolls sideways on
// a narrow viewport instead of squashing.
const GRID_COLS = "36px minmax(180px, 2.2fr) minmax(120px, 1.3fr) minmax(130px, 1.3fr) minmax(150px, 1.2fr) minmax(130px, 1.7fr) 56px 120px 84px 44px";
const MIN_WIDTH = 1040;

/** Health chip mirrors ProjectCard exactly (delayed → red, complete → green,
 *  otherwise on track) so Card and List views never disagree. */
function healthChip(p: ProjectWithLiveStats): { label: string; hex: string } {
  if (p.delayed > 0) return { label: "Delayed", hex: DASHBOARD_COLORS.red };
  if (p.pct >= 100) return { label: "Completed", hex: DASHBOARD_COLORS.green };
  return { label: "On track", hex: DASHBOARD_COLORS.green };
}

function HeaderCell({ children, sx }: { children?: React.ReactNode; sx?: object }) {
  return (
    <Typography variant="caption" sx={{
      fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, fontSize: 10.5,
      color: "text.secondary", ...sx,
    }}>
      {children}
    </Typography>
  );
}

function ProjectListRow({ project, index, onOpen }: {
  project: ProjectWithLiveStats;
  index: number;
  onOpen: (id: string) => void;
}) {
  const { employeeLabel } = useOrgContext();
  const router = useRouter();
  const prefetchDetail = projectsApi.usePrefetch("getProject");
  const warmed = React.useRef(false);
  const warm = () => {
    if (warmed.current) return;
    warmed.current = true;
    prefetchDetail(project.id);
    router.prefetch(`/projects/${project.id}`);
  };

  const chip = healthChip(project);
  const pctHex = project.pct >= 100 ? DASHBOARD_COLORS.green : project.delayed > 0 ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.amber;
  const phases = (project.phases || []).filter(p => !p.notRequired);

  return (
    <Box
      onClick={() => onOpen(project.id)} onMouseEnter={warm} onFocus={warm}
      sx={{
        display: "grid", gridTemplateColumns: GRID_COLS, alignItems: "center", gap: 1.5,
        px: 2, py: 1.25, cursor: "pointer", borderBottom: "1px solid", borderColor: "divider",
        transition: "background-color .12s ease",
        "&:hover": { bgcolor: "action.hover" },
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      {/* # */}
      <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600, textAlign: "center" }}>{index}</Typography>

      {/* Project name + type */}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>{project.name}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
          {project.type || "Product"}{project.location ? ` · ${project.location}` : ""}
        </Typography>
      </Box>

      {/* Customer */}
      <Typography variant="body2" color="text.secondary" noWrap>{project.customer || "—"}</Typography>

      {/* Owner */}
      {project.owner ? (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <EmployeeAvatar employeeId={project.owner} size={24} />
          <Typography variant="body2" noWrap>{employeeLabel(project.owner)}</Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.disabled">No lead</Typography>
      )}

      {/* Timeline */}
      <Typography variant="caption" color="text.secondary" noWrap>{fmt(project.startDate)} → {fmt(project.endDate)}</Typography>

      {/* Phase progress — same segmented bar as the card. */}
      <Tooltip title={`${project.completed}/${project.total} tasks done`}>
        <Stack direction="row" spacing={0.4} sx={{ width: "100%" }}>
          {phases.length === 0
            ? <Box sx={{ flex: 1, height: 6, borderRadius: 0.5, bgcolor: "divider" }} />
            : phases.map((p, i) => (
              <Box key={i} title={`${p.name} — ${p.completed}/${p.total} done`} sx={{
                flex: 1, height: 6, borderRadius: 0.5,
                bgcolor: p.color === "slate" ? "divider" : DASHBOARD_COLORS[p.color],
                opacity: p.color === "slate" ? 1 : (p.total && p.completed === p.total ? 1 : 0.85),
              }} />
            ))}
        </Stack>
      </Tooltip>

      {/* % */}
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: pctHex, textAlign: "right" }}>{project.pct}%</Typography>

      {/* Status */}
      <Chip label={chip.label} size="small" sx={{
        justifySelf: "start", height: 22, fontSize: 11, fontWeight: 700,
        color: chip.hex, bgcolor: alpha(chip.hex, 0.14),
      }} />

      {/* Delay — count of delayed tasks (the card's red-chip metric). */}
      {project.delayed > 0
        ? <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: DASHBOARD_COLORS.red }}>{project.delayed} delayed</Typography>
        : <Typography variant="body2" color="text.disabled">—</Typography>}

      {/* Actions */}
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onOpen(project.id); }} sx={{ color: "text.secondary", justifySelf: "center" }}>
        <ArrowForwardIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

/** List/table view of the projects in one status group — same data as the
 *  cards, laid out as aligned rows. Horizontally scrollable on narrow screens. */
export function ProjectList({ projects, onOpen }: {
  projects: ProjectWithLiveStats[];
  onOpen: (id: string) => void;
}) {
  return (
    <Box sx={{ width: "100%", overflowX: "auto" }}>
      <Box sx={{ minWidth: MIN_WIDTH }}>
        {/* Header */}
        <Box sx={{
          display: "grid", gridTemplateColumns: GRID_COLS, alignItems: "center", gap: 1.5,
          px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider",
        }}>
          <HeaderCell sx={{ textAlign: "center" }}>#</HeaderCell>
          <HeaderCell>Project Name</HeaderCell>
          <HeaderCell>Customer</HeaderCell>
          <HeaderCell>Owner</HeaderCell>
          <HeaderCell>Timeline</HeaderCell>
          <HeaderCell>Phase Progress</HeaderCell>
          <HeaderCell sx={{ textAlign: "right" }}>%</HeaderCell>
          <HeaderCell>Status</HeaderCell>
          <HeaderCell>Delay</HeaderCell>
          <HeaderCell sx={{ textAlign: "center" }}>Open</HeaderCell>
        </Box>
        {projects.map((p, i) => (
          <ProjectListRow key={p.id} project={p} index={i + 1} onOpen={onOpen} />
        ))}
      </Box>
    </Box>
  );
}
