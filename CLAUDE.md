# Converge Projects

Enterprise project management app for Converge's Software, Vision, and Automation teams —
Next.js (App Router) + TypeScript + MUI, mock in-memory data layer behind real API routes.

## Run it

```bash
cd /Users/apple/development/Converge
npm install
npm run dev
```

Opens on http://localhost:3000. Seed data (one example project + one ticket) is created the
first time `lib/mockDb.ts` loads in a given server process.

## Architecture at a glance

```
app/
  layout.tsx                 Root layout: ThemeRegistry + AppProvider + AppShell wrap every page.
                              metadata.icons points at public/ApplicationIcon.png (real favicon).
  page.tsx                   Dashboard route ("/")
  team-performance/page.tsx  Team Performance route
  projects/[id]/page.tsx     Project detail route
  api/
    projects/route.ts            GET (list, live-computed index rows), POST (create)
    projects/[id]/route.ts       GET (full detail), PATCH (merge meta/phases/tasks)
    tickets/route.ts             GET, POST
    tickets/[id]/route.ts        PATCH
    team-performance/route.ts    GET — server-computed aggregation
    employees/route.ts           GET — org directory (also directly importable from lib/data.ts)

components/                  All "use client" — this app has no server components beyond
                              the route handlers above.
  AppShell.tsx                Top AppBar only — NO sidebar (removed deliberately). Logo +
                               Dashboard/Team Performance nav links + role switcher.
  Logo.tsx                      LogoMark renders public/ApplicationIcon.png via next/image on a
                               light rounded-square tile; LogoLockup adds the wordmark + the
                               three Vision/Software/Automation accent bars.
  Dashboard.tsx                  KPIs, TicketsPanel, search, and exactly TWO project accordions:
                               "In Progress Projects" and "Delayed Projects". There is
                               deliberately no "On Track" accordion — it was removed and folded
                               into "In Progress" (a project that hasn't started or finished
                               clean isn't a meaningfully different bucket from one progressing
                               with no delays).
  TicketsPanel.tsx               THREE accordions: Raised Tickets (status=Open), In Progress,
                               Completed (Resolved + Closed merged).
  ProjectDetail.tsx              Owns all project/task mutation handlers: status change, phase
                               CRUD, drag-reorder, and the inline field-commit handlers
                               (owner/day-offset/planned-start/duration/description) that route
                               scheduling changes through the approval-workflow branch point.
                               Header is compact: icon-only back button, project name + status
                               chip on one line (no separate "Portfolio"/type-chip row).
  TaskCard.tsx                    Quick-edit card: Owner / Day from start / Planned start date /
                               Duration (days) are ALWAYS-VISIBLE inline fields, commit on
                               blur — no drawer, no "enter edit mode" step. A pencil icon opens
                               TaskDetailsDialog for the fields that don't live inline.
  TaskDetailsDialog.tsx           Centered MUI Dialog (NOT a side Drawer — that was explicitly
                               replaced) for name / priority / dependencies only.
  PhaseManager.tsx                PhaseNavList, EditPhaseDialog, DeletePhaseDialog, AddTaskDialog,
                               PhaseTaskPanel (native HTML5 drag & drop for task reordering).
  TimelineView.tsx                Gantt: weekend shading, today marker, achievement icons,
                               pending-approval dashed border, Week/Month/Quarter zoom.
  TeamPerformance.tsx              MUI DataGrid fed by /api/team-performance. KPI summary row
                               (StatCard from common.tsx) above the grid; Total/Completed/Pending
                               columns are consolidated into one "Tasks" cell, zero-task rows show
                               muted "—"/"No tasks" instead of literal zeros.
  common.tsx                      OrgSelect (grouped-by-team dropdown), StatusChip,
                               EmployeeAvatar, AchievementBadge, PendingApprovalChip, StatCard
                               (shared KPI tile used by Dashboard and TeamPerformance).
  Stack.tsx                       Wrapper around MUI's Stack — see "MUI v9 gotchas" below.
  ThemeRegistry.tsx                Standard MUI + Next.js App Router emotion-SSR cache wiring.

lib/                          Framework-agnostic — no React imports, safe to use from API
                              routes or components alike.
  types.ts                     Shared domain types (Task, Phase, ProjectMeta, Employee, Ticket,
                               Actor, permission/role unions, etc.) — every other lib/* and
                               component file imports from here rather than re-declaring shapes.
  data.ts                      TEMPLATE (12 phases / 62 tasks), TEAMS/EMPLOYEES org directory,
                               ROLES + PERMISSIONS, roleCan(), genId().
  dateUtils.ts                 UTC-consistent date arithmetic + working-day (Mon–Fri) calendar.
  businessLogic.ts             Task/phase generation, delay detection, achievement detection,
                               the approval workflow (requestScheduleChange /
                               approveScheduleChange / rejectScheduleChange), team-performance
                               aggregation, live dashboard-stats recompute.
  mockDb.ts                    In-memory "database" — see "Mock data" below.
  theme.ts                     MUI theme: dark ground, blue/teal brand palette from the logo.
  api.ts                       fetch() wrappers, one per API route.

context/AppContext.tsx        role / selfId / actor React Context, persisted to localStorage.

public/ApplicationIcon.png    The real Converge logo (uploaded by the user) — used for both
                              the navbar mark and the browser favicon.
```

## Roles (currently simplified)

`ROLES = ["Admin", "Developer"]` in `lib/data.ts` — **both roles currently have every
permission** (`PERMISSIONS` maps every action to `ALL_ROLES`). This was a deliberate
simplification requested by the user ("all access for now").

The approval workflow (a task's scheduling edit by someone without `editScheduleDirectly`
creates a Pending-Approval change request instead of applying immediately) is still fully
implemented in `businessLogic.ts` and wired into `TaskCard`/`ProjectDetail`, but it's currently
**unreachable** — reintroducing a role without `editScheduleDirectly` in the `PERMISSIONS` table
in `lib/data.ts` is all it takes to make it live again.

## Mock data — read this before assuming anything is persisted

`lib/mockDb.ts` is a **module-level in-memory store**. It is seeded once per server process
(one example project + one ticket) and all API routes read/write that same in-memory object.
This means:

- Data survives across page navigations and reloads *within a running `npm run dev` session*.
- Data is **wiped on every server restart** (Fast Refresh recompiles that don't reset the module
  are fine; stopping and re-running `npm run dev` is not).
- There is no real database. Swapping one in means rewriting `mockDb.ts`'s functions
  (`listProjectsIndex`, `getProject`, `createProject`, `updateProject`, `listTickets`,
  `createTicket`, `updateTicket`) — the API routes and every component calling `lib/api.ts`
  should not need to change.

## Known limitations

- No real authentication — the role switcher in the top bar is a pure client-side simulation.
- No real database (see above).
- `next lint` currently fails ("Invalid project directory") — Next 16 changed how the built-in
  ESLint integration bootstraps and this repo has no `eslint.config.*` yet. Pre-existing, not
  something the TypeScript migration touched; set up ESLint separately if/when needed.

## TypeScript

The app is TypeScript end-to-end (`.ts`/`.tsx` — no `.js`/`.jsx` remain under `app/`,
`components/`, `lib/`, or `context/`). `tsconfig.json` runs in `strict` mode. Domain types live
in `lib/types.ts`; component props and API route handlers are typed against them rather than
re-declared ad hoc. `npx tsc --noEmit` and `npx next build` should both stay clean — run either
after non-trivial changes.

`tsconfig.json` deliberately has no `baseUrl` (only `paths`) — recent TypeScript releases removed
standalone `baseUrl` support, and `paths` alone resolves `@/*` relative to the tsconfig's own
directory, which is what this repo wants anyway.

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
  `components/Stack.tsx` is a thin wrapper that redirects those specific props into `sx`
  automatically — every component in this app imports `Stack` from `./Stack`, never
  `@mui/material/Stack` directly. Keep doing that for any new component.
- **`Typography`'s TS types in this pinned version don't declare `fontWeight`/`fontSize` as direct
  props** (unlike `noWrap`, `color`, etc., which do work directly). This compiles fine in plain
  JS/PropTypes but fails `tsc` under `strict`. Put `fontWeight`/`fontSize` inside `sx={{ ... }}`
  instead — every `Typography` usage in this app already does this; don't reintroduce a bare
  `fontWeight={...}`/`fontSize={...}` prop.

## History of notable decisions (most recent first)

1. Migrated the entire app from JavaScript/JSX to TypeScript (`strict` mode, no `.js`/`.jsx`
   remaining under `app/`, `components/`, `lib/`, `context/`) — see "TypeScript" above. Surfaced
   one real latent bug in the process: `OrgSelect` (`components/common.tsx`) never accepted or
   forwarded a `disabled` prop, so `TaskCard`'s owner dropdown wasn't actually being locked for
   Pending-Approval tasks; fixed as part of the migration.
2. Team Performance page decluttered: KPI summary row added (`StatCard`, extracted from
   `Dashboard.tsx` into `common.tsx` for reuse), Total/Completed/Pending columns merged into one
   "Tasks" cell, zero-task rows show muted "—"/"No tasks" instead of repeated literal zeros, and
   the name/role cell's line-height bug (MUI DataGrid forces cell `line-height` to match row
   height, which was pushing two-line cell content up into the row above) was fixed.
3. Project detail header compacted: back button is icon-only (no "Portfolio" label), and the
   separate "Product"/status-chip row above the title was merged onto the title's own line to
   save vertical space.
4. Added a global dark-themed scrollbar (`app/globals.css`) — the browser-default light/white
   scrollbar thumb read as a bug against this app's dark ground, especially in the always-visible
   phase nav list and task panel scroll regions.
5. Replaced the hand-vectorized SVG logo approximation with the real uploaded asset
   (`public/ApplicationIcon.png`), used via `next/image` for both the navbar mark and the
   browser favicon (`app/layout.tsx` metadata).
6. Removed the "On Track Projects" dashboard accordion — folded into "In Progress".
7. Simplified `ROLES` from a 5-role simulation (Admin/PM/Team Lead/Team Member/Viewer) down to
   Admin + Developer, both full access, per user request — see "Roles" above.
8. Redesigned `TaskCard` to match a supplied reference screenshot: inline always-editable
   Owner/Day-from-start/Planned-start/Duration fields (commit on blur) instead of a side Drawer.
   `TaskEditorDrawer.jsx` was deleted and replaced by `TaskDetailsDialog.tsx` (a centered modal,
   consistent with every other editor in the app) for name/priority/dependencies only.
   description/owner/scheduling moved to the inline card fields.
9. `TicketsPanel` reorganized into three accordions (Raised/In Progress/Completed) matching the
   dashboard's project-accordion pattern.
10. Converted the whole app from a single-file MUI artifact (built earlier, still published as a
    Claude.ai Artifact) into this proper Next.js project with real API routes + mock DB + React
    state, sidebar removed in favor of top nav only.
11. Fixed a real timezone bug in the original date math: mixing local-time `Date` parsing with
    UTC serialization silently shifted every computed date back a day (and the shift compounded
    between planned-start and planned-finish, occasionally putting finish before start). All
    date arithmetic in `lib/dateUtils.ts` is now UTC-consistent except `todayISO()`, which
    deliberately reads the *local* calendar date since that's what "today" means to whoever's
    looking at the screen.

## Earlier artifact (context only, not part of this Next.js app)

Before this Next.js conversion, the same app existed as a single self-contained HTML file
(React + MUI + Emotion bundled via esbuild, `window.storage`/localStorage in place of a real
backend) published as a Claude.ai Artifact. That version is unrelated to the code in this
directory now — this repo is the current, actively developed version.
