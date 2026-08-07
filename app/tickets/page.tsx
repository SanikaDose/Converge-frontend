"use client";

import React, { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@/components/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import RefreshIcon from "@mui/icons-material/Refresh";
import { TicketsPanel } from "@/components/TicketsPanel";
import { fetchProjectsIndex } from "@/lib/api";
import { useAppContext } from "@/context/AppContext";
import type { ProjectIndexRow } from "@/lib/types";

export default function TicketsPage() {
  const { actor } = useAppContext();
  const [projects, setProjects] = useState<ProjectIndexRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try { setProjects(await fetchProjectsIndex()); } catch { setProjects([]); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4">Tickets</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Every issue reported across all projects, in one place.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={() => setRefreshKey((k) => k + 1)}><RefreshIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ mt: 3 }}>
        <TicketsPanel
          actor={actor}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
          refreshKey={refreshKey}
        />
      </Box>
    </Box>
  );
}
