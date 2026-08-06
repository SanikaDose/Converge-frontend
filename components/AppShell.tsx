"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import GroupsIcon from "@mui/icons-material/Groups";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { LogoLockup } from "./Logo";
import { ROLES } from "@/lib/data";
import { OrgSelect } from "./common";
import { useAppContext } from "@/context/AppContext";
import type { AppRole } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/team-performance", label: "Team Performance", icon: GroupsIcon },
];

/**
 * App-wide chrome — no sidebar (removed per product decision): a single
 * top AppBar carries the logo, primary navigation, and the "viewing as"
 * role switch. Nav items highlight based on the current route.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, selfId, setSelfId, mode, toggleMode } = useAppContext();
  const pathname = usePathname();
  const needsName = role === "Developer";

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", color: "text.primary" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }} elevation={0}>
        <Toolbar sx={{ gap: 3 }}>
          <LogoLockup />

          <Box sx={{ display: "flex", gap: 0.5 }}>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Button
                  key={href} component={Link} href={href}
                  startIcon={<Icon sx={{ fontSize: 18 }} />}
                  sx={{
                    color: active ? "primary.light" : "text.secondary",
                    bgcolor: active ? "background.paper" : "transparent",
                    borderRadius: 2, px: 1.75,
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Tooltip title={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
              <IconButton size="small" onClick={toggleMode} sx={{ color: "text.secondary" }}>
                {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <VerifiedUserIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
              Viewing as
            </Typography>
            <Select size="small" value={role} onChange={(e: SelectChangeEvent) => setRole(e.target.value as AppRole)}
              sx={{ minWidth: 168, fontWeight: 600, color: "primary.light" }}>
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
            {needsName && (
              <Box sx={{ width: 210 }}>
                <OrgSelect label="You are" value={selfId} onChange={setSelfId} allowUnassigned size="small" />
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: { xs: 2, md: 3.5 }, pt: { xs: 10, md: 11 } }}>
        {children}
      </Box>
    </Box>
  );
}
