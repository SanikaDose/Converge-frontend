"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ROLES, roleCan } from "@/lib/data";
import { useOrgContext } from "./OrgContext";
import type { Actor, AppRole, PermissionAction, ThemeMode } from "@/lib/types";

interface AppContextValue {
  role: AppRole;
  setRole: (role: AppRole) => void;
  selfId: string | null;
  setSelfId: (id: string | null) => void;
  actor: Actor;
  mode: ThemeMode;
  toggleMode: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = "converge_projects_role_pref_v1";

interface StoredPref {
  role?: AppRole;
  selfId?: string | null;
  mode?: ThemeMode;
}

/**
 * Client-side "viewing as" role simulation — the same caveat as always:
 * there is no real backend auth, this just reshapes the UI per role so
 * the team can validate the role-based design. Role + selfId (which
 * organization member "you are") persist to localStorage so a reload
 * doesn't reset the demo. `mode` (light/dark) rides along in the same
 * stored blob since it's the same kind of per-visitor UI preference.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const { employeeLabel } = useOrgContext();
  const [role, setRole] = useState<AppRole>("Admin");
  const [selfId, setSelfId] = useState<string | null>(null);
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const pref: StoredPref = JSON.parse(raw);
        if (pref.role && (ROLES as string[]).includes(pref.role)) setRole(pref.role);
        if (pref.selfId) setSelfId(pref.selfId);
        if (pref.mode === "light" || pref.mode === "dark") setMode(pref.mode);
      }
    } catch { /* no stored preference yet */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, selfId, mode }));
  }, [role, selfId, mode, loaded]);

  const toggleMode = () => setMode(m => m === "dark" ? "light" : "dark");

  const actor = useMemo<Actor>(() => ({
    role, id: selfId, name: selfId ? employeeLabel(selfId) : role,
    can: (action: PermissionAction) => roleCan(role, action),
  }), [role, selfId, employeeLabel]);

  const value = useMemo<AppContextValue>(() => ({ role, setRole, selfId, setSelfId, actor, mode, toggleMode }), [role, selfId, actor, mode]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
