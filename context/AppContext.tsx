"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { roleCan } from "@/lib/data";
import { useAuth } from "./AuthContext";
import type { Actor, AppRole, PermissionAction, ThemeMode } from "@/lib/types";

interface AppContextValue {
  /** Access role of the signed-in user (see AuthContext). */
  role: AppRole;
  /** Employee id of the signed-in user, or null while signed out. */
  selfId: string | null;
  actor: Actor;
  mode: ThemeMode;
  toggleMode: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = "converge_projects_ui_pref_v1";

interface StoredPref {
  mode?: ThemeMode;
}

/**
 * Identity + per-visitor UI preferences.
 *
 * `role`/`selfId` are derived from the signed-in user (AuthContext) — they
 * are no longer a client-side "view as" switcher, and there's no setter:
 * to change who you are, sign out and back in. `mode` (light/dark) is the
 * one genuinely local preference and still persists to localStorage.
 *
 * The fallback role while signed out is only ever seen by the login route
 * (every other route is gated behind AuthGate), so it gates nothing.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Light is the default for a first-time visitor; a stored preference in
  // localStorage still wins (see the effect below).
  const [mode, setMode] = useState<ThemeMode>("light");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const pref: StoredPref = JSON.parse(raw);
        if (pref.mode === "light" || pref.mode === "dark") setMode(pref.mode);
      }
    } catch { /* no stored preference yet */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }));
  }, [mode, loaded]);

  const toggleMode = () => setMode(m => m === "dark" ? "light" : "dark");

  const role: AppRole = user?.appRole ?? "Admin";
  const selfId = user?.id ?? null;
  const displayName = user?.name ?? role;

  const actor = useMemo<Actor>(() => ({
    role, id: selfId, name: displayName,
    can: (action: PermissionAction) => roleCan(role, action),
  }), [role, selfId, displayName]);

  const value = useMemo<AppContextValue>(() => ({ role, selfId, actor, mode, toggleMode }), [role, selfId, actor, mode]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
