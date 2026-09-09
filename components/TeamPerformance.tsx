"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Menu from "@mui/material/Menu";
import ListItemIcon from "@mui/material/ListItemIcon";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import { DataGrid, type GridColDef, type GridColumnGroupingModel, type GridRenderCellParams } from "@mui/x-data-grid";
import GroupsIcon from "@mui/icons-material/Groups";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import AssignmentIcon from "@mui/icons-material/Assignment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import { useRouter } from "next/navigation";
import { EmployeeAvatar, StatCard } from "./common";
import { useGetTeamPerformanceQuery } from "@/store/api/teamPerformanceApi";
import { avatarColor } from "@/lib/data";
import { DASHBOARD_COLORS } from "@/lib/theme";
import type { OrgRole, TeamPerformanceRow } from "@/lib/types";

type StatusFilter = "all" | "delayed" | "unassigned";

const ROLE_COLOR: Record<OrgRole, string> = {
  "Admin": DASHBOARD_COLORS.violet,
  "User": DASHBOARD_COLORS.blue,
  "Lead": DASHBOARD_COLORS.blue,
};

/**
 * Team Performance — every organization employee, with task counts
 * computed dynamically by the /api/team-performance route (which scans
 * every project's tasks for `assignedTo === employee.id`, see
 * lib/businessLogic.aggregateTeamPerformance). Uses MUI's DataGrid so
 * team/tasks sorting comes for free via column headers.
 *
 * Task counts get their own grouped "Tasks" header (Total/Done/Pending)
 * rather than one bare "Tasks" column, and a per-row overdue count rides
 * inside the Pending cell instead of a dedicated Delayed column — that
 * total already has a home in the KPI row above, so repeating it as a
 * full table column was pure duplication.
 */
export function TeamPerformance({ refreshKey }: { refreshKey: number }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionMenu, setActionMenu] = useState<{ el: HTMLElement; row: TeamPerformanceRow } | null>(null);

  // `refreshKey` is retained as a prop so the page's contract is unchanged;
  // a bump still forces a refetch, and the Refresh button maps to RTK
  // Query's own refetch. An error falls back to an empty list, as before.
  const { data, isFetching, refetch } = useGetTeamPerformanceQuery();
  const rows: TeamPerformanceRow[] = useMemo(() => data ?? [], [data]);
  const loading = isFetching;
  const load = refetch;
  useEffect(() => { if (refreshKey) refetch(); }, [refreshKey, refetch]);

  const summary = useMemo(() => {
    const active = rows.filter(r => r.total > 0);
    const totalDelayed = rows.reduce((a, r) => a + (r.delayed || 0), 0);
    const totalTasks = rows.reduce((a, r) => a + (r.total || 0), 0);
    const avgPct = active.length ? Math.round(active.reduce((a, r) => a + r.completionPct, 0) / active.length) : 0;
    return { members: rows.length, totalTasks, totalDelayed, avgPct };
  }, [rows]);

  const teams = useMemo(() => Array.from(new Set(rows.map(r => r.team))).sort(), [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !r.role.toLowerCase().includes(q)) return false;
      if (teamFilter !== "All" && r.team !== teamFilter) return false;
      if (statusFilter === "delayed" && !(r.delayed > 0)) return false;
      if (statusFilter === "unassigned" && r.total > 0) return false;
      return true;
    });
  }, [rows, query, teamFilter, statusFilter]);

  const columnGroupingModel: GridColumnGroupingModel = [
    {
      groupId: "tasks", headerName: "Tasks", headerAlign: "center",
      children: [{ field: "total" }, { field: "completed" }, { field: "pending" }],
    },
  ];

  const columns = useMemo<GridColDef<TeamPerformanceRow>[]>(() => [
    {
      field: "name", headerName: "Employee", flex: 1.2, minWidth: 210,
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ height: "100%" }}>
          <EmployeeAvatar employeeId={params.row.id} size={32} />
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{params.row.name}</Typography>
        </Stack>
      ),
    },
    {
      field: "role", headerName: "Role", flex: 0.7, minWidth: 130,
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => {
        const color = ROLE_COLOR[params.value as OrgRole] || DASHBOARD_COLORS.slate;
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Chip label={params.value} size="small" sx={{
              bgcolor: alpha(color, 0.14), color, fontWeight: 700, fontSize: 11.5,
            }} />
          </Box>
        );
      },
    },
    {
      field: "team", headerName: "Team", flex: 0.8, minWidth: 140,
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: avatarColor(params.value) }} />
          <Typography variant="body2" noWrap>{params.value}</Typography>
        </Stack>
      ),
    },
    {
      field: "total", headerName: "Total", type: "number", flex: 0.45, minWidth: 104, align: "center", headerAlign: "center",
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{params.value || "—"}</Typography>
        </Box>
      ),
    },
    {
      field: "completed", headerName: "Done", type: "number", flex: 0.45, minWidth: 80, align: "center", headerAlign: "center",
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <Typography variant="body2" sx={{ color: params.value ? DASHBOARD_COLORS.green : "text.disabled", fontWeight: 600 }}>
            {params.row.total ? params.value : "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "pending", headerName: "Pending", type: "number", flex: 0.7, minWidth: 120, align: "center", headerAlign: "center",
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => {
        if (!params.row.total) {
          return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Typography variant="body2" color="text.disabled">—</Typography>
            </Box>
          );
        }
        return (
          <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{params.value}</Typography>
            {params.row.delayed > 0 && (
              <Tooltip title={`${params.row.delayed} overdue`}>
                <Chip label={params.row.delayed} size="small" sx={{
                  height: 18, minWidth: 18, fontSize: 10.5, fontWeight: 700,
                  bgcolor: alpha(DASHBOARD_COLORS.red, 0.14), color: DASHBOARD_COLORS.red,
                  "& .MuiChip-label": { px: 0.6 },
                }} />
              </Tooltip>
            )}
          </Stack>
        );
      },
    },
    {
      field: "actions", headerName: "", sortable: false, filterable: false, disableColumnMenu: true,
      width: 64, align: "center", headerAlign: "center",
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setActionMenu({ el: e.currentTarget, row: params.row }); }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ], []);

  return (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={GroupsIcon} label="Team Members" value={summary.members} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={AssignmentIcon} label="Total Tasks" value={summary.totalTasks} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={DonutLargeIcon} label="Avg. Completion" value={`${summary.avgPct}%`} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard icon={WarningAmberIcon} label="Delayed Tasks" value={summary.totalDelayed}
            color={summary.totalDelayed > 0 ? "error.main" : "success.main"} />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
        <TextField
          fullWidth size="small" placeholder="Search by name or role…" value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
        <Select size="small" value={teamFilter} onChange={(e: SelectChangeEvent) => setTeamFilter(e.target.value)}
          sx={{ minWidth: 170, flexShrink: 0 }}>
          <MenuItem value="All">All Teams</MenuItem>
          {teams.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </Select>
        <Select size="small" value={statusFilter} onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value as StatusFilter)}
          sx={{ minWidth: 160, flexShrink: 0 }}>
          <MenuItem value="all">All Members</MenuItem>
          <MenuItem value="delayed">Delayed only</MenuItem>
          <MenuItem value="unassigned">No tasks</MenuItem>
        </Select>
        <Tooltip title="Refresh"><IconButton onClick={load}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <Paper elevation={4} sx={{
          border: "1px solid", borderColor: "divider", borderRadius: 2,
          boxShadow: "0 8px 24px rgba(16,24,40,0.16), 0 2px 8px rgba(16,24,40,0.10)",
          height: 640, width: "100%", overflow: "hidden",
        }}>
          <DataGrid
            rows={filteredRows} columns={columns} columnGroupingModel={columnGroupingModel}
            getRowId={(r) => r.id} rowHeight={62} columnHeaderHeight={40} columnGroupHeaderHeight={30}
            initialState={{ sorting: { sortModel: [{ field: "name", sort: "asc" }] } }}
            disableRowSelectionOnClick
            // Click a member → open the Kanban board filtered to their tasks.
            onRowClick={(params) => router.push(`/kanban?user=${params.row.id}`)}
            showColumnVerticalBorder
            slotProps={{ noRowsOverlay: { sx: { color: "text.secondary" } } }}
            localeText={{ noRowsLabel: "No team members match these filters." }}
            sx={{
              border: "none",
              // Muted deep navy (not the vibrant brand blue used for
              // buttons/icons elsewhere) — a full-width header fill in that
              // brighter blue read as overwhelming, per feedback.
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: "#1E3A5F",
              },
              "& .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeader--filledGroup, & .MuiDataGrid-columnHeaderRow": {
                bgcolor: "transparent",
                "&:focus, &:focus-within": { outline: "none" },
              },
              // DataGrid draws its own divider under a grouped header's
              // label, but it's scoped to the title container's own inset
              // width (not the full "Tasks" cell, and not at all over the
              // empty-group Employee/Role/Team cells) — on a light theme
              // that reads as a subtle accent; on our navy fill it read as
              // a stray half-width line. Neutralize it below.
              "& .MuiDataGrid-columnHeaderTitleContainer": {
                borderBottom: "none",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 700, fontSize: 11.5, textTransform: "uppercase", letterSpacing: 0.8, color: "#ffffff",
              },
              "& .MuiDataGrid-iconButtonContainer .MuiIconButton-root, & .MuiDataGrid-menuIcon .MuiIconButton-root, & .MuiDataGrid-sortButton": {
                color: "#ffffff", bgcolor: "transparent",
                "&:hover": { bgcolor: "rgba(255,255,255,0.14)" },
              },
              "& .MuiDataGrid-columnSeparator": { color: "rgba(255,255,255,0.2)" },
              "& .MuiDataGrid-withBorderColor": { borderColor: "divider" },
              // Must come after the rule above (same specificity, later
              // wins) or that rule's borderColor: "divider" — meant for the
              // body grid lines — resets these back to the pale grey used
              // on a white background, invisible against navy.
              "& .MuiDataGrid-columnHeader--filledGroup, & .MuiDataGrid-columnHeader--emptyGroup": {
                borderBottom: "1px solid rgba(255,255,255,0.22)",
              },
              "& .MuiDataGrid-cell": { lineHeight: "normal !important", alignItems: "center", borderColor: "divider" },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
              "& .MuiDataGrid-row": { transition: "background-color .12s ease", cursor: "pointer" },
              "& .MuiDataGrid-row:nth-of-type(even)": { bgcolor: "action.hover" },
              "& .MuiDataGrid-row:hover": { bgcolor: "action.selected" },
              "& .MuiDataGrid-footerContainer": { borderColor: "divider" },
            }}
          />
        </Paper>
      )}

      <Menu anchorEl={actionMenu?.el} open={!!actionMenu} onClose={() => setActionMenu(null)}>
        <MenuItem onClick={() => { if (actionMenu) setQuery(actionMenu.row.name); setActionMenu(null); }}>
          <ListItemIcon><FilterAltIcon fontSize="small" /></ListItemIcon>
          Show only this member
        </MenuItem>
      </Menu>
    </Box>
  );
}
