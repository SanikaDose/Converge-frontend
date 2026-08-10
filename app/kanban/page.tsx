"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@/components/Stack";
import Typography from "@mui/material/Typography";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import ListSubheader from "@mui/material/ListSubheader";
import ListItemText from "@mui/material/ListItemText";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import { GlobalKanbanBoard, type GlobalKanbanTask } from "@/components/GlobalKanbanBoard";
import { fetchProjectsIndex, fetchProject, updateProjectApi } from "@/lib/api";
import { computeAchievement } from "@/lib/businessLogic";
import { todayISO } from "@/lib/dateUtils";
import { roleCan } from "@/lib/data";
import { useAppContext } from "@/context/AppContext";
import { useOrgContext } from "@/context/OrgContext";
import type { HistoryEntry, ProjectDetailData, ProjectIndexRow, Task, TaskStatus } from "@/lib/types";

const ALL_USERS = "__all__";

function projectFilterLabel(value: string, projects: ProjectIndexRow[]): string {
  if (value === "type:Product") return "All Product";
  if (value === "type:Solution") return "All Project/Solution";
  if (value.startsWith("proj:")) return projects.find(p => p.id === value.slice(5))?.name || "Project";
  return "All";
}

export default function GlobalKanbanPage() {
  const router = useRouter();
  const { role, actor } = useAppContext();
  const { employees, employeeById } = useOrgContext();
  const canEdit = roleCan(role, "editTask");
  const today = todayISO();

  const [projectsIndex, setProjectsIndex] = useState<ProjectIndexRow[]>([]);
  const [projectDetails, setProjectDetails] = useState<ProjectDetailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const index = await fetchProjectsIndex();
      setProjectsIndex(index);
      const details = await Promise.all(index.map(p => fetchProject(p.id)));
      setProjectDetails(details);
    } catch {
      setProjectsIndex([]);
      setProjectDetails([]);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const productProjects = useMemo(() => projectsIndex.filter(p => p.type === "Product"), [projectsIndex]);
  const solutionProjects = useMemo(() => projectsIndex.filter(p => p.type === "Solution"), [projectsIndex]);

  // Flatten every project's tasks into one list, each carrying its own
  // project/phase context so a card makes sense outside its project page.
  const allTasks = useMemo<GlobalKanbanTask[]>(() => {
    const out: GlobalKanbanTask[] = [];
    projectDetails.forEach(pd => {
      const phaseNameById: Record<string, string> = {};
      pd.phases.forEach(ph => { phaseNameById[ph.id] = ph.name; });
      pd.tasks.forEach(t => {
        out.push({
          ...t, projectId: pd.id, projectName: pd.meta.name, projectType: pd.meta.type,
          phaseName: phaseNameById[t.phaseId] || "—", weekOff: pd.meta.weekOff,
        });
      });
    });
    return out;
  }, [projectDetails]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      if (selectedUserIds.length > 0 && !(t.assignedTo && selectedUserIds.includes(t.assignedTo))) return false;
      if (projectFilter === "all") return true;
      if (projectFilter.startsWith("type:")) return t.projectType === projectFilter.slice(5);
      if (projectFilter.startsWith("proj:")) return t.projectId === projectFilter.slice(5);
      return true;
    });
  }, [allTasks, selectedUserIds, projectFilter]);

  const handleStatusChange = async (task: GlobalKanbanTask, status: TaskStatus) => {
    const pd = projectDetails.find(p => p.id === task.projectId);
    if (!pd) return;
    const updatedTasks = pd.tasks.map(t => {
      if (t.id !== task.id) return t;
      const updates: Partial<Task> = { status };
      if (status === "Not Started") { updates.actualStart = null; updates.actualFinish = null; }
      else {
        if (!t.actualStart) updates.actualStart = today;
        updates.actualFinish = status === "Completed" ? (t.actualFinish || today) : null;
      }
      const merged: Task = { ...t, ...updates };
      merged.achievement = status === "Completed" ? computeAchievement(merged, pd.meta.weekOff) : null;
      const history: HistoryEntry[] = [...(t.history || []), {
        ts: new Date().toISOString(), field: "Status", from: t.status, to: status, editedBy: actor.name || actor.role, reason: "",
      }];
      merged.history = history;
      return merged;
    });
    setProjectDetails(prev => prev.map(p => (p.id === pd.id ? { ...p, tasks: updatedTasks } : p)));
    try {
      await updateProjectApi(pd.id, { tasks: updatedTasks });
    } catch (e) {
      console.error(e);
      load();
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: { xs: "calc(100vh - 96px)", md: "calc(100vh - 116px)" } }}>
      <Box sx={{ flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4">Kanban</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Every task across every product and project/solution, in one board.
            </Typography>
          </Box>
          <Tooltip title="Refresh"><IconButton onClick={load}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mt: 2.5, mb: 2 }}>
          <Select<string[]>
            multiple size="small" displayEmpty
            value={selectedUserIds}
            onChange={(e: SelectChangeEvent<string[]>) => {
              const raw = e.target.value;
              const arr = typeof raw === "string" ? raw.split(",") : raw;
              // ALL_USERS is never part of the controlled value itself (only
              // ever a manually-checked display state) — it appears in `arr`
              // here only when the user just clicked it, unambiguously, so
              // this always means "reset to no filter" regardless of what
              // else was previously selected.
              if (arr.includes(ALL_USERS)) { setSelectedUserIds([]); return; }
              setSelectedUserIds(arr);
            }}
            renderValue={() => selectedUserIds.length
              ? (selectedUserIds.length === 1 ? (employeeById[selectedUserIds[0]]?.name || "1 selected") : `${selectedUserIds.length} selected`)
              : "All"}
            startAdornment={<PeopleAltOutlinedIcon fontSize="small" sx={{ color: "text.secondary", mr: 1, ml: 0.5 }} />}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value={ALL_USERS}>
              <Checkbox size="small" checked={selectedUserIds.length === 0} />
              <ListItemText primary="All" />
            </MenuItem>
            {employees.map(emp => (
              <MenuItem key={emp.id} value={emp.id}>
                <Checkbox size="small" checked={selectedUserIds.includes(emp.id)} />
                <ListItemText primary={emp.name} />
              </MenuItem>
            ))}
          </Select>

          <Select
            size="small" value={projectFilter}
            onChange={(e: SelectChangeEvent) => setProjectFilter(e.target.value)}
            renderValue={(v) => projectFilterLabel(v, projectsIndex)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="all">All</MenuItem>
            <ListSubheader>Product</ListSubheader>
            <MenuItem value="type:Product">All Product</MenuItem>
            {productProjects.map(p => <MenuItem key={p.id} value={`proj:${p.id}`} sx={{ pl: 4 }}>{p.name}</MenuItem>)}
            <ListSubheader>Project / Solution</ListSubheader>
            <MenuItem value="type:Solution">All Project/Solution</MenuItem>
            {solutionProjects.map(p => <MenuItem key={p.id} value={`proj:${p.id}`} sx={{ pl: 4 }}>{p.name}</MenuItem>)}
          </Select>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : (
          <GlobalKanbanBoard
            tasks={filteredTasks} today={today} canEdit={canEdit}
            onStatusChange={handleStatusChange}
            onOpenTask={(t) => router.push(`/projects/${t.projectId}`)}
          />
        )}
      </Box>
    </Box>
  );
}
