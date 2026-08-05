"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack.jsx";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import { DataGrid } from "@mui/x-data-grid";
import { EmployeeAvatar } from "./common.jsx";
import { fetchTeamPerformance } from "@/lib/api";
import { STATUS_HEX } from "@/lib/theme";

/**
 * Team Performance — every organization employee, with task counts
 * computed dynamically by the /api/team-performance route (which scans
 * every project's tasks for `assignedTo === employee.id`, see
 * lib/businessLogic.aggregateTeamPerformance). Uses MUI's DataGrid so
 * team/completion%/pending/delayed sorting comes for free via column
 * headers.
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

  const columns = useMemo(() => [
    {
      field: "name", headerName: "Employee", flex: 1.3, minWidth: 220,
      renderCell: (params) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ height: "100%" }}>
          <EmployeeAvatar employeeId={params.row.id} size={30} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap>{params.row.name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{params.row.role}</Typography>
          </Box>
        </Stack>
      ),
    },
    { field: "team", headerName: "Team", flex: 0.9, minWidth: 140 },
    { field: "total", headerName: "Total Tasks", type: "number", flex: 0.7, minWidth: 100 },
    { field: "completed", headerName: "Completed", type: "number", flex: 0.7, minWidth: 100 },
    { field: "pending", headerName: "Pending", type: "number", flex: 0.7, minWidth: 100 },
    {
      field: "delayed", headerName: "Delayed", type: "number", flex: 0.7, minWidth: 100,
      renderCell: (params) => params.value > 0
        ? <Chip label={params.value} size="small" color="error" variant="outlined" />
        : <Typography variant="body2" color="text.secondary">0</Typography>,
    },
    {
      field: "completionPct", headerName: "Completion %", flex: 1.1, minWidth: 160,
      renderCell: (params) => (
        <Stack sx={{ width: "100%" }} spacing={0.4} justifyContent="center">
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" sx={{ fontFamily: "IBM Plex Mono, monospace" }}>{params.value}%</Typography>
          </Stack>
          <LinearProgress
            variant="determinate" value={params.value}
            sx={{
              height: 6, borderRadius: 3, bgcolor: "divider",
              "& .MuiLinearProgress-bar": { bgcolor: params.value >= 70 ? STATUS_HEX.green : params.value >= 40 ? STATUS_HEX.amber : STATUS_HEX.red, borderRadius: 3 },
            }}
          />
        </Stack>
      ),
    },
  ], []);

  return (
    <Box>
      <Typography variant="h4">Team Performance</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Task load and delivery across every team member, computed live from assigned tasks across all projects.
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 3, height: 640, width: "100%" }}>
          <DataGrid
            rows={rows} columns={columns} getRowId={(r) => r.id} rowHeight={56}
            initialState={{ sorting: { sortModel: [{ field: "completionPct", sort: "desc" }] } }}
            disableRowSelectionOnClick
            sx={{
              border: "none", "& .MuiDataGrid-columnHeaders": { bgcolor: "background.default" },
              "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": { outline: "none" },
            }}
          />
        </Box>
      )}
    </Box>
  );
}
