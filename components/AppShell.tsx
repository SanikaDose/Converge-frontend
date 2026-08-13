"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import { alpha, darken } from "@mui/material/styles";
import { DASHBOARD_COLORS } from "@/lib/theme";
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
import PersonOutlineIcon from "@mui/icons-material/PersonOutlineOutlined";
import AddIcon from "@mui/icons-material/Add";
import FlagCircleIcon from "@mui/icons-material/FlagCircle";
import { ConvergeNavbarLogo } from "./Logo";
import { ProjectForm, type ProjectFormPayload } from "./ProjectForm";
import { TicketForm } from "./TicketsPanel";
import { initials, avatarColor, roleCan, VIEW_ONLY_HINT } from "@/lib/data";
import { recordNavigation } from "@/lib/navHistory";
import { useGetProjectsQuery, useCreateProjectMutation } from "@/store/api/projectsApi";
import { useGetTicketsQuery, useCreateTicketMutation } from "@/store/api/ticketsApi";
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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Opening the bell still refetches, as it did before; the cache means
  // this shares one request with the Tickets page rather than duplicating it.
  const { data, refetch } = useGetTicketsQuery();
  const tickets: Ticket[] = useMemo(() => data ?? [], [data]);
  const load = refetch;

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
  const router = useRouter();
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
        <MenuItem onClick={() => { setAnchorEl(null); router.push("/profile"); }}>
          <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
          My profile
        </MenuItem>
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
  const [showNewProject, setShowNewProject] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);

  const { data: projectsData } = useGetProjectsQuery();
  const projects: ProjectIndexRow[] = useMemo(() => projectsData ?? [], [projectsData]);
  // `isLoading` from the mutation replaces the hand-rolled busy flags, so
  // the forms' spinners are driven by the request itself.
  const [createProjectMutation, { isLoading: projectBusy }] = useCreateProjectMutation();
  const [createTicketMutation, { isLoading: ticketBusy }] = useCreateTicketMutation();

  const projectOptions = projects.map(p => ({ id: p.id, name: p.name }));
  const canRaiseTicket = roleCan(role, "raiseTicket");
  const canCreateProject = roleCan(role, "createProject");

  const createProject = async (payload: ProjectFormPayload) => {
    if (!roleCan(role, "createProject")) return;
    try {
      // The mutation invalidates "Projects", so the list here and every
      // other view of it refetch — the explicit loadProjects() call this
      // replaced only refreshed this one component's copy.
      const project = await createProjectMutation(payload).unwrap();
      setShowNewProject(false);
      router.push(`/projects/${project.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const raiseTicket = async (payload: CreateTicketInput) => {
    if (!roleCan(role, "raiseTicket")) return;
    try {
      await createTicketMutation(payload).unwrap();
      setShowTicketForm(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      {/* Both stay visible for a read-only User and render disabled — see
          VIEW_ONLY_HINT. Tooltip needs the span: a disabled button doesn't
          emit the pointer events Tooltip listens for. */}
      <Tooltip title={canRaiseTicket ? "" : VIEW_ONLY_HINT}>
        <span>
          <Button
            size="small" variant="outlined" startIcon={<FlagCircleIcon fontSize="small" />}
            onClick={() => setShowTicketForm(true)} disabled={!canRaiseTicket || !projectOptions.length}
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
        </span>
      </Tooltip>
      <Tooltip title={canCreateProject ? "" : VIEW_ONLY_HINT}>
        <span>
          <Button
            size="small" variant="contained" startIcon={<AddIcon fontSize="small" />}
            onClick={() => setShowNewProject(true)} disabled={!canCreateProject}
            sx={{
              bgcolor: DASHBOARD_COLORS.blue, color: "#fff",
              "&:hover": { bgcolor: darken(DASHBOARD_COLORS.blue, 0.15) },
            }}
          >
            New Project
          </Button>
        </span>
      </Tooltip>

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

  // AppShell renders once for the whole session and never remounts, so this
  // is the one place that sees every route change — it's what lets a page's
  // Back button tell "go back" from "there's nowhere to go back to".
  useEffect(() => { recordNavigation(pathname); }, [pathname]);

  return (
    <Box sx={{ minHeight: "100%", bgcolor: "background.default", color: "text.primary" }}>
      {/* Follows the active theme. It used to be pinned to LIGHT_THEME
          because the navbar logo had an opaque white background baked in —
          now that ConvergeNavbarLogo swaps to a transparent dark-mode
          asset, the bar can be dark like everything else. */}
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

      <Box component="main" sx={{ p: { xs: 2, md: 3.5 }, pt: { xs: 10, md: 11 } }}>
        {children}
      </Box>
    </Box>
  );
}
