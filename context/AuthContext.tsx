"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLoginMutation } from "@/store/api/authApi";
import type { AuthedUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthedUser | null;
  /** False until the stored session has been read — guards must wait on this. */
  ready: boolean;
  signIn: (employeeCode: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "converge_projects_session_v1";

/**
 * Sign-in state for the whole app. Credentials are verified server-side
 * (POST /auth/login, bcrypt-compared against the employees table); only
 * the returned non-secret profile is kept client-side.
 *
 * KNOWN LIMITATION, and the reason this isn't real security yet: the
 * session is a plain localStorage record with no token, and the backend's
 * data endpoints are still unauthenticated (see converge_backend — no
 * guards, CORS-only). Anyone who can reach the API can read/write without
 * signing in, and anyone with devtools can forge this record. Treat this
 * as a UI gate, not an access-control boundary, until the API issues and
 * verifies real session tokens.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthedUser;
        // Guard against a stale/garbled record from an older shape.
        if (parsed && parsed.id && parsed.employeeCode) setUser(parsed);
      }
    } catch { /* no stored session */ }
    setReady(true);
  }, []);

  const [loginMutation] = useLoginMutation();

  // `.unwrap()` re-throws the rejection so the login form's existing
  // try/catch and error banner keep working unchanged — RTK Query
  // otherwise resolves with an { error } object rather than throwing.
  const signIn = useCallback(async (employeeCode: string, password: string) => {
    const authed = await loginMutation({ employeeCode, password }).unwrap();
    setUser(authed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authed));
  }, [loginMutation]);

  const signOut = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
