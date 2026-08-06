/**
 * Thin fetch wrappers around the mock API routes (app/api/**). Every
 * function here maps 1:1 to a route handler — swap the route handlers
 * for real database calls later and this file (and everything that
 * calls it) keeps working unchanged.
 */
import type { CreateProjectInput, CreateTicketInput, UpdateProjectPatch } from "./mockDb";
import type { LegacyProjectDetail } from "./businessLogic";
import type { ProjectDetailData, ProjectIndexRow, TeamPerformanceRow, Ticket } from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.json();
}

export const fetchProjectsIndex = (): Promise<ProjectIndexRow[]> => fetch("/api/projects").then(res => json(res));
export const fetchProject = (id: string): Promise<LegacyProjectDetail> => fetch(`/api/projects/${id}`).then(res => json(res));
export const createProjectApi = (payload: CreateProjectInput): Promise<ProjectDetailData> =>
  fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(res => json(res));
export const updateProjectApi = (id: string, patch: UpdateProjectPatch): Promise<ProjectDetailData> =>
  fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then(res => json(res));

export const fetchTickets = (): Promise<Ticket[]> => fetch("/api/tickets").then(res => json(res));
export const createTicketApi = (payload: CreateTicketInput): Promise<Ticket> =>
  fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(res => json(res));
export const updateTicketApi = (id: string, patch: Partial<Ticket>): Promise<Ticket> =>
  fetch(`/api/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then(res => json(res));

export const fetchTeamPerformance = (): Promise<TeamPerformanceRow[]> => fetch("/api/team-performance").then(res => json(res));
