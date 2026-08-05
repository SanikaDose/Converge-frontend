"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ROLES, employeeLabel, roleCan } from "@/lib/data";

const AppContext = createContext(null);

const STORAGE_KEY = "converge_projects_role_pref_v1";

/**
 * Client-side "viewing as" role simulation — the same caveat as always:
 * there is no real backend auth, this just reshapes the UI per role so
 * the team can validate the role-based design. Role + selfId (which
 * organization member "you are") persist to localStorage so a reload
 * doesn't reset the demo.
 */
export function AppProvider({ children }) {
  const [role, setRole] = useState("Admin");
  const [selfId, setSelfId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const pref = JSON.parse(raw);
        if (pref.role && ROLES.includes(pref.role)) setRole(pref.role);
        if (pref.selfId) setSelfId(pref.selfId);
      }
    } catch { /* no stored preference yet */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, selfId }));
  }, [role, selfId, loaded]);

  const actor = useMemo(() => ({
    role, id: selfId, name: selfId ? employeeLabel(selfId) : role,
    can: (action) => roleCan(role, action),
  }), [role, selfId]);

  const value = useMemo(() => ({ role, setRole, selfId, setSelfId, actor }), [role, selfId, actor]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
