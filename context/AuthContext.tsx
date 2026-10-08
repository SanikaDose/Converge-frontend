"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
        clearToken();
        localStorage.removeItem(STORAGE_KEY);
      } else if (raw && token) {
        const parsed = JSON.parse(raw) as AuthedUser;
        // Guard against a stale/garbled record from an older shape — and
        // require the token, so a session saved before tokens existed lands
        // on /login instead of rendering a shell over 401s.
        if (parsed && parsed.id && parsed.employeeCode) setUser(parsed);
      } else if (raw || token) {
        // A session without its token (or vice versa) can't authenticate —
        // clear the orphan so it doesn't drive a doomed authed render.
        clearToken();
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* no stored session */ }
    setReady(true);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    clearToken();
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // The API layer clears the token and fires this when the backend rejects
  // it (expired/invalid); dropping the user here is what sends AuthGate
  // back to /login.
  useEffect(() => {
    const onUnauthorized = () => signOut();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [signOut]);

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
