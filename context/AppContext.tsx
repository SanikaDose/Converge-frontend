"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ROLES, employeeLabel, roleCan } from "@/lib/data";
import type { Actor, AppRole, PermissionAction } from "@/lib/types";

interface AppContextValue {
  role: AppRole;
  setRole: (role: AppRole) => void;
  selfId: string | null;
  setSelfId: (id: string | null) => void;
  actor: Actor;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = "converge_projects_role_pref_v1";

interface StoredPref {
  role?: AppRole;
  selfId?: string | null;
}

/**
 * Client-side "viewing as" role simulation — the same caveat as always:
 * there is no real backend auth, this just reshapes the UI per role so
 * the team can validate the role-based design. Role + selfId (which
 * organization member "you are") persist to localStorage so a reload
 * doesn't reset the demo.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("Admin");
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const pref: StoredPref = JSON.parse(raw);
        if (pref.role && (ROLES as string[]).includes(pref.role)) setRole(pref.role);
        if (pref.selfId) setSelfId(pref.selfId);
      }
    } catch { /* no stored preference yet */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, selfId }));
  }, [role, selfId, loaded]);

  const actor = useMemo<Actor>(() => ({
    role, id: selfId, name: selfId ? employeeLabel(selfId) : role,
    can: (action: PermissionAction) => roleCan(role, action),
  }), [role, selfId]);

  const value = useMemo<AppContextValue>(() => ({ role, setRole, selfId, setSelfId, actor }), [role, selfId, actor]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
