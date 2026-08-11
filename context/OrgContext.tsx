"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchEmployees } from "@/lib/api";
import type { Employee, Team } from "@/lib/types";

interface OrgContextValue {
  teams: Team[];
  employees: Employee[];
  employeeById: Record<string, Employee>;
  /** "Name (Admin)" for an admin, plain "Name" otherwise, "Unassigned" for a missing/unknown id. */
  employeeLabel: (id: string | null | undefined) => string;
  loading: boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

/**
 * Organization directory (teams/employees), fetched once from the real
 * backend (GET /employees, backed by Postgres) instead of the app's old
 * static lib/data.ts constants. Every component that used to import
 * TEAMS/EMPLOYEES/EMPLOYEE_BY_ID/employeeLabel directly now reads them
 * from here via useOrgContext() — same shapes, real data underneath.
 *
 * Sits *outside* AppProvider in app/layout.tsx: AppContext's `actor.name`
 * needs employeeLabel() too, so AppProvider has to be able to consume
 * this context rather than the other way around.
 */
export function OrgProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchEmployees()
      .then(({ teams, employees }) => {
        if (cancelled) return;
        setTeams(teams);
        setEmployees(employees);
      })
      .catch(() => { if (!cancelled) { setTeams([]); setEmployees([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const employeeById = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e])), [employees]);

  const employeeLabel = useMemo(() => (id: string | null | undefined): string => {
    const e = id ? employeeById[id] : undefined;
    if (!e) return "Unassigned";
    return e.role === "Admin" ? `${e.name} (Admin)` : e.name;
  }, [employeeById]);

  const value = useMemo<OrgContextValue>(() => ({ teams, employees, employeeById, employeeLabel, loading }), [teams, employees, employeeById, employeeLabel, loading]);

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrgContext must be used within OrgProvider");
  return ctx;
}
