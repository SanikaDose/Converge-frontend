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
      if (raw) {
        const parsed = JSON.parse(raw) as AuthedUser;
        // Guard against a stale/garbled record from an older shape — and
        // require the token, so a session saved before tokens existed lands
        // on /login instead of rendering a shell over 401s.
        if (parsed && parsed.id && parsed.employeeCode && getToken()) setUser(parsed);
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
