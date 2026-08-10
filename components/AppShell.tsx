"use client";

import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import GroupsIcon from "@mui/icons-material/Groups";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LogoutIcon from "@mui/icons-material/Logout";
import { ConvergeNavbarLogo } from "./Logo";
import { initials, avatarColor } from "@/lib/data";
import { fetchTickets } from "@/lib/api";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import type { Ticket } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/team-performance", label: "Team", icon: GroupsIcon },
  { href: "/tickets", label: "Tickets", icon: ConfirmationNumberIcon },
];

/** Bell icon fed by real open/in-progress tickets — no fake unread count. */
function NotificationsMenu() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const load = useCallback(async () => {
    try { setTickets(await fetchTickets()); } catch { setTickets([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const open = tickets.filter(t => t.status === "Open" || t.status === "In Progress");

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton size="small" onClick={(e) => { setAnchorEl(e.currentTarget); load(); }} sx={{ color: "text.secondary" }}>
          <Badge badgeContent={open.length} color="error" max={99}>
            <NotificationsNoneIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 320, maxHeight: 400 } } }}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Open tickets</Typography>
          <Typography variant="caption" color="text.secondary">{open.length} need attention</Typography>
        </Box>
        <Divider />
        {open.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>Nothing open — you're all caught up.</Typography>
        ) : (
          open.slice(0, 5).map(t => (
            <MenuItem key={t.id} onClick={() => { setAnchorEl(null); router.push("/tickets"); }} sx={{ whiteSpace: "normal", alignItems: "flex-start", py: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>#{t.seq} {t.title}</Typography>
                <Typography variant="caption" color="text.secondary">{t.projectName}</Typography>
              </Box>
            </MenuItem>
          ))
        )}
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); router.push("/tickets"); }} sx={{ justifyContent: "center", color: "primary.main", fontWeight: 600 }}>
          View all tickets
        </MenuItem>
      </Menu>
    </>
  );
}

/**
 * App-wide chrome — no sidebar (removed per product decision): a single
 * top AppBar carries the logo, primary navigation, and the "viewing as"
 * role switch. Nav items highlight based on the current route.
 */
/** Avatar → account summary + sign out. */
function AccountMenu() {
  const { user, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const displayName = user?.name ?? "Account";

  return (
    <>
      <Tooltip title={displayName}>
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ p: 0 }}>
          <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, bgcolor: avatarColor(displayName) }}>
            {initials(displayName)}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { minWidth: 220 } } }}>
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{displayName}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {user ? `${user.employeeCode} · ${user.role}` : ""}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {user?.team}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); signOut(); }}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { mode, toggleMode } = useAppContext();
  const pathname = usePathname();

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", color: "text.primary" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }} elevation={0}>
        <Toolbar sx={{ gap: 3 }}>
          <ConvergeNavbarLogo height={46} />

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
            <Box sx={{ display: "flex", alignItems: "center", border: "1px solid", borderColor: "divider", borderRadius: 2, p: 0.25 }}>
              <Tooltip title="Light theme">
                <IconButton size="small" onClick={() => mode !== "light" && toggleMode()}
                  sx={{ color: mode === "light" ? "primary.main" : "text.secondary", bgcolor: mode === "light" ? "action.selected" : "transparent" }}>
                  <LightModeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Dark theme">
                <IconButton size="small" onClick={() => mode !== "dark" && toggleMode()}
                  sx={{ color: mode === "dark" ? "primary.main" : "text.secondary", bgcolor: mode === "dark" ? "action.selected" : "transparent" }}>
                  <DarkModeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <NotificationsMenu />

            <AccountMenu />
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ p: { xs: 2, md: 3.5 }, pt: { xs: 10, md: 11 } }}>
        {children}
      </Box>
    </Box>
  );
}
