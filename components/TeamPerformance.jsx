"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "./Stack.jsx";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import { DataGrid } from "@mui/x-data-grid";
import GroupsIcon from "@mui/icons-material/Groups";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import AssignmentIcon from "@mui/icons-material/Assignment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { EmployeeAvatar, StatCard } from "./common.jsx";
import { fetchTeamPerformance } from "@/lib/api";
import { STATUS_HEX } from "@/lib/theme";

/**
 * Team Performance — every organization employee, with task counts
 * computed dynamically by the /api/team-performance route (which scans
 * every project's tasks for `assignedTo === employee.id`, see
 * lib/businessLogic.aggregateTeamPerformance). Uses MUI's DataGrid so
 * team/completion%/pending/delayed sorting comes for free via column
 * headers.
 *
 * Columns are deliberately consolidated (Total/Completed/Pending merged
 * into a single "Tasks" cell) rather than one raw number per metric —
 * seven bare-number columns read as a wall of digits at a glance. Rows
 * with no assigned work show muted "—" placeholders instead of literal
 * zeros so the eye isn't drawn to noise.
 */
export function TeamPerformance({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const columns = useMemo(() => [
    {
      field: "name", headerName: "Employee", flex: 1.3, minWidth: 220,
      renderCell: (params) => (
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
      field: "team", headerName: "Team", flex: 0.85, minWidth: 130,
      renderCell: (params) => <Chip label={params.value} size="small" variant="outlined" sx={{ fontWeight: 500 }} />,
    },
    {
      field: "total", headerName: "Tasks", type: "number", flex: 0.9, minWidth: 130,
      renderCell: (params) => {
        const { total, completed, pending } = params.row;
        if (!total) return <Typography variant="body2" color="text.disabled">No tasks</Typography>;
        return (
          <Box sx={{ lineHeight: 1.3 }}>
            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.35 }}>{total} total</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35, display: "block" }}>
              {completed} done · {pending} pending
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "delayed", headerName: "Delayed", type: "number", flex: 0.6, minWidth: 100,
      renderCell: (params) => params.value > 0
        ? <Chip label={params.value} size="small" color="error" variant="outlined" />
        : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    {
      field: "completionPct", headerName: "Completion", flex: 1, minWidth: 150,
      renderCell: (params) => {
        if (!params.row.total) return <Typography variant="body2" color="text.disabled">—</Typography>;
        return (
          <Stack sx={{ width: "100%" }} spacing={0.4} justifyContent="center">
            <Typography variant="caption" sx={{ fontFamily: "IBM Plex Mono, monospace" }}>{params.value}%</Typography>
            <LinearProgress
              variant="determinate" value={params.value}
              sx={{
                height: 6, borderRadius: 3, bgcolor: "divider",
                "& .MuiLinearProgress-bar": { bgcolor: params.value >= 70 ? STATUS_HEX.green : params.value >= 40 ? STATUS_HEX.amber : STATUS_HEX.red, borderRadius: 3 },
              }}
            />
          </Stack>
        );
      },
    },
  ], []);

  return (
    <Box>
      <Typography variant="h4">Team Performance</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Task load and delivery across every team member, computed live from assigned tasks across all projects.
      </Typography>

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

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3, height: 640, width: "100%" }}>
          <DataGrid
            rows={rows} columns={columns} getRowId={(r) => r.id} rowHeight={60} columnHeaderHeight={48}
            initialState={{ sorting: { sortModel: [{ field: "completionPct", sort: "desc" }] } }}
            disableRowSelectionOnClick
            sx={{
              border: "none", "& .MuiDataGrid-columnHeaders": { bgcolor: "background.default" },
              "& .MuiDataGrid-cell": { lineHeight: "normal !important", alignItems: "center" },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
            }}
          />
        </Box>
      )}
    </Box>
  );
}
