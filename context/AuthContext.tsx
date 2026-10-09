"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLoginMutation } from "@/store/api/authApi";
import { UNAUTHORIZED_EVENT, clearToken, getToken, setToken } from "@/lib/authToken";
import type { AuthedUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthedUser | null;
  /** False until the stored session has been read — guards must wait on this. */
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  /**
   * Replaces the cached profile after the user edits it (see the profile
   * page). The session is a snapshot taken at login, so without this the
   * navbar would keep showing the old name until the next sign-in.
   */
  applyProfile: (profile: AuthedUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "converge_projects_session_v1";

/** Auto sign-out after this long with no user activity in any open tab. The
 *  12h hard cap is separate — it comes from the token's own expiry. */
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
/** How often the watcher checks the idle/expiry deadlines. */
const SESSION_CHECK_MS = 30 * 1000;
/** Last-activity timestamp, shared across tabs via localStorage so activity in
 *  ANY tab counts — one idle user in a background tab won't log everyone out. */
const LAST_ACTIVITY_KEY = "converge_projects_last_activity_v1";
/** Why the last sign-out happened, read once by the login page to show a note.
 *  sessionStorage (not local) so it's scoped to this tab and self-clears. */
export const LOGOUT_REASON_KEY = "converge_projects_logout_reason_v1";
export type LogoutReason = "idle" | "expired";

/** Read and clear the reason for the most recent auto sign-out (login page). */
export function takeLogoutReason(): LogoutReason | null {
  try {
    const v = sessionStorage.getItem(LOGOUT_REASON_KEY);
    if (v) sessionStorage.removeItem(LOGOUT_REASON_KEY);
    return v === "idle" || v === "expired" ? v : null;
  } catch {
    return null;
  }
}

function getLastActivity(): number | null {
  try {
    const v = localStorage.getItem(LAST_ACTIVITY_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}
function setLastActivity(t: number): void {
  try { localStorage.setItem(LAST_ACTIVITY_KEY, String(t)); } catch { /* ignore */ }
}

/**
 * Reads a JWT's `exp` without verifying it (verification is the server's job) —
 * just enough to know, locally and with no network call, whether a stored token
 * is already past its expiry. Returns null when the token can't be parsed, so
 * callers fall back to letting the server decide.
 */
function tokenExpMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True when the token is parseable and its expiry is in the past. An
 *  unparseable token returns false — we let the first API call's 401 handle it
 *  rather than wrongly discarding a session we can't read. */
function isTokenExpired(token: string): boolean {
  const exp = tokenExpMs(token);
  return exp !== null && Date.now() >= exp;
}

/**
 * Sign-in state for the whole app. Credentials are verified server-side
 * (POST /auth/login, bcrypt-compared against the employees table); only the
 * returned non-secret profile is kept here, and the bearer token it comes
 * with is kept in lib/authToken.ts.
 *
 * The profile in this record is a *cache for rendering* — the navbar name,
 * the role the UI gates controls on. It is not what authorizes anything:
 * the backend re-reads the employee from the database on every request and
 * takes identity from the signed token, so editing this localStorage record
 * changes what the UI draws and nothing the API will accept.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [ready, setReady] = useState(false);
  // Last-activity mirror (per tab) + a throttle for the localStorage writes, so
  // high-frequency events like mousemove don't hammer storage.
  const lastActivityRef = useRef<number>(Date.now());
  const lastWriteRef = useRef<number>(0);

  // Ends the session and, for an automatic sign-out, records why so the login
  // page can explain it. `clearToken()`/removals are the single source of
  // "signed out" for the whole app.
  const endSession = useCallback((reason?: LogoutReason) => {
    if (reason) { try { sessionStorage.setItem(LOGOUT_REASON_KEY, reason); } catch { /* ignore */ } }
    setUser(null);
    clearToken();
    localStorage.removeItem(STORAGE_KEY);
    try { localStorage.removeItem(LAST_ACTIVITY_KEY); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const token = getToken();
      // An expired stored token is worse than no session: AuthGate would render
      // the whole app, fire its data queries, and only discover the dead token
      // when each one 401s over the (remote) network — seconds of "login is
      // slow" before the redirect to /login. Incognito skips all that because it
      // has no stored token. So drop an expired/orphaned session up front and
      // land on /login immediately, exactly like a fresh browser.
      if (token && isTokenExpired(token)) {
        if (raw) { try { sessionStorage.setItem(LOGOUT_REASON_KEY, "expired"); } catch { /* ignore */ } }
        clearToken();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } else if (raw && token) {
        // Was the app left idle past the timeout while closed/backgrounded?
        // Treat that as logged out on return, same as if the watcher had fired.
        const last = getLastActivity();
        if (last !== null && Date.now() - last >= IDLE_TIMEOUT_MS) {
          try { sessionStorage.setItem(LOGOUT_REASON_KEY, "idle"); } catch { /* ignore */ }
          clearToken();
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LAST_ACTIVITY_KEY);
        } else {
          const parsed = JSON.parse(raw) as AuthedUser;
          // Guard against a stale/garbled record from an older shape — and
          // require the token, so a session saved before tokens existed lands
          // on /login instead of rendering a shell over 401s.
          if (parsed && parsed.id && parsed.employeeCode) {
            setUser(parsed);
            setLastActivity(Date.now());
          }
        }
      } else if (raw || token) {
        // A session without its token (or vice versa) can't authenticate —
        // clear the orphan so it doesn't drive a doomed authed render.
        clearToken();
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* no stored session */ }
    setReady(true);
  }, []);

  const signOut = useCallback(() => endSession(), [endSession]);

  // Idle + hard-cap watcher. While signed in, track activity across tabs and,
  // every SESSION_CHECK_MS, sign out if the user has been idle past
  // IDLE_TIMEOUT_MS or the token has hit its 12h expiry — proactively, instead
  // of waiting for the next request to 401 or for a page reload.
  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    lastActivityRef.current = now;
    lastWriteRef.current = now;
    setLastActivity(now);

    const bump = () => {
      const t = Date.now();
      lastActivityRef.current = t;
      // Throttle the shared write; the in-memory ref stays exact for this tab.
      if (t - lastWriteRef.current > 15000) { lastWriteRef.current = t; setLastActivity(t); }
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const onVisible = () => { if (document.visibilityState === "visible") bump(); };
    document.addEventListener("visibilitychange", onVisible);

    const id = window.setInterval(() => {
      const last = getLastActivity() ?? lastActivityRef.current;
      if (Date.now() - last >= IDLE_TIMEOUT_MS) { endSession("idle"); return; }
      const token = getToken();
      if (!token || isTokenExpired(token)) { endSession("expired"); }
    }, SESSION_CHECK_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [user, endSession]);

  // The API layer clears the token and fires this when the backend rejects
  // it (expired/invalid); dropping the user here is what sends AuthGate
  // back to /login.
  useEffect(() => {
    const onUnauthorized = () => endSession("expired");
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [endSession]);

  const [loginMutation] = useLoginMutation();

  // `.unwrap()` re-throws the rejection so the login form's existing
  // try/catch and error banner keep working unchanged — RTK Query
  // otherwise resolves with an { error } object rather than throwing.
  const signIn = useCallback(async (email: string, password: string) => {
    const { accessToken, ...profile } = await loginMutation({ email, password }).unwrap();
    // Token first: a render triggered by setUser can fire a data query, and
    // that query needs the header already available.
    setToken(accessToken);
    setUser(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [loginMutation]);

  const applyProfile = useCallback((profile: AuthedUser) => {
    setUser(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, signIn, signOut, applyProfile }),
    [user, ready, signIn, signOut, applyProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
