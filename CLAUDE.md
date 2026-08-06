# Converge Projects

Enterprise project management app for Converge's Software, Vision, and Automation teams —
Next.js (App Router) + TypeScript + MUI, mock in-memory data layer behind real API routes.

## Run it

```bash
cd /Users/apple/development/Converge
npm install
npm run dev
```

Opens on http://localhost:3000. Seed data (two example projects — one early-stage, one well
underway with realistic delays/achievements — plus four tickets) is created the first time
`lib/mockDb.ts` loads in a given server process.

## Architecture at a glance

```
app/
  layout.tsx                 Root layout: AppProvider + ThemeRegistry + AppShell wrap every page,
                              in that order — ThemeRegistry reads AppContext's `mode` to build the
                              MUI theme, so AppProvider has to be the outer one.
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
  ThemeRegistry.tsx                Builds the MUI theme from AppContext's `mode` (createAppTheme)
                               and stamps `data-theme` on <html> for the CSS-variable-driven
                               scrollbar/body-background in app/globals.css — plus the standard
                               Next.js App Router emotion-SSR cache wiring.

lib/                          Framework-agnostic — no React imports, safe to use from API
                              routes or components alike.
  types.ts                     Shared domain types (Task, Phase, ProjectMeta, Employee, Ticket,
                               Actor, permission/role unions, ThemeMode, etc.) — every other lib/*
                               and component file imports from here rather than re-declaring shapes.
  data.ts                      TEMPLATE (12 phases / 62 tasks), TEAMS/EMPLOYEES org directory,
                               ROLES + PERMISSIONS, roleCan(), genId().
  dateUtils.ts                 UTC-consistent date arithmetic + working-day (Mon–Fri) calendar.
  businessLogic.ts             Task/phase generation, delay detection, achievement detection,
                               the approval workflow (requestScheduleChange /
                               approveScheduleChange / rejectScheduleChange), team-performance
                               aggregation, live dashboard-stats recompute.
  mockDb.ts                    In-memory "database" — see "Mock data" below.
  theme.ts                     createAppTheme(mode) builds the light/dark MUI theme; useStatusHex()
                               is how components read the mode-appropriate status color map — see
                               "Light/dark theme" below.
  api.ts                       fetch() wrappers, one per API route.

context/AppContext.tsx        role / selfId / actor / mode (+ toggleMode) React Context, all
                              persisted together to localStorage.

public/ApplicationIcon.png    The real Converge logo (uploaded by the user) — used for both
                              the navbar mark and the browser favicon.
```

## Roles (currently simplified)

`ROLES = ["Admin", "Developer"]` in `lib/data.ts` — **both roles currently have every
permission** (`PERMISSIONS` maps every action to `ALL_ROLES`). This was a deliberate
simplification requested by the user ("all access for now").

Task owners are **never pre-assigned** — every task (seed data included) is created with
`assignedTo: null`. This was a deliberate change: the seed project used to auto-assign its first
five tasks to specific employees for demo purposes, which read as if the app were picking owners
for you. Whoever picks up a task assigns it to themselves (or someone else) via the task card's
Owner dropdown.

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

## Business-day calendar (week off)

Every project has its own `meta.weekOff: WeekDay[]` (0 = Sunday … 6 = Saturday, matching
`Date#getUTCDay()`), chosen when the project is created and editable afterwards from Project
Settings — a day-of-week picker in `ProjectForm.tsx`, capped at `MAX_WEEK_OFF_DAYS` (2) via
`lib/data.ts`. It defaults to Saturday + Sunday (`DEFAULT_WEEK_OFF` in `lib/dateUtils.ts`) but can
be any 0–2 days — there's nothing Sat/Sun-specific about the underlying math.

This is **not cosmetic** — `weekOff` is threaded through every business-day calculation:
`isWeekend`/`addWorkingDays`/`businessDaysBetween` (`lib/dateUtils.ts`) all take it as a parameter,
and everything built on them (`computePlanned`, `buildTasks`, `suggestedEndDate`,
`overdueWorkingDays`, `computeAchievement` in `lib/businessLogic.ts`) accepts and forwards it
rather than hardcoding Saturday/Sunday. Every call site — `ProjectDetail.tsx`'s scheduling
handlers, `PhaseManager.tsx`'s `AddTaskDialog` preview, `TaskCard.tsx`'s overdue-days badge,
`TimelineView.tsx`'s weekend shading — reads it from `detail.meta.weekOff` and passes it down.
Changing a project's week-off in Project Settings re-plans every task's dates the same way
changing the start date does (see `ProjectDetail.saveSettings`).

Projects created before this feature existed have no `meta.weekOff` — `ensureProjectShape` in
`lib/businessLogic.ts` defaults it to `DEFAULT_WEEK_OFF` the first time such a project loads, so
old data doesn't crash the date math.

## Light/dark theme

Toggled from the sun/moon icon button in the navbar (`AppShell.tsx`); state lives in
`AppContext`'s `mode`/`toggleMode`, persisted to localStorage alongside role/selfId. Default is
dark (the original look).

- **`lib/theme.ts`**: `createAppTheme(mode)` returns a full MUI theme per mode — separate
  background/paper/text/divider/primary values for light vs dark, not just an inverted palette.
- **Status colors need two maps, not one.** `STATUS_HEX_DARK`'s bright/high-chroma values were
  tuned to pop on a dark ground and are used directly as *text* color on a translucent tint of
  themselves (`StatusChip`, achievement/pending-approval badges, timeline bars). On white those
  same values (amber especially) fail contrast badly. `STATUS_HEX_LIGHT` darkens/saturates each
  hue enough to stay legible on white. Components call `useStatusHex()` (reads `theme.palette.mode`
  via `useTheme()`) rather than importing a static object, so status colors follow the active
  mode — every component that renders a status color does this (`common.tsx`, `TaskCard.tsx`,
  `TimelineView.tsx`, `ProjectCard.tsx`, `PhaseManager.tsx`, `CompletionRing.tsx`,
  `TeamPerformance.tsx`). If you add a new status-colored element, pull the map from
  `useStatusHex()`, not the deprecated `STATUS_HEX` export — and if it lives inside a
  `useMemo`/`useCallback`, add the `STATUS_HEX` variable to that hook's dependency array (see
  `TeamPerformance.tsx`'s DataGrid `columns`) or it'll render with a stale map after a mode switch.
- **`app/layout.tsx` nests `AppProvider` outside `ThemeRegistry`** deliberately — `ThemeRegistry`
  calls `useAppContext()` to read `mode` and build the theme, so `AppProvider` has to be the
  ancestor. Reversing this order breaks with "must be used within AppProvider".
- **MUI's `CssBaseline` doesn't reliably repaint `<body>`'s background on a live theme swap** —
  it's a one-shot global-style injection via emotion that doesn't re-run cleanly on client-side
  mode toggles (verified: `document.body`'s computed background stayed on the old mode's color
  after toggling, even though every `sx`-driven `Paper`/`Box` updated correctly). Don't rely on
  it for the page background. Fixed two ways instead: `AppShell.tsx`'s root `Box` sets
  `bgcolor: "background.default"` explicitly, and `app/globals.css` sets `html, body`'s
  background from a `--bg-default` CSS variable keyed off `[data-theme]` on `<html>` (which
  `ThemeRegistry` sets in a `useEffect`) — the CSS-variable version also covers page content
  taller than one viewport, where `body`'s own box can end before the visible content does.

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

1. Added a light/dark theme toggle (see "Light/dark theme" above) — navbar sun/moon button,
   `AppContext.mode` persisted to localStorage, `createAppTheme(mode)` in `lib/theme.ts`. Required
   splitting status colors into `STATUS_HEX_DARK`/`STATUS_HEX_LIGHT` (the dark-tuned bright hues
   had bad contrast as text on white) and reworking every component that renders a status color to
   pull from `useStatusHex()` instead of a static import. Also surfaced that `CssBaseline` doesn't
   reliably repaint `<body>`'s background on a live client-side theme swap — worked around with an
   explicit `bgcolor` on `AppShell`'s root `Box` plus a `data-theme`-keyed CSS variable in
   `app/globals.css`, not something to re-break by reverting to relying on `CssBaseline` alone.
2. Reworked the 12-phase task template's day-offsets to close a real scheduling gap: Phase 01's
   tasks were bunched onto day 0–1 while Phase 02 didn't start until day 7, leaving days 2–6
   reserved-but-empty on the Gantt chart. Re-sequenced with explicit parallel/sequential modeling
   (kickoff → requirement-gathering ‖ site-survey in parallel → planning → scope-freeze, each
   depending on the previous step finishing) so Phase 01 now fills the full week Phase 02 was
   already waiting on. Also fixed Engineering Release being scheduled the same day as the Design
   Review that approves it. Improved `TimelineView.tsx` alongside this: bars/dots now color by
   actual overdue-ness (`isOverdue`) rather than literal task status (a "Not Started" task past its
   planned finish was rendering as neutral gray, not red — the whole point of a Gantt chart is to
   surface that), Month/Quarter zoom now show calendar-month labels instead of the same weekly
   cadence crowding into unreadable overlapping marks, phases are collapsible, the header row and
   phase names are sticky while scrolling, the view auto-scrolls to "today" on load, and clicking
   any task bar jumps to that task in Phases view.
3. Enriched the seed data (`lib/mockDb.ts`) for demo/screenshot purposes: a second project
   ("Vertex Robotics", Solution type, well underway with real delays and achievements — contrast
   against the original early-stage "TE Connectivity" project) and a `simulateProgress` helper
   that stamps realistic status/owner/achievement data across both without hand-authoring every
   task. Surfaced and fixed a real bug in `computeAchievement` (`lib/businessLogic.ts`): it called
   `businessDaysBetween(actualStart, actualFinish)` with the earlier date first, which that
   function's signed "a minus b" convention turns negative — on-time multi-day task completions
   were incorrectly earning "Outstanding Performance" badges. Args are swapped now
   (`actualFinish, actualStart`).
4. Added a per-project week-off calendar (see "Business-day calendar" above) — a day-of-week
   picker on the New Project / Project Settings form, max 2 days, defaulting to Saturday+Sunday.
   Every business-day calculation in `lib/dateUtils.ts`/`lib/businessLogic.ts` now takes the
   project's `weekOff` instead of hardcoding Sat/Sun. Also removed the seed project's
   auto-assigned task owners — every task (seeded or newly created) now starts unassigned.
5. Migrated the entire app from JavaScript/JSX to TypeScript (`strict` mode, no `.js`/`.jsx`
   remaining under `app/`, `components/`, `lib/`, `context/`) — see "TypeScript" above. Surfaced
   one real latent bug in the process: `OrgSelect` (`components/common.tsx`) never accepted or
   forwarded a `disabled` prop, so `TaskCard`'s owner dropdown wasn't actually being locked for
   Pending-Approval tasks; fixed as part of the migration.
6. Team Performance page decluttered: KPI summary row added (`StatCard`, extracted from
   `Dashboard.tsx` into `common.tsx` for reuse), Total/Completed/Pending columns merged into one
   "Tasks" cell, zero-task rows show muted "—"/"No tasks" instead of repeated literal zeros, and
   the name/role cell's line-height bug (MUI DataGrid forces cell `line-height` to match row
   height, which was pushing two-line cell content up into the row above) was fixed.
7. Project detail header compacted: back button is icon-only (no "Portfolio" label), and the
   separate "Product"/status-chip row above the title was merged onto the title's own line to
   save vertical space.
8. Added a global dark-themed scrollbar (`app/globals.css`) — the browser-default light/white
   scrollbar thumb read as a bug against this app's dark ground, especially in the always-visible
   phase nav list and task panel scroll regions.
9. Replaced the hand-vectorized SVG logo approximation with the real uploaded asset
   (`public/ApplicationIcon.png`), used via `next/image` for both the navbar mark and the
   browser favicon (`app/layout.tsx` metadata).
10. Removed the "On Track Projects" dashboard accordion — folded into "In Progress".
11. Simplified `ROLES` from a 5-role simulation (Admin/PM/Team Lead/Team Member/Viewer) down to
   Admin + Developer, both full access, per user request — see "Roles" above.
12. Redesigned `TaskCard` to match a supplied reference screenshot: inline always-editable
   Owner/Day-from-start/Planned-start/Duration fields (commit on blur) instead of a side Drawer.
   `TaskEditorDrawer.jsx` was deleted and replaced by `TaskDetailsDialog.tsx` (a centered modal,
   consistent with every other editor in the app) for name/priority/dependencies only.
   description/owner/scheduling moved to the inline card fields.
13. `TicketsPanel` reorganized into three accordions (Raised/In Progress/Completed) matching the
    dashboard's project-accordion pattern.
14. Converted the whole app from a single-file MUI artifact (built earlier, still published as a
    Claude.ai Artifact) into this proper Next.js project with real API routes + mock DB + React
    state, sidebar removed in favor of top nav only.
15. Fixed a real timezone bug in the original date math: mixing local-time `Date` parsing with
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
