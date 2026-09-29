import type { MiscTaskStatus, TaskStatus, TicketStatus } from "./types";

/** What kind of work item a global-kanban card represents. */
export type KanbanSource = "task" | "misc" | "ticket";

/**
 * Forward map — a misc task's or ticket's own status → the kanban column it
 * should sit in. The kanban's 7 statuses are the canonical set (the per-project
 * board already uses them natively), so nothing new is invented; we just place
 * the other work-item types into the matching column. "Delayed" is applied
 * separately, from the due date (see the kanban page), exactly like tasks.
 */
export function miscStatusToKanban(s: MiscTaskStatus): TaskStatus {
  switch (s) {
    case "To Do": return "Not Started";
    case "In Progress": return "In Progress";
    case "On Hold": return "Blocked";
    case "Completed": return "Completed";
    default: return "Not Started";
  }
}

export function ticketStatusToKanban(s: TicketStatus): TaskStatus {
  switch (s) {
    case "Open": return "Not Started";
    case "Reopened": return "Not Started";
    case "In Progress": return "In Progress";
    case "Closed": return "Completed";
    default: return "Not Started";
  }
}
