/**
 * "Did the user reach this page by navigating inside the app, or land on it
 * directly?" — the difference between a Back button that should step back
 * through history and one that should fall back to a sensible home.
 *
 * Module-level state on purpose: it's scoped to one loaded copy of the app,
 * so it resets on a full page load (a fresh tab, a deep link, a refresh) and
 * survives client-side navigation — exactly the lifetime this question has.
 * `window.history.length` can't answer it: it counts the whole tab's history
 * including pages before this app, and never decreases.
 *
 * AppShell calls `recordNavigation()` on every route change; it renders once
 * for the whole session and never remounts, so the count is reliable.
 */
let navigationCount = 0;
let lastPath: string | null = null;
let prevPath: string | null = null;

/**
 * Called by AppShell whenever the route changes.
 *
 * Takes the path and ignores a repeat of the one already recorded: React
 * Strict Mode double-invokes mount effects in development, which would
 * otherwise make a single page load look like two navigations and send the
 * Back button into history that isn't there.
 */
export function recordNavigation(path: string): void {
  if (path === lastPath) return;
  prevPath = lastPath;
  lastPath = path;
  navigationCount += 1;
}

/**
 * The route the user was on immediately before the current one — used by the
 * project page's "Back to portfolio" to return to wherever they came from
 * (dashboard, Kanban, …). It only tracks real route changes, so in-project view
 * toggles (Phases/Timeline/Kanban, which only change the ?view query) never
 * pollute it. Null on the first page of a fresh load.
 */
export function previousPath(): string | null {
  return prevPath;
}

/**
 * True once the user has navigated at least once within this loaded app —
 * i.e. `router.back()` will land somewhere in the app rather than leaving it
 * (or doing nothing on the very first entry).
 */
export function hasInAppHistory(): boolean {
  return navigationCount > 1;
}
