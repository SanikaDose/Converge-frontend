/**
 * Thin fetch wrappers around the mock API routes (app/api/**). Every
 * function here maps 1:1 to a route handler — swap the route handlers
 * for real database calls later and this file (and everything that
 * calls it) keeps working unchanged.
 */

async function json(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.json();
}

export const fetchProjectsIndex = () => fetch("/api/projects").then(json);
export const fetchProject = (id) => fetch(`/api/projects/${id}`).then(json);
export const createProjectApi = (payload) =>
  fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(json);
export const updateProjectApi = (id, patch) =>
  fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then(json);

export const fetchTickets = () => fetch("/api/tickets").then(json);
export const createTicketApi = (payload) =>
  fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(json);
export const updateTicketApi = (id, patch) =>
  fetch(`/api/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).then(json);

export const fetchTeamPerformance = () => fetch("/api/team-performance").then(json);
