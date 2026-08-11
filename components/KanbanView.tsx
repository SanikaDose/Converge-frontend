"use client";
import React, { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Stack from "./Stack";
import { alpha } from "@mui/material/styles";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { STATUS_OPTIONS, STATUS_COLOR, PRIORITY_COLOR } from "@/lib/data";
import { AchievementBadge, EmployeeAvatar } from "./common";
import { isOverdue, overdueWorkingDays, openChecklistCount } from "@/lib/businessLogic";
import { fmt } from "@/lib/dateUtils";
import { useStatusHex } from "@/lib/theme";
import type { Phase, Task, TaskStatus, WeekDay } from "@/lib/types";

/**
 * Kanban board for a project's tasks — flat across all phases (unlike
 * Phases view's per-phase grouping), one column per TaskStatus. Cards
 * carry their phase name so context isn't lost once flattened. Drag a
 * card to a different column to change its status directly, same intent
 * as TaskCard's status dropdown — "Pending Approval" is excluded as a
 * drop target for the same reason it's excluded there: it's only ever
 * entered via the approval-workflow request, never picked by hand, and a
 * task already sitting in it is locked until approved/rejected.
 */
export function KanbanView({
  tasks, phases, today, weekOff, canEdit, onStatusChange, onOpenPhase,
}: {
  tasks: Task[];
  phases: Phase[];
  today: string;
  weekOff: WeekDay[];
  canEdit: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onOpenPhase: (phaseId: string) => void;
}) {
  const STATUS_HEX = useStatusHex();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  const phaseName = useMemo(() => {
    const map: Record<string, string> = {};
    phases.forEach(p => { map[p.id] = p.name; });
    return map;
  }, [phases]);

  const columns = useMemo(() => {
    const byStatus: Record<TaskStatus, Task[]> = {
      "Not Started": [], "In Progress": [], "Pending Approval": [], "Delayed": [], "Blocked": [], "Completed": [],
    };
    tasks.forEach(t => { (byStatus[t.status] || byStatus["Not Started"]).push(t); });
    return byStatus;
  }, [tasks]);

  // Same rule TaskCard's status Select enforces — dragging straight to
  // Completed is a second way to trigger the same transition, so it needs
  // the same gate or the checklist rule is trivially bypassed.
  const tryStatusChange = (task: Task, status: TaskStatus) => {
    if (status === "Completed") {
      const open = openChecklistCount(task);
      if (open > 0) {
        setBlockedMsg(`${open} critical point${open === 1 ? "" : "s"} still open — complete ${open === 1 ? "it" : "them"} first.`);
        return;
      }
    }
    onStatusChange(task.id, status);
  };

  return (
    <Stack direction="row" spacing={2} sx={{ height: "100%", overflowX: "auto", pb: 1 }}>
      {STATUS_OPTIONS.map(status => {
        const color = STATUS_HEX[STATUS_COLOR[status]];
        const colTasks = columns[status];
        const dropAllowed = canEdit && status !== "Pending Approval";
        const isDragOver = dragOverStatus === status && dropAllowed;
        return (
          <Box key={status} sx={{
            flex: "1 1 0", minWidth: 240, display: "flex", flexDirection: "column", height: "100%",
            bgcolor: "background.default", borderRadius: 2, overflow: "hidden",
            border: "1px solid", borderColor: isDragOver ? color : "divider",
            boxShadow: isDragOver ? `0 0 0 2px ${alpha(color, 0.35)}` : "none",
            transition: "border-color .15s ease, box-shadow .15s ease",
          }}
            onDragOver={(e) => { if (dropAllowed) { e.preventDefault(); setDragOverStatus(status); } }}
            onDragLeave={() => setDragOverStatus(s => (s === status ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const task = dropAllowed && dragId ? tasks.find(t => t.id === dragId) : undefined;
              if (task) tryStatusChange(task, status);
              setDragId(null);
              setDragOverStatus(null);
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{
              px: 1.5, py: 1.25, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0,
              bgcolor: alpha(color, 0.08), borderTop: "3px solid", borderTopColor: color,
            }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{status}</Typography>
              </Stack>
              <Chip label={colTasks.length} size="small" sx={{
                height: 20, fontSize: 11, fontWeight: 700, bgcolor: alpha(color, 0.16), color,
              }} />
            </Stack>

            <Stack spacing={1.25} sx={{ p: 1.25, flex: 1, overflowY: "auto" }}>
              {colTasks.length === 0 && (
                <Box sx={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 0.75, py: 4, border: "1px dashed", borderColor: "divider", borderRadius: 1.5, color: "text.disabled",
                }}>
                  <InboxOutlinedIcon sx={{ fontSize: 22 }} />
                  <Typography variant="caption">No tasks</Typography>
                </Box>
              )}
              {colTasks.map(t => {
                const overdue = isOverdue(t, today);
                const overdueDays = overdueWorkingDays(t, today, weekOff);
                const locked = t.status === "Pending Approval";
                return (
                  <Box
                    key={t.id}
                    draggable={canEdit && !locked}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => { setDragId(null); setDragOverStatus(null); }}
                    onClick={() => onOpenPhase(t.phaseId)}
                    sx={{
                      p: 1.25, borderRadius: 1.5, bgcolor: "background.paper", border: "1px solid", borderColor: "divider",
                      borderLeft: "3px solid", borderLeftColor: overdue ? STATUS_HEX.red : color,
                      boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
                      cursor: canEdit && !locked ? "grab" : "pointer", opacity: dragId === t.id ? 0.5 : 1,
                      transition: "border-color .15s ease, transform .15s ease, box-shadow .15s ease",
                      "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)", boxShadow: "0 4px 10px rgba(16,24,40,0.10)" },
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.35 }}>{t.name}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block", mt: 0.25 }}>
                      {phaseName[t.phaseId] || "—"}
                    </Typography>

                    <Stack direction="row" alignItems="center" gap={0.6} flexWrap="wrap" sx={{ mt: 0.75 }}>
                      {t.priority && t.priority !== "Medium" && (
                        <Chip label={t.priority} size="small" variant="outlined" sx={{
                          height: 18, fontSize: 10, fontWeight: 700,
                          color: STATUS_HEX[PRIORITY_COLOR[t.priority]], borderColor: STATUS_HEX[PRIORITY_COLOR[t.priority]],
                        }} />
                      )}
                      <AchievementBadge achievement={t.achievement} size="small" />
                    </Stack>

                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: overdue ? STATUS_HEX.red : "text.secondary" }}>
                        <CalendarMonthIcon sx={{ fontSize: 12 }} />
                        <Typography variant="caption" sx={{ fontWeight: overdue ? 700 : 400 }}>
                          {overdue ? `${overdueDays}d overdue` : fmt(t.plannedStart)}
                        </Typography>
                      </Stack>
                      {t.assignedTo && (
                        <Tooltip title="Assignee">
                          <Box><EmployeeAvatar employeeId={t.assignedTo} size={22} /></Box>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        );
      })}
      <Snackbar open={!!blockedMsg} autoHideDuration={4000} onClose={() => setBlockedMsg(null)}>
        <Alert severity="warning" variant="filled" onClose={() => setBlockedMsg(null)}>{blockedMsg}</Alert>
      </Snackbar>
    </Stack>
  );
}
