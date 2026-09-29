/**
 * Tracks in-app navigation so a Back button can choose between stepping through
 * history and falling back to a home route.
 *
 * State is module-level on purpose: it resets on a full page load (fresh tab,
 * deep link, refresh) and survives client-side navigation — the exact lifetime
 * of this question. `window.history.length` can't answer it (it counts the
 * whole tab and never decreases). AppShell renders once per session and calls
 * `recordNavigation()` on every route change.
 */
let navigationCount = 0;
let lastPath: string | null = null;
let prevPath: string | null = null;

/**
 * Record a route change. Ignores a repeat of the current path so React Strict
 * Mode's double-invoked mount effects don't count one load as two navigations.
 */
export function recordNavigation(path: string): void {
  if (path === lastPath) return;
  prevPath = lastPath;
  lastPath = path;
  navigationCount += 1;
}

/**
 * The route before the current one — used by "Back to portfolio" to return
 * where the user came from. Tracks only real route changes (not ?view toggles).
 * Null on the first page of a fresh load.
 */
export function previousPath(): string | null {
  return prevPath;
}

/** True once the user has navigated within the app, so `router.back()` stays in it. */
export function hasInAppHistory(): boolean {
  return navigationCount > 1;
}
