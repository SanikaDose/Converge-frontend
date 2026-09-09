"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@/components/Stack";
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
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import { GlobalKanbanBoard, type GlobalKanbanTask } from "@/components/GlobalKanbanBoard";
import { useGetProjectsWithDetailsQuery, useUpdateProjectMutation } from "@/store/api/projectsApi";
import { computeAchievement } from "@/lib/businessLogic";
import { todayISO } from "@/lib/dateUtils";
import { roleCan, STATUS_OPTIONS } from "@/lib/data";
import { useAppContext } from "@/context/AppContext";
import { useOrgContext } from "@/context/OrgContext";
import type { HistoryEntry, ProjectDetailData, ProjectIndexRow, Task, TaskStatus } from "@/lib/types";

const ALL_USERS = "__all_users__";
const ALL_PROJECTS = "__all_projects__";

// Delayed and Not Required are excluded by default — Delayed is a
// derived/warning state, and Not Required is out-of-scope work; neither is
// somewhere active work sits, so the board opens focused on the statuses
// someone would actually triage day to day. Both are still tickable on.
const DEFAULT_STATUSES: TaskStatus[] = STATUS_OPTIONS.filter(s => s !== "Delayed" && s !== "Not Required") as TaskStatus[];

export default function GlobalKanbanPage() {
  const router = useRouter();
  const { role, actor } = useAppContext();
  const { employees, employeeById } = useOrgContext();
  const canEdit = roleCan(role, "editTask");
  const today = todayISO();

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>(DEFAULT_STATUSES);

  // Deep link from the Team page: /kanban?user=<id> preselects that person in
  // the assignee filter so the board opens on their tasks. Read once on mount
  // (client-only, so no useSearchParams Suspense boundary needed).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("user");
    if (id) setSelectedUserIds([id]);
  }, []);

  // Index + every project's detail as one cached query — see
  // getProjectsWithDetails. Refresh maps to its refetch.
  const { data, isFetching, refetch } = useGetProjectsWithDetailsQuery();
  const projectsIndex: ProjectIndexRow[] = useMemo(() => data?.index ?? [], [data]);
  const projectDetails: ProjectDetailData[] = useMemo(() => data?.details ?? [], [data]);
  const loading = isFetching;
  const load = refetch;
  const [updateProjectMutation] = useUpdateProjectMutation();

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
      if (selectedUserIds.length > 0 && !t.assignees.some(a => selectedUserIds.includes(a))) return false;
      if (!selectedStatuses.includes(t.status)) return false;
      if (projectFilter.length > 0) {
        const matches = projectFilter.includes(`type:${t.projectType}`) || projectFilter.includes(`proj:${t.projectId}`);
        if (!matches) return false;
      }
      return true;
    });
  }, [allTasks, selectedUserIds, selectedStatuses, projectFilter]);

  // `selectedStatuses` reflects the order the checkboxes were *clicked*
  // in (MUI's multi-select Select appends a newly-toggled value to the
  // end of the array, it doesn't resort) — deselecting then reselecting a
  // status would otherwise knock its column out of the canonical
  // left-to-right order. Re-deriving from STATUS_OPTIONS keeps the board
  // order fixed regardless of click order.
  const orderedVisibleStatuses = useMemo(
    () => STATUS_OPTIONS.filter(s => selectedStatuses.includes(s)),
    [selectedStatuses],
  );

  const handleStatusChange = async (task: GlobalKanbanTask, status: TaskStatus) => {
    const pd = projectDetails.find(p => p.id === task.projectId);
    if (!pd) return;
    const updatedTasks = pd.tasks.map(t => {
      if (t.id !== task.id) return t;
      const updates: Partial<Task> = { status };
      if (status === "Not Started" || status === "Not Required") { updates.actualStart = null; updates.actualFinish = null; }
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
    try {
      // The mutation invalidates "Projects", which this query provides, so
      // the board refetches with the saved state. The card visibly moves on
      // the drop either way because GlobalKanbanBoard renders from the
      // returned data; a failure leaves the board on the server's truth.
      await updateProjectMutation({ id: pd.id, patch: { tasks: updatedTasks } }).unwrap();
    } catch (e) {
      console.error(e);
      load();
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: { xs: "calc(100vh - 96px)", md: "calc(100vh - 116px)" } }}>
      <Box sx={{ flexShrink: 0 }}>
        <Stack direction="row" justifyContent="flex-end" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Select<string[]>
              multiple size="small" displayEmpty
              value={selectedUserIds}
              onChange={(e: SelectChangeEvent<string[]>) => {
                const raw = e.target.value;
                const arr = typeof raw === "string" ? raw.split(",") : raw;
                // ALL_USERS is never part of the controlled value itself
                // (only ever a manually-checked display state) — it appears
                // in `arr` here only when the user just clicked it,
                // unambiguously, so this always means "reset to no filter"
                // regardless of what else was previously selected.
                if (arr.includes(ALL_USERS)) { setSelectedUserIds([]); return; }
                setSelectedUserIds(arr);
              }}
              renderValue={() => selectedUserIds.length
                ? (selectedUserIds.length === 1 ? (employeeById[selectedUserIds[0]]?.name || "1 selected") : `${selectedUserIds.length} selected`)
                : "All"}
              startAdornment={<PeopleAltOutlinedIcon fontSize="small" sx={{ color: "text.secondary", mr: 1, ml: 0.5 }} />}
              sx={{ minWidth: 200 }}
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

            <Select<string[]>
              multiple size="small" displayEmpty
              value={projectFilter}
              onChange={(e: SelectChangeEvent<string[]>) => {
                const raw = e.target.value;
                const arr = typeof raw === "string" ? raw.split(",") : raw;
                if (arr.includes(ALL_PROJECTS)) { setProjectFilter([]); return; }
                setProjectFilter(arr);
              }}
              renderValue={() => projectFilter.length
                ? (projectFilter.length === 1 ? projectFilterItemLabel(projectFilter[0], projectsIndex) : `${projectFilter.length} selected`)
                : "All"}
              startAdornment={<FolderOutlinedIcon fontSize="small" sx={{ color: "text.secondary", mr: 1, ml: 0.5 }} />}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value={ALL_PROJECTS}>
                <Checkbox size="small" checked={projectFilter.length === 0} />
                <ListItemText primary="All" />
              </MenuItem>
              <ListSubheader>Product</ListSubheader>
              <MenuItem value="type:Product">
                <Checkbox size="small" checked={projectFilter.includes("type:Product")} />
                <ListItemText primary="All Product" />
              </MenuItem>
              {productProjects.map(p => (
                <MenuItem key={p.id} value={`proj:${p.id}`} sx={{ pl: 4 }}>
                  <Checkbox size="small" checked={projectFilter.includes(`proj:${p.id}`)} />
                  <ListItemText primary={p.name} />
                </MenuItem>
              ))}
              <ListSubheader>Project / Solution</ListSubheader>
              <MenuItem value="type:Solution">
                <Checkbox size="small" checked={projectFilter.includes("type:Solution")} />
                <ListItemText primary="All Project/Solution" />
              </MenuItem>
              {solutionProjects.map(p => (
                <MenuItem key={p.id} value={`proj:${p.id}`} sx={{ pl: 4 }}>
                  <Checkbox size="small" checked={projectFilter.includes(`proj:${p.id}`)} />
                  <ListItemText primary={p.name} />
                </MenuItem>
              ))}
            </Select>

            <Select<TaskStatus[]>
              multiple size="small" displayEmpty
              value={selectedStatuses}
              onChange={(e: SelectChangeEvent<TaskStatus[]>) => {
                const raw = e.target.value;
                const arr = (typeof raw === "string" ? raw.split(",") : raw) as TaskStatus[];
                setSelectedStatuses(arr);
              }}
              renderValue={() => selectedStatuses.length === STATUS_OPTIONS.length
                ? "All"
                : selectedStatuses.length
                  ? `${selectedStatuses.length} selected`
                  : "None"}
              startAdornment={<FlagOutlinedIcon fontSize="small" sx={{ color: "text.secondary", mr: 1, ml: 0.5 }} />}
              sx={{ minWidth: 200 }}
            >
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s}>
                  <Checkbox size="small" checked={selectedStatuses.includes(s)} />
                  <ListItemText primary={s} />
                </MenuItem>
              ))}
            </Select>
          </Stack>

          <Tooltip title="Refresh"><IconButton onClick={load}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
        ) : (
          <GlobalKanbanBoard
            tasks={filteredTasks} today={today} canEdit={canEdit} visibleStatuses={orderedVisibleStatuses}
            onStatusChange={handleStatusChange}
            // ?task= survives the page change — ProjectDetail reads it once
            // loaded and opens that card expanded, same as an in-page jump.
            onOpenTask={(t) => router.push(`/projects/${t.projectId}?task=${encodeURIComponent(t.id)}`)}
          />
        )}
      </Box>
    </Box>
  );
}

function projectFilterItemLabel(value: string, projects: ProjectIndexRow[]): string {
  if (value === "type:Product") return "All Product";
  if (value === "type:Solution") return "All Project/Solution";
  if (value.startsWith("proj:")) return projects.find(p => p.id === value.slice(5))?.name || "Project";
  return "All";
}
