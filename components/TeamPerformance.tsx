"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
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
import CircularProgress from "@mui/material/CircularProgress";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import GroupsIcon from "@mui/icons-material/Groups";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import AssignmentIcon from "@mui/icons-material/Assignment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import { EmployeeAvatar, StatCard } from "./common";
import { fetchTeamPerformance } from "@/lib/api";
import { avatarColor } from "@/lib/data";
import type { TeamPerformanceRow } from "@/lib/types";

type StatusFilter = "all" | "delayed" | "unassigned";

/**
 * Team Performance — every organization employee, with task counts
 * computed dynamically by the /api/team-performance route (which scans
 * every project's tasks for `assignedTo === employee.id`, see
 * lib/businessLogic.aggregateTeamPerformance). Uses MUI's DataGrid so
 * team/tasks/delayed sorting comes for free via column headers.
 *
 * Columns are deliberately consolidated (Total/Completed/Pending merged
 * into a single "Tasks" cell) rather than one raw number per metric —
 * seven bare-number columns read as a wall of digits at a glance. Rows
 * with no assigned work show muted "—" placeholders instead of literal
 * zeros so the eye isn't drawn to noise.
 */
export function TeamPerformance({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<TeamPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchTeamPerformance()); } catch { setRows([]); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

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

  const columns = useMemo<GridColDef<TeamPerformanceRow>[]>(() => [
    {
      field: "name", headerName: "Employee", flex: 1.3, minWidth: 220,
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ height: "100%" }}>
          <EmployeeAvatar employeeId={params.row.id} size={30} />
          <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
            <Typography variant="body2" noWrap sx={{ lineHeight: 1.35 }}>{params.row.name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ lineHeight: 1.35, display: "block" }}>{params.row.role}</Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: "team", headerName: "Team", flex: 0.85, minWidth: 140,
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: avatarColor(params.value) }} />
          <Typography variant="body2" noWrap>{params.value}</Typography>
        </Stack>
      ),
    },
    {
      field: "total", headerName: "Tasks", type: "number", flex: 0.9, minWidth: 130,
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => {
        const { total, completed, pending } = params.row;
        if (!total) return <Typography variant="body2" color="text.disabled">No tasks</Typography>;
        return (
          <Box sx={{ lineHeight: 1.3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.35 }}>{total} total</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, display: "block" }}>
              {completed} done · {pending} pending
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "delayed", headerName: "Delayed", type: "number", flex: 0.6, minWidth: 100,
      renderCell: (params: GridRenderCellParams<TeamPerformanceRow>) => params.value > 0
        ? <Chip label={params.value} size="small" color="error" variant="outlined" />
        : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
  ], []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Team</Typography>

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
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5, height: 640, width: "100%" }}>
          <DataGrid
            rows={filteredRows} columns={columns} getRowId={(r) => r.id} rowHeight={64} columnHeaderHeight={48}
            initialState={{ sorting: { sortModel: [{ field: "total", sort: "desc" }] } }}
            disableRowSelectionOnClick
            slotProps={{ noRowsOverlay: { sx: { color: "text.secondary" } } }}
            localeText={{ noRowsLabel: "No team members match these filters." }}
            sx={{
              border: "none", "& .MuiDataGrid-columnHeaders": { bgcolor: "background.default" },
              "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.4, color: "text.secondary" },
              "& .MuiDataGrid-cell": { lineHeight: "normal !important", alignItems: "center", borderColor: "divider" },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
              "& .MuiDataGrid-row:hover": { bgcolor: "action.hover" },
              "& .MuiDataGrid-footerContainer": { borderColor: "divider" },
            }}
          />
        </Box>
      )}
    </Box>
  );
}
