/**
 * Thin fetch wrappers around the Converge backend (converge_backend, a
 * NestJS + TypeORM + PostgreSQL API — see that project's README). Every
 * function here maps 1:1 to a backend route; NEXT_PUBLIC_API_URL points
 * at it (defaults to the local dev backend on :4000).
 */
import type {
  AuthedUser, CreateProjectInput, CreateTicketInput, DashboardBaseline, Employee, ProjectDetailData,
  ProjectIndexRow, Team, TeamPerformanceRow, Ticket, UpdateProjectPatch,
} from "./types";

// The backend serves everything under a global /api/v1 prefix (see
// converge_backend main.ts). Kept as a separate constant from the host so
// bumping the version is one edit here and in the backend's routeConstants.
const API_ROOT = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_BASE = `${API_ROOT}/api/v1`;

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || `Request failed with ${res.status}`);
  }
  return res.json();
}

const url = (path: string) => `${API_BASE}${path}`;

export const loginApi = (employeeCode: string, password: string): Promise<AuthedUser> =>
  fetch(url("/auth/login"), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeCode, password }),
  }).then(res => json(res));

export const fetchProjectsIndex = (): Promise<ProjectIndexRow[]> => fetch(url("/projects")).then(res => json(res));
export const fetchProject = (id: string): Promise<ProjectDetailData> => fetch(url(`/projects/${id}`)).then(res => json(res));
export const createProjectApi = (payload: CreateProjectInput): Promise<ProjectDetailData> =>
  fetch(url("/projects"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(res => json(res));
export const updateProjectApi = (id: string, patch: UpdateProjectPatch): Promise<ProjectDetailData> =>
  fetch(url(`/projects/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then(res => json(res));
export const deleteProjectApi = (id: string): Promise<{ id: string }> =>
  fetch(url(`/projects/${id}`), { method: "DELETE" }).then(res => json(res));

export const fetchTickets = (): Promise<Ticket[]> => fetch(url("/tickets")).then(res => json(res));
export const createTicketApi = (payload: CreateTicketInput): Promise<Ticket> =>
  fetch(url("/tickets"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(res => json(res));
export const updateTicketApi = (id: string, patch: Partial<Ticket>): Promise<Ticket> =>
  fetch(url(`/tickets/${id}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then(res => json(res));

export const fetchTeamPerformance = (): Promise<TeamPerformanceRow[]> => fetch(url("/team-performance")).then(res => json(res));

export const fetchDashboardBaseline = (): Promise<DashboardBaseline> => fetch(url("/dashboard-summary")).then(res => json(res));

export const fetchEmployees = (): Promise<{ teams: Team[]; employees: Employee[] }> => fetch(url("/employees")).then(res => json(res));
