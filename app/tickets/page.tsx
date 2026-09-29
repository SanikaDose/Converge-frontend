"use client";

import React, { useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DonutLargeIcon from "@mui/icons-material/DonutLarge";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ReplayCircleFilledIcon from "@mui/icons-material/ReplayCircleFilled";
import { TicketsPanel } from "@/components/TicketsPanel";
import { StatCard, computeStatTrend } from "@/components/common";
import { useGetProjectsQuery } from "@/store/api/projectsApi";
import { useGetTicketsQuery } from "@/store/api/ticketsApi";
import { useGetDashboardBaselineQuery } from "@/store/api/dashboardApi";
import { DASHBOARD_COLORS } from "@/lib/theme";
import { useAppContext } from "@/context/AppContext";
import type { DashboardBaseline, ProjectIndexRow, Ticket } from "@/lib/types";

export default function TicketsPage() {
  const { actor } = useAppContext();
  // These KPIs read the same cached queries the panel below does, so a
  // ticket edit updates both from one request instead of the panel having
  // to call back up via onChanged.
  const { data: projectsData } = useGetProjectsQuery();
  const { data: ticketsData } = useGetTicketsQuery();
  const { data: baselineData } = useGetDashboardBaselineQuery();
  const projects: ProjectIndexRow[] = useMemo(() => projectsData ?? [], [projectsData]);
  const tickets: Ticket[] = useMemo(() => ticketsData ?? [], [ticketsData]);
  const baseline: DashboardBaseline | null = baselineData ?? null;

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === "Open" || t.status === "In Progress" || t.status === "Reopened").length;
    const resolved = tickets.filter(t => t.status === "Closed").length;
    const reopened = tickets.filter(t => t.status === "Reopened").length;
    const resolutionPct = total ? Math.round((resolved / total) * 100) : 0;
    return { total, open, resolved, reopened, resolutionPct };
  }, [tickets]);

  const trends = useMemo(() => baseline ? {
    total: computeStatTrend(stats.total, baseline.totalTickets, "", "up"),
    resolved: computeStatTrend(stats.resolved, baseline.resolvedTickets, "", "up"),
    resolutionPct: computeStatTrend(stats.resolutionPct, baseline.ticketResolutionPct, "%", "up"),
    open: computeStatTrend(stats.open, baseline.openTickets, "", "down"),
  } : null, [baseline, stats]);

  return (
    <Box>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, lg: 2.4 }}>
          <StatCard icon={ConfirmationNumberIcon} label="Total Tickets" value={stats.total} color={DASHBOARD_COLORS.blue} trend={trends?.total} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2.4 }}>
          <StatCard icon={CheckCircleIcon} label="Closed" value={stats.resolved} color={DASHBOARD_COLORS.green} trend={trends?.resolved} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2.4 }}>
          <StatCard icon={DonutLargeIcon} label="Resolution Rate" value={`${stats.resolutionPct}%`} color={DASHBOARD_COLORS.violet} trend={trends?.resolutionPct} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2.4 }}>
          <StatCard icon={WarningAmberIcon} label="Open Tickets" value={stats.open}
            color={stats.open > 0 ? DASHBOARD_COLORS.red : DASHBOARD_COLORS.green} trend={trends?.open} tint={stats.open > 0} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, lg: 2.4 }}>
          <StatCard icon={ReplayCircleFilledIcon} label="Reopened" value={stats.reopened}
            color={DASHBOARD_COLORS.orange} tint={stats.reopened > 0} />
        </Grid>
      </Grid>

      <TicketsPanel
        actor={actor}
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
        refreshKey={0}
      />
    </Box>
  );
}
