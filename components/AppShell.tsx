"use client";

import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import { alpha, darken, ThemeProvider } from "@mui/material/styles";
import { LIGHT_THEME, DASHBOARD_COLORS } from "@/lib/theme";
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
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import FlagCircleIcon from "@mui/icons-material/FlagCircle";
import { ConvergeNavbarLogo } from "./Logo";
import { ProjectForm, type ProjectFormPayload } from "./ProjectForm";
import { TicketForm } from "./TicketsPanel";
import { initials, avatarColor, roleCan } from "@/lib/data";
import { fetchTickets, fetchProjectsIndex, createProjectApi, createTicketApi } from "@/lib/api";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import type { CreateTicketInput, ProjectIndexRow, Ticket } from "@/lib/types";

const WINE_RED = "#A4243B";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/team-performance", label: "Team", icon: GroupsIcon },
  { href: "/tickets", label: "Tickets", icon: ConfirmationNumberIcon },
  { href: "/kanban", label: "Kanban", icon: ViewKanbanIcon },
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

/**
 * "Raise ticket" / "New project" — moved here from the Dashboard page so
 * they're reachable from any route, not just "/". AppShell sits at a
 * stable position in the tree (rendered once by AuthGate, see that file),
 * so this component doesn't unmount on client-side navigation between
 * pages — the fetched project list persists rather than re-fetching on
 * every route change.
 */
function ProjectQuickActions() {
  const router = useRouter();
  const { role } = useAppContext();
  const [projects, setProjects] = useState<ProjectIndexRow[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectBusy, setProjectBusy] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);

  const loadProjects = useCallback(async () => {
    try { setProjects(await fetchProjectsIndex()); } catch { setProjects([]); }
  }, []);
  useEffect(() => { loadProjects(); }, [loadProjects]);

  const projectOptions = projects.map(p => ({ id: p.id, name: p.name }));

  const createProject = async (payload: ProjectFormPayload) => {
    if (!roleCan(role, "createProject")) return;
    setProjectBusy(true);
    try {
      const project = await createProjectApi(payload);
      setShowNewProject(false);
      loadProjects();
      router.push(`/projects/${project.id}`);
    } catch (e) {
      console.error(e);
    }
    setProjectBusy(false);
  };

  const raiseTicket = async (payload: CreateTicketInput) => {
    if (!roleCan(role, "raiseTicket")) return;
    setTicketBusy(true);
    try {
      await createTicketApi(payload);
      setShowTicketForm(false);
    } catch (e) {
      console.error(e);
    }
    setTicketBusy(false);
  };

  return (
    <>
      {roleCan(role, "raiseTicket") && (
        <Button
          size="small" variant="outlined" startIcon={<FlagCircleIcon fontSize="small" />}
          onClick={() => setShowTicketForm(true)} disabled={!projectOptions.length}
          sx={{
            // Wine red, not the vivid DASHBOARD_COLORS.red used for
            // delayed/error states elsewhere — a deliberately deeper,
            // muted tone for this one button.
            color: WINE_RED, borderColor: WINE_RED,
            "&:hover": { borderColor: WINE_RED, bgcolor: alpha(WINE_RED, 0.08) },
          }}
        >
          Raise Ticket
        </Button>
      )}
      {roleCan(role, "createProject") && (
        <Button
          size="small" variant="contained" startIcon={<AddIcon fontSize="small" />}
          onClick={() => setShowNewProject(true)}
          sx={{
            bgcolor: DASHBOARD_COLORS.blue, color: "#fff",
            "&:hover": { bgcolor: darken(DASHBOARD_COLORS.blue, 0.15) },
          }}
        >
          New Project
        </Button>
      )}

      {showNewProject && roleCan(role, "createProject") && (
        <ProjectForm
          title="New project" initial={null} submitLabel="Create project" busy={projectBusy}
          onClose={() => setShowNewProject(false)} onSubmit={createProject}
        />
      )}
      {showTicketForm && roleCan(role, "raiseTicket") && (
        <TicketForm projects={projectOptions} busy={ticketBusy} onClose={() => setShowTicketForm(false)} onSubmit={raiseTicket} />
      )}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { mode, toggleMode } = useAppContext();
  const pathname = usePathname();

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", color: "text.primary" }}>
      {/* Pinned to the light theme, same reasoning as the login card: the
          navbar logo (public/converge-navbar.png) has a baked-in white
          background, so the bar it sits on has to always be light too, or
          that background shows as a stray white rectangle in dark mode. */}
      <ThemeProvider theme={LIGHT_THEME}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }} elevation={0}>
        <Toolbar sx={{ gap: 3 }}>
          <ConvergeNavbarLogo height={60} />

          <Box sx={{ display: "flex", gap: 0.5 }}>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Button
                  key={href} component={Link} href={href}
                  startIcon={<Icon sx={{ fontSize: 18 }} />}
                  sx={{
                    color: active ? DASHBOARD_COLORS.blue : "text.secondary",
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
            <ProjectQuickActions />

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
      </ThemeProvider>

      <Box component="main" sx={{ p: { xs: 2, md: 3.5 }, pt: { xs: 10, md: 11 } }}>
        {children}
      </Box>
    </Box>
  );
}
