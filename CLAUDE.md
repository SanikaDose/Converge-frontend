# Converge Projects

Enterprise project management app for Converge's Software, Vision, and Automation teams —
Next.js (App Router) + MUI, mock in-memory data layer behind real API routes.

## Run it

```bash
cd /Users/apple/development/Converge
npm install
npm run dev
```

Opens on http://localhost:3000. Seed data (one example project + one ticket) is created the
first time `lib/mockDb.js` loads in a given server process.

## Architecture at a glance

```
app/
  layout.jsx                 Root layout: ThemeRegistry + AppProvider + AppShell wrap every page.
                              metadata.icons points at public/ApplicationIcon.png (real favicon).
  page.jsx                   Dashboard route ("/")
  team-performance/page.jsx  Team Performance route
  projects/[id]/page.jsx     Project detail route
  api/
    projects/route.js            GET (list, live-computed index rows), POST (create)
    projects/[id]/route.js       GET (full detail), PATCH (merge meta/phases/tasks)
    tickets/route.js             GET, POST
    tickets/[id]/route.js        PATCH
    team-performance/route.js    GET — server-computed aggregation
    employees/route.js           GET — org directory (also directly importable from lib/data.js)

components/                  All "use client" — this app has no server components beyond
                              the route handlers above.
  AppShell.jsx                Top AppBar only — NO sidebar (removed deliberately). Logo +
                               Dashboard/Team Performance nav links + role switcher.
  Logo.jsx                     LogoMark renders public/ApplicationIcon.png via next/image on a
                               light rounded-square tile; LogoLockup adds the wordmark + the
                               three Vision/Software/Automation accent bars.
  Dashboard.jsx                 KPIs, TicketsPanel, search, and exactly TWO project accordions:
                               "In Progress Projects" and "Delayed Projects". There is
                               deliberately no "On Track" accordion — it was removed and folded
                               into "In Progress" (a project that hasn't started or finished
                               clean isn't a meaningfully different bucket from one progressing
                               with no delays).
  TicketsPanel.jsx              THREE accordions: Raised Tickets (status=Open), In Progress,
                               Completed (Resolved + Closed merged).
  ProjectDetail.jsx             Owns all project/task mutation handlers: status change, phase
                               CRUD, drag-reorder, and the inline field-commit handlers
                               (owner/day-offset/planned-start/duration/description) that route
                               scheduling changes through the approval-workflow branch point.
  TaskCard.jsx                   Quick-edit card: Owner / Day from start / Planned start date /
                               Duration (days) are ALWAYS-VISIBLE inline fields, commit on
                               blur — no drawer, no "enter edit mode" step. A pencil icon opens
                               TaskDetailsDialog for the fields that don't live inline.
  TaskDetailsDialog.jsx          Centered MUI Dialog (NOT a side Drawer — that was explicitly
                               replaced) for name / priority / dependencies only.
  PhaseManager.jsx               PhaseNavList, EditPhaseDialog, DeletePhaseDialog, AddTaskDialog,
                               PhaseTaskPanel (native HTML5 drag & drop for task reordering).
  TimelineView.jsx               Gantt: weekend shading, today marker, achievement icons,
                               pending-approval dashed border, Week/Month/Quarter zoom.
  TeamPerformance.jsx             MUI DataGrid fed by /api/team-performance.
  common.jsx                     OrgSelect (grouped-by-team dropdown), StatusChip,
                               EmployeeAvatar, AchievementBadge, PendingApprovalChip.
  Stack.jsx                      Wrapper around MUI's Stack — see "MUI v9 gotchas" below.
  ThemeRegistry.jsx               Standard MUI + Next.js App Router emotion-SSR cache wiring.

lib/                          Framework-agnostic — no React imports, safe to use from API
                              routes or components alike.
  data.js                      TEMPLATE (12 phases / 62 tasks), TEAMS/EMPLOYEES org directory,
                               ROLES + PERMISSIONS, roleCan(), genId().
  dateUtils.js                 UTC-consistent date arithmetic + working-day (Mon–Fri) calendar.
  businessLogic.js             Task/phase generation, delay detection, achievement detection,
                               the approval workflow (requestScheduleChange /
                               approveScheduleChange / rejectScheduleChange), team-performance
                               aggregation, live dashboard-stats recompute.
  mockDb.js                    In-memory "database" — see "Mock data" below.
  theme.js                     MUI theme: dark ground, blue/teal brand palette from the logo.
  api.js                       fetch() wrappers, one per API route.

context/AppContext.jsx        role / selfId / actor React Context, persisted to localStorage.

public/ApplicationIcon.png    The real Converge logo (uploaded by the user) — used for both
                              the navbar mark and the browser favicon.
```

## Roles (currently simplified)

`ROLES = ["Admin", "Developer"]` in `lib/data.js` — **both roles currently have every
permission** (`PERMISSIONS` maps every action to `ALL_ROLES`). This was a deliberate
simplification requested by the user ("all access for now").

The approval workflow (a task's scheduling edit by someone without `editScheduleDirectly`
creates a Pending-Approval change request instead of applying immediately) is still fully
implemented in `businessLogic.js` and wired into `TaskCard`/`ProjectDetail`, but it's currently
**unreachable** — reintroducing a role without `editScheduleDirectly` in the `PERMISSIONS` table
in `lib/data.js` is all it takes to make it live again.

## Mock data — read this before assuming anything is persisted

`lib/mockDb.js` is a **module-level in-memory store**. It is seeded once per server process
(one example project + one ticket) and all API routes read/write that same in-memory object.
This means:

- Data survives across page navigations and reloads *within a running `npm run dev` session*.
- Data is **wiped on every server restart** (Fast Refresh recompiles that don't reset the module
  are fine; stopping and re-running `npm run dev` is not).
- There is no real database. Swapping one in means rewriting `mockDb.js`'s functions
  (`listProjectsIndex`, `getProject`, `createProject`, `updateProject`, `listTickets`,
  `createTicket`, `updateTicket`) — the API routes and every component calling `lib/api.js`
  should not need to change.

## Known limitations

- No real authentication — the role switcher in the top bar is a pure client-side simulation.
- No real database (see above).
- Not yet a git repository — there is no commit history / rollback safety net for this code.
  If you want that, ask Claude Code to `git init` and make an initial commit.

## MUI v9 gotchas already worked around (don't reintroduce these)

This project pins `@mui/material` / `@mui/icons-material` / `@mui/x-data-grid` to `9.x`, which
changed several APIs from what older MUI docs/examples show:

- `TextField`'s `InputProps` / `InputLabelProps` / `inputProps` → `slotProps={{ input, inputLabel, htmlInput }}`.
- `Drawer`'s `PaperProps` → `slotProps={{ paper: {...} }}`.
- `Grid`'s old `<Grid item xs={12}>` → `<Grid size={{ xs: 12 }}>` (no more bare `item` prop).
- `DataGrid` needs an **explicit width** on its containing `Box` (`width: "100%"` or a fixed
  px value) or it silently renders at 0px.
- A disabled `Button`/icon wrapped directly in `Tooltip` warns — wrap the disabled child in a
  `<span>` first.
- **MUI Stack in this version only honors `direction`/`spacing`/`divider` as real props.**
  Passing other CSS-shorthand props directly (`justifyContent`, `alignItems`, `flexWrap`, `gap`,
  etc. — the pattern older MUI versions supported) silently does nothing; `sx` still works.
  `components/Stack.jsx` is a thin wrapper that redirects those specific props into `sx`
  automatically — every component in this app imports `Stack` from `./Stack.jsx`, never
  `@mui/material/Stack` directly. Keep doing that for any new component.

## History of notable decisions (most recent first)

1. Replaced the hand-vectorized SVG logo approximation with the real uploaded asset
   (`public/ApplicationIcon.png`), used via `next/image` for both the navbar mark and the
   browser favicon (`app/layout.jsx` metadata).
2. Removed the "On Track Projects" dashboard accordion — folded into "In Progress".
3. Simplified `ROLES` from a 5-role simulation (Admin/PM/Team Lead/Team Member/Viewer) down to
   Admin + Developer, both full access, per user request — see "Roles" above.
4. Redesigned `TaskCard` to match a supplied reference screenshot: inline always-editable
   Owner/Day-from-start/Planned-start/Duration fields (commit on blur) instead of a side Drawer.
   `TaskEditorDrawer.jsx` was deleted and replaced by `TaskDetailsDialog.jsx` (a centered modal,
   consistent with every other editor in the app) for name/priority/dependencies only.
   description/owner/scheduling moved to the inline card fields.
5. `TicketsPanel` reorganized into three accordions (Raised/In Progress/Completed) matching the
   dashboard's project-accordion pattern.
6. Converted the whole app from a single-file MUI artifact (built earlier, still published as a
   Claude.ai Artifact) into this proper Next.js project with real API routes + mock DB + React
   state, sidebar removed in favor of top nav only.
7. Fixed a real timezone bug in the original date math: mixing local-time `Date` parsing with
   UTC serialization silently shifted every computed date back a day (and the shift compounded
   between planned-start and planned-finish, occasionally putting finish before start). All
   date arithmetic in `lib/dateUtils.js` is now UTC-consistent except `todayISO()`, which
   deliberately reads the *local* calendar date since that's what "today" means to whoever's
   looking at the screen.

## Earlier artifact (context only, not part of this Next.js app)

Before this Next.js conversion, the same app existed as a single self-contained HTML file
(React + MUI + Emotion bundled via esbuild, `window.storage`/localStorage in place of a real
backend) published as a Claude.ai Artifact. That version is unrelated to the code in this
directory now — this repo is the current, actively developed version.
