# Converge Projects

Enterprise project management app for Converge's Software, Vision, and Automation teams —
Next.js (App Router) + TypeScript + MUI frontend (`converge_frontend`, this directory) talking
to a real NestJS + TypeORM + PostgreSQL backend (`../converge_backend`, a sibling directory).
There is no mock data layer anymore — see "Backend & data" below.

## Run it

Two servers, both required:

```bash
# Terminal 1 — backend (Postgres must already be running; see converge_backend/.env)
cd ../converge_backend
npm install
npm run start:dev          # http://localhost:4000

# Terminal 2 — frontend
cd converge_frontend
npm install
npm run dev                # http://localhost:3000
```

The backend seeds demo data (two example projects — one early-stage, one well underway with
realistic delays/achievements — plus four tickets, and the org directory) on first boot if its
`projects` table is empty. See `../converge_backend/README.md` for the full API surface and
`npm run seed` (force re-seed).

## Architecture at a glance

```
app/
  layout.tsx                 Root layout: AppProvider + ThemeRegistry + AppShell wrap every page,
                              in that order — ThemeRegistry reads AppContext's `mode` to build the
                              MUI theme, so AppProvider has to be the outer one.
                              metadata.icons points at public/ApplicationIcon.png (real favicon).
  page.tsx                   Dashboard route ("/")
  login/page.tsx             Sign-in screen (split brand/form card). The one route that
                              renders outside AppShell — see components/AuthGate.
  team-performance/page.tsx  Team Performance route
  tickets/page.tsx           Tickets route — KPI row (same StatCard style as the Dashboard,
                              ticket-flavored) above TicketsPanel.
  projects/[id]/page.tsx     Project detail route
  profile/page.tsx           My-profile route — renders components/UserProfile.

  No app/api/** anymore, and no lib/api.ts either — every request goes through RTK
  Query (store/api/*, NEXT_PUBLIC_API_URL) rather than a Next.js route handler.

components/                  All "use client" — this app has no server components.
  AppShell.tsx                Top AppBar only — NO sidebar (removed deliberately). Logo +
                               nav links + theme toggle + notifications + account menu
                               (signed-in name/code/team + Sign out). The old "Viewing as"
                               role switcher and "You are" picker are gone — identity comes
                               from the session now, see context/AuthContext.tsx.
  AuthGate.tsx                  Decides the chrome per route: /login renders bare, everything
                               else renders inside AppShell and only with a session. Redirects
                               happen in an effect (never during render) and it shows a spinner
                               rather than flashing the wrong screen mid-redirect.
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
                               TaskDetailsDialog for the fields that don't live inline. Also
                               hosts the "Critical points" checklist (type + Enter to add,
                               checkbox to tick, hover-reveal × to remove) — see "Task
                               checklist" below.
  TaskDetailsDialog.tsx           Centered MUI Dialog (NOT a side Drawer — that was explicitly
                               replaced) for name / priority / dependencies only.
  PhaseManager.tsx                PhaseNavList, EditPhaseDialog, DeletePhaseDialog, AddTaskDialog,
                               PhaseTaskPanel (native HTML5 drag & drop for task reordering).
  TimelineView.tsx                Gantt: weekend shading, today marker, achievement icons,
                               pending-approval dashed border, Week/Month/Quarter zoom.
  UserProfile.tsx                 The /profile page body: identity banner, editable name, and
                               the change-password form. See "User profile" below.
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

lib/                          Framework-agnostic — no React imports, safe to use from
                              components (there are no API routes anymore, see above).
  types.ts                     Shared domain types (Task, Phase, ProjectMeta, Employee, Ticket,
                               Actor, permission/role unions, ThemeMode, etc.) — every other lib/*
                               and component file imports from here rather than re-declaring
                               shapes. Also the DashboardBaseline shape returned by GET
                               /dashboard-summary (see converge_backend).
  data.ts                      TEMPLATE (12 phases / 62 tasks), ROLES + PERMISSIONS, roleCan(),
                               genId(), initials()/avatarColor() (pure name→style helpers). The
                               org directory (TEAMS/EMPLOYEES) used to live here as static
                               constants — it's real backend data now, see context/OrgContext.tsx.
  dateUtils.ts                 UTC-consistent date arithmetic + working-day (Mon–Fri) calendar —
                               ported into converge_backend/src/common/date-utils.ts too, kept
                               byte-identical so planned-date math matches on both sides.
  businessLogic.ts             Task/phase generation, delay detection, achievement detection, the
                               approval workflow (requestScheduleChange / approveScheduleChange /
                               rejectScheduleChange). Team-performance aggregation and dashboard-
                               index computation now live server-side (converge_backend); this
                               file keeps the *client-side live recompute* versions
                               (withLiveStats, liveProjectStats) that re-derive delay/bucket state
                               against "now" from whatever the backend already returned, plus
                               guessEmployeeIdFromFreeText (legacy free-text owner matching, takes
                               an `employees` array param — see ProjectForm.tsx).
  theme.ts                     createAppTheme(mode) builds the light/dark MUI theme; useStatusHex()
                               is how components read the mode-appropriate status color map — see
                               "Light/dark theme" below. DASHBOARD_COLORS is a separate, vivid,
                               mode-independent palette for KPI icons / donut segments / project-
                               card accents — see that export's own doc comment for why it's not
                               just reusing STATUS_HEX.
  authToken.ts                 get/set/clearToken for the bearer token, plus the
                               UNAUTHORIZED_EVENT name. A plain module, not React state, because
                               RTK Query's prepareHeaders runs outside the component tree.

store/                        RTK Query data layer (Scout's convention — see "Authentication").
  store.ts                     configureStore wiring baseApi's reducer + middleware.
  api/baseApi.ts               The one createApi: bearer-token prepareHeaders, the 401 →
                               sign-out wrapper, and the shared tagTypes.
  api/*.ts                     One injectEndpoints slice per resource (projects, tickets,
                               employees, teamPerformance, dashboard, auth).

context/
  AuthContext.tsx               Sign-in state: `user` (the AuthedUser returned by
                               POST /auth/login), `ready` (false until the stored session has
                               been read — guards MUST wait on this), signIn(), signOut(),
                               applyProfile(). Profile persists to localStorage; the token
                               lives in lib/authToken.ts. Also listens for UNAUTHORIZED_EVENT
                               and signs out on it. See "Authentication" below.
  AppContext.tsx                role / selfId / actor / mode (+ toggleMode). `role` and
                               `selfId` are DERIVED from AuthContext's user — there are no
                               setters any more (changing who you are = sign out and back in).
                               Only `mode` (light/dark) persists to localStorage. AppProvider
                               must therefore be nested *inside* AuthProvider.
  OrgContext.tsx                 Fetches the org directory (GET /employees) once and provides
                               teams/employees/employeeById/employeeLabel to the whole app —
                               every component that used to `import { TEAMS, EMPLOYEES, ... }
                               from "@/lib/data"` now calls `useOrgContext()` instead
                               (AppShell.tsx, ProjectDetail.tsx, ProjectForm.tsx, common.tsx's
                               EmployeeAvatar/OrgSelect). Real Postgres data, not a static list —
                               if you add a component that needs an employee name/avatar/dropdown,
                               pull it from here, don't re-add a static import.

public/ApplicationIcon.png    The real Converge logo (uploaded by the user) — used for both
                              the navbar mark and the browser favicon.
```

## Authentication — JWT bearer tokens

Sign-in is real (bcrypt-verified server-side) and **every backend data endpoint now requires a
valid token**. This is an access-control boundary, not just a UI gate.

- **Flow**: `app/login/page.tsx` → `AuthContext.signIn()` → `POST /auth/login`
  (`converge_backend/src/auth/`) → bcrypt-compares against `employees.password_hash` → returns
  the employee's non-secret profile **plus a signed `accessToken`**. No hash ever leaves the
  backend.
- **The guard is global, opt-out**: `JwtAuthGuard` is registered as an `APP_GUARD` in
  `auth.module.ts`, so a new controller is protected the moment it exists. `POST /auth/login` is
  the only route that opts out, via `@Public()`. Adding an endpoint requires no auth wiring —
  *forgetting* to protect one is what's now impossible.
- **Identity comes from the token, never the body**: `@CurrentUser()` reads the payload the
  guard verified and attached to the request. No endpoint accepts a user id from the caller, so
  there is no "act as someone else" parameter to tamper with.
- **Token storage**: `lib/authToken.ts` (localStorage, key `converge_projects_token_v1`), kept
  *separate* from the profile record so the two can't be confused. RTK Query's `prepareHeaders`
  in `store/api/baseApi.ts` attaches `Authorization: Bearer <token>` to every request.
- **401 means one thing: the token is no good.** `baseApi`'s `baseQueryWithAuth` treats any 401
  (except from `login` itself) as a dead session — it clears the token and fires a
  `converge:unauthorized` window event that `AuthContext` listens for and signs out on. This is
  why `changePassword` returns **400**, not 401, for a wrong current password: the caller *was*
  authenticated, so a 401 there would eject them from the app over a typo. Keep that invariant
  if you add auth-adjacent endpoints.
- **The stored profile is a render cache, not a credential.** Editing the localStorage session
  record changes what the navbar draws and nothing the API will accept — the backend re-reads
  the employee from the database on every request.
- **Credentials**: employees sign in with an `employeeCode` — initials + a global sequence
  number (`VP001`, `SD003`). The sequence is load-bearing: plain initials collide (Prachi
  Jamgaonkar and Pavitra Joshi are both "PJ" → `PJ004` / `PJ009`). Codes are matched
  case-insensitively. Derivation lives in `converge_backend/src/utils/credentials.ts`.
- **Seeded password**: every seeded employee shares `DEFAULT_PASSWORD` ("Converge@123") — a
  development convenience, not a production secret. `SeedService.ensureCredentials()` runs on
  every boot (not just first seed) and fills only *missing* code/hash/appRole columns, so it
  both backfills employees created before sign-in existed and never clobbers an existing
  credential.
- **No user enumeration**: a bad code and a bad password return the same generic 401, and the
  service bcrypt-compares against a dummy hash when no employee matches so response timing
  doesn't leak which codes are real.
- **`JWT_SECRET` must be set in any deployed environment.** `Config.DEFAULT_JWT_SECRET` is an
  in-repo development fallback — anyone with the source could mint valid tokens against it.
  `JWT_EXPIRES_IN` defaults to 12h.

## User profile

`/profile` (`components/UserProfile.tsx`, linked from the navbar account menu) is where a user
manages their own account. Scoped entirely to the caller — no request carries a user id.

- **Editable**: display name, and password (current + new + confirm).
- **Read-only**: employee ID, team, role — shown under "Managed by your administrator".
  `UpdateProfileDto` contains *only* `name`, and `ValidationPipe({ whitelist: true })` strips
  everything else, so a User cannot promote themselves by adding `appRole` to the request body.
  Verified: extra fields are silently dropped and the DB row is unchanged.
- **Changing the password signs you out** (~1.8s after the success toast). The old token stays
  valid until it expires otherwise, which would let a stolen session outlive the very reset
  meant to shut it out.
- **`GET /auth/me` re-reads from the database** rather than rendering the login-time snapshot,
  so a role/team change made by an admin shows up on this page without a re-login. Saving the
  name calls `AuthContext.applyProfile()` to keep the navbar in step, and invalidates the
  `Employees` tag so the org directory picks it up too.
- **The seeder deliberately does not reconcile `name`** (`ensureOrgDirectory` in
  `converge_backend/src/seed/seed.service.ts`) — it used to, which would silently revert a
  user's own profile edit on the next backend restart. Role/appRole/team are still reconciled.

## Roles — Admin writes, User reads

`ROLES = ["Admin", "User"]` in `lib/data.ts`. **Admin has full access; User is read-only.**
`PERMISSIONS` grants every write action (`createProject`, `deleteProject`,
`editProjectSettings`, `managePhases`, `editTask`, `editScheduleDirectly`, `approveChanges`,
`raiseTicket`, `updateTicketStatus`) to `ADMIN_ONLY`, and the three `see*` actions to
`ALL_ROLES` — a User sees every project, board, ticket and breakdown an Admin does, but cannot
change any of it or move a Kanban card.

**`roleCan()` gates what the UI offers, and the backend gates what it accepts** — every data
endpoint requires a valid token (see "Authentication"). Note the two are not yet the same check:
the guard verifies *who you are*, but does not yet enforce Admin-only *writes* server-side, so a
read-only user with devtools and their own token could still call a mutating endpoint directly.
Closing that means a role check in the guard (or a `@Roles('Admin')` decorator) on the mutating
routes — the token already carries `appRole`, so the data is there.

Both roles are the same in the directory too: `OrgRole` is `"Admin" | "User"` (it replaced
`"Team Lead" | "Developer"`), and `appRoleFor()` in the backend maps them 1:1. A user's role
comes back with the login response and `AppContext.role` reads it, so **changing someone's role
requires them to sign out and back in** — the session is a localStorage snapshot taken at login.

Every write surface already routes through `roleCan()`, so role changes are a data edit in the
`PERMISSIONS` table rather than a component rewrite. If you add a new mutating control, gate it
the same way — don't rely on the surrounding panel being hidden.

Task owners are **never pre-assigned** — every task (seed data included) is created with
`assignedTo: null`. This was a deliberate change: the seed project used to auto-assign its first
five tasks to specific employees for demo purposes, which read as if the app were picking owners
for you. Whoever picks up a task assigns it to themselves (or someone else) via the task card's
Owner dropdown.

The approval workflow (a task's scheduling edit by someone without `editScheduleDirectly`
creates a Pending-Approval change request instead of applying immediately) is still fully
implemented in `businessLogic.ts` and wired into `TaskCard`/`ProjectDetail`, but it remains
**unreachable**: User lacks `editScheduleDirectly` but is blocked by `editTask` first, so a
read-only user never reaches the request path — read-only means read-only, not "edit by
request". Making it live needs a third role that can edit tasks but not schedule them
directly.

## Backend & data — real Postgres, not mock data

Everything is persisted in a real database now. `../converge_backend` is a separate NestJS +
TypeORM project (its own `package.json`, run separately — see "Run it" above) backed by
PostgreSQL; this frontend never touches the database directly, only `lib/api.ts`'s `fetch()`
calls to it.

- **Entities**: `Team`, `Employee`, `Project`, `Phase`, `Task`, `Ticket`, `DashboardBaseline` —
  see `converge_backend/src/entities/`. Task ids are globally unique across every project (not
  per-project like the old mock store), since they're now rows in one shared Postgres table.
  `Employee` also carries the sign-in columns (`employee_code`, `password_hash`, `app_role`) —
  all nullable purely so `synchronize: true` could add them to existing rows; the seeder
  backfills them. `password_hash` must never appear in an API response (`employees.service.ts`
  maps columns explicitly rather than returning entities, which is what keeps it out).
- **Business-day math is duplicated on purpose, not by accident**: `converge_backend/src/common/`
  has its own copy of `date-utils.ts`/`business-logic.ts`, ported line-for-line from this
  frontend's `lib/dateUtils.ts`/`lib/businessLogic.ts`, so planned dates and delay/achievement
  detection compute identically whether the backend does it (at write/seed time, or for
  `GET /projects`'s live-computed index rows) or the frontend does it (client-side
  `withLiveStats`, recomputing "is this still overdue *right now*" without a refetch). If you
  change the scheduling rules, change both copies.
- **Full-sync PATCH, not partial diffs**: `ProjectDetail.tsx` always sends the *complete*
  `phases`/`tasks` arrays it holds in React state to `PATCH /projects/:id` (add/delete/reorder/
  edit all go through the same `updateProjectApi(id, { meta, phases, tasks })` call) — the
  backend replaces each set wholesale (upsert everything present, delete anything no longer
  present) rather than trying to diff. Don't build a new mutation path that sends partial
  task/phase data expecting a merge; it'll delete whatever you didn't include.
- **The org directory (teams/employees) is real DB data**, fetched once via `OrgContext`
  (`GET /employees`) — see the `context/` entry above. Task assignees, project owners, and
  ticket assignees are all real employee ids validated against this data, not free text.
- **Dashboard "vs last month" trend captions are a real diff**, not fabricated: the backend
  captures a `DashboardBaseline` snapshot (projects + tickets) the first time anything asks for
  it (`GET /dashboard-summary`), persists it, and every KPI trend on the Dashboard and Tickets
  pages diffs live counts against that one frozen snapshot (`computeStatTrend` in `common.tsx`).
- Restarting the backend does **not** wipe data (unlike the old in-memory mock) — Postgres
  persists across restarts. `SeedService` only seeds demo data once, when the `projects` table
  is empty; see `converge_backend/README.md` for `npm run seed` (force re-seed after truncating).

## Task checklist ("critical points")

Each task carries `checklist: ChecklistItem[]` (`{ id, text, done, createdAt?, updatedAt? }`) —
free-form critical points captured per task, edited inline in the expanded `TaskCard`. Type +
Enter adds, the pencil switches a row to inline edit (Enter saves, Escape cancels), and each
row shows a "Updated/Completed <date, time>" stamp. `updatedAt` is bumped on text edits and on
ticking/unticking; the timestamps are optional in the type only because items stored before
they existed don't have them.

**Completed points cannot be deleted.** A ticked point is the record that the work happened, so
its delete button is disabled (untick first if it genuinely needs removing). `removePoint` also
re-checks `item.done` rather than trusting the disabled button, and blank text in inline edit is
rejected instead of being treated as a delete — both so the rule can't be routed around.

- **Persisted like everything else**: `tasks.checklist` is a `jsonb` column defaulting to `[]`,
  and edits ride the same full-sync `PATCH /projects/:id` path as every other task mutation.
- **Deliberately NOT written to task history.** `ProjectDetail.handleChecklistChange` bypasses
  `commitField` on purpose: routing it through history would append an entry on every single
  checkbox tick and bury the status/scheduling changes the history dialog exists to surface.
  If checklist auditing is ever wanted, add it as its own log, don't fold it into `history`.
- **Legacy tasks have no array.** Rows predating the feature come back with the key missing or
  null, so `ensureProjectShape` normalizes it to `[]` *after* the object spread — before any
  `.map`/`.length` in the UI can touch it. Both `buildTasks` implementations (frontend
  `lib/businessLogic.ts` and backend `common/business-logic.ts`) seed it as `[]` too.
- Editing is gated on `canEdit && !locked`, matching the card's other fields — a Pending
  Approval task's checklist is read-only, same as its scheduling inputs.

## Schedule changes require a reason

Every edit to a task's **day-offset, planned start, or duration** opens
`ScheduleReasonDialog` before anything is committed. The reason is required, and it lands in the
task's `history` entry alongside the from/to — so the log answers *why* a date moved, not just
that it did.

- `TaskCard` collects the reason, then calls `onCommitOffset/StartDate/Duration(value, reason)`.
  Those handlers no longer commit on blur directly; blur only *opens* the dialog.
- Cancelling restores the field's displayed value. Without that the input would keep showing an
  edit that never saved.
- `commitSchedule` in `ProjectDetail` threads the reason into **both** branches — the direct-edit
  history entry and `requestScheduleChange`'s pending-approval record. This replaced a
  `window.prompt` that only fired on the approval branch and wrote `reason: ""` for direct edits.
- Duration is included even though the original request said "date or day". Leaving it out would
  let someone move `plannedFinish` with no recorded justification, which defeats the audit.

## A task can't be completed with open critical points

Setting a task's status to **Completed** is blocked while any of its checklist points are
unticked; a Snackbar names the count ("2 critical points still open — complete them first").
Implemented in `TaskCard.requestStatusChange`, which wraps the status `Select`'s `onChange` — so
it applies whether the card is expanded or collapsed. Every other status transition is
unaffected, and unticking a point afterwards does not retroactively reopen the task.

## Planned-start is clamped to the phase window

A task's "Planned start date" field is bounded (native `min`/`max`, plus an error state for
dates typed straight in, plus a revert-on-blur guard since browsers accept out-of-range typed
values) to the span its phase already occupies.

The subtlety worth knowing before touching this: **`phaseStart`/`phaseEnd` are derived from the
phase's tasks** (min `plannedStart` / max `plannedFinish`, see `phaseSummaries`), so the bound
and the thing being bounded are the same data.

- Bounds come from the *whole* phase, the edited task included. Deriving them from siblings only
  looks tempting but puts the phase's earliest task before its own lower bound — it then renders
  a red "Outside phase" error on a date nobody touched. (This was tried; it's wrong.)
- Consequence, by design per the request: a task sitting on the phase edge can move inward but
  not outward, so **the phase envelope can't be stretched from this field**. Widening a phase
  means editing day-offset/duration, or relaxing this rule.
- Single-task phases get `phaseBounds: null` (no constraint) — otherwise min and max collapse
  onto that task's own dates and the field freezes permanently.
- Only the *start* field is constrained. Duration and day-offset can still push `plannedFinish`
  past the phase end.

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

- **Authentication is enforced; per-role authorization is not.** Every endpoint requires a valid
  token, but the guard checks identity only — it doesn't yet reject a `User` calling a mutating
  route. See the note under "Roles" above.
- **The token lives in localStorage**, so a successful XSS can steal it. An httpOnly cookie is
  stronger, but needs CSRF protection and same-site handling that this split-origin deployment
  (Vercel frontend, Railway backend) doesn't have yet.
- **No token refresh and no server-side revocation** — a token is valid until it expires
  (`JWT_EXPIRES_IN`, 12h). Signing out clears it client-side; it isn't blacklisted.
- Everyone starts on one seeded dev password, and there's no signup or forgot-password reset
  flow — accounts exist only because the seeder created them. Users *can* now change their own
  password (see "User profile").
- No CSRF protection on the backend — mitigated in practice by the bearer token being sent from
  JS rather than ambiently attached like a cookie, plus CORS locked to `CORS_ORIGIN`.
- `converge_backend` uses TypeORM's `synchronize: true` instead of migrations — appropriate for
  this stage, not once the database holds data worth protecting from schema drift.
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

1. Closed the standing security gap: **JWT bearer auth end to end, plus a self-service profile
   page** (see "Authentication" and "User profile"). The backend gained a global `APP_GUARD`
   `JwtAuthGuard` with a `@Public()` opt-out (login only) and a `@CurrentUser()` param decorator,
   so identity can only come from a verified token and never from a request body; the frontend
   gained `lib/authToken.ts`, a token-attaching `prepareHeaders`, and a 401 → sign-out wrapper
   around the base query. Two decisions worth keeping: `UpdateProfileDto` carries *only* `name`
   (so `ValidationPipe`'s `whitelist` is what blocks a User writing themselves an `appRole`),
   and `changePassword` returns **400** rather than 401 for a wrong current password — caught in
   testing, where a mistyped password tripped the global 401 handler and threw the user out of
   the app instead of showing an inline error. `SeedService.ensureOrgDirectory` also stopped
   reconciling `name`, which would have reverted every profile edit on the next boot.
2. Task card, second pass: scheduling row regrouped to a supplied reference — planned start and
   finish sit under one "Planned start / finish" label with the phase window called out once
   beneath both, a vertical divider separates Duration, and the finish shows as a disabled field
   rather than loose text. Added the mandatory schedule-change reason dialog and the
   completed-blocked-by-open-checklist rule (both sections above).
3. Expanded-task-card pass: sub-sections (scheduling, critical points) are now shaded
   `Paper variant="outlined"` panels on `background.default` so they read as distinct sections
   instead of one flat surface; checklist points gained inline edit + created/updated
   timestamps and became undeletable once ticked; and the planned-start field is now clamped to
   the phase window (see "Planned-start is clamped to the phase window" above for the
   derived-bounds trap).
4. Added a per-task "critical points" checklist (see "Task checklist" above) — new
   `tasks.checklist` jsonb column, threaded through `PlainTask`/`TaskPatch`/`toPlainTask`/
   `syncTasks` on the backend and `Task`/`buildTasks`/`ensureProjectShape` on the frontend, with
   the editor living in the expanded `TaskCard`. Typed as required on `Task` rather than
   optional, which is what made `tsc` immediately point at the frontend `buildTasks` that would
   otherwise have shipped tasks with an undefined checklist.
5. Added sign-in (see "Authentication" above): a `/login` split-card screen modelled on a
   supplied reference, a `converge_backend` `auth` module doing real bcrypt verification, and
   `employees.employee_code` / `password_hash` / `app_role` columns provisioned idempotently by
   the seeder on every boot. Identity stopped being a client-side toy: the navbar's "Viewing
   as" role switcher and "You are" picker were deleted, `AppContext` now *derives* `role` and
   `selfId` from the session instead of owning them (its setters are gone, and its localStorage
   key changed from `converge_projects_role_pref_v1` to `converge_projects_ui_pref_v1` since it
   only stores theme now), and `AppShell`'s avatar became an account menu with Sign out.
   `AppContext` no longer depends on `OrgContext` (it uses the session's own `name`), so the
   old "OrgProvider must wrap AppProvider" constraint is now just "AuthProvider must wrap
   AppProvider". Deliberately NOT done: guarding the backend's data endpoints — that's the
   real remaining gap, called out under Known limitations rather than papered over.
6. Replaced the static `TEAMS`/`EMPLOYEES` org directory in `lib/data.ts` with real backend data:
   a new `context/OrgContext.tsx` fetches `GET /employees` once and every consumer
   (`AppShell.tsx`, `ProjectDetail.tsx`, `ProjectForm.tsx`, `common.tsx`'s `EmployeeAvatar` /
   `OrgSelect`) now calls `useOrgContext()` instead of importing a static constant.
   `AppContext.tsx`'s `actor.name` needed the same data, which meant `OrgProvider` had to become
   an *ancestor* of `AppProvider` in `app/layout.tsx` (not the reverse) so `AppContext` could
   consume it. Also reshaped `converge_backend`'s `GET /employees` response to nest `members`
   under each team and carry a flat `team` display-name string on each employee — a drop-in
   match for the frontend's existing `Team`/`Employee` types, so no component needed a shape
   change beyond the import source. `ProjectForm.tsx`'s legacy free-text-owner normalization
   (`guessEmployeeIdFromFreeText`) had to move from a synchronous mount-time call to a
   `useEffect` gated on the async employee list actually arriving, since it can no longer assume
   the org directory is available on the very first render. Removed `lib/businessLogic.ts`'s
   `aggregateTeamPerformance`, which had become dead code once team-performance aggregation
   moved server-side (see next entry) but still imported the now-deleted `EMPLOYEES` constant.
7. Replaced the entire mock in-memory data layer with a real backend: `../converge_backend`, a
   new sibling NestJS + TypeORM + PostgreSQL project (see "Backend & data" above for the full
   picture). `app/api/**` and `lib/mockDb.ts` are gone; `lib/api.ts` now calls the backend
   directly. Business-day date math and delay/achievement detection were ported line-for-line
   into `converge_backend/src/common/` so both sides compute identical results. Team-performance
   aggregation and the portfolio index (`GET /projects`) are now computed server-side rather than
   client-side from a fully-loaded project list. Added a `DashboardBaseline` table so the
   Dashboard's (and now Tickets page's) "vs last month" trend captions diff against a real
   persisted snapshot instead of resetting every server restart like the old in-memory version
   did. `ProjectDetail.tsx`'s existing "PATCH the whole phases/tasks array" mutation pattern
   carried over unchanged — the backend just treats it as a full sync (upsert + delete-missing)
   instead of a partial merge, which happened to already be exactly what the frontend was
   sending.
8. Added a light/dark theme toggle (see "Light/dark theme" above) — navbar sun/moon button,
   `AppContext.mode` persisted to localStorage, `createAppTheme(mode)` in `lib/theme.ts`. Required
   splitting status colors into `STATUS_HEX_DARK`/`STATUS_HEX_LIGHT` (the dark-tuned bright hues
   had bad contrast as text on white) and reworking every component that renders a status color to
   pull from `useStatusHex()` instead of a static import. Also surfaced that `CssBaseline` doesn't
   reliably repaint `<body>`'s background on a live client-side theme swap — worked around with an
   explicit `bgcolor` on `AppShell`'s root `Box` plus a `data-theme`-keyed CSS variable in
   `app/globals.css`, not something to re-break by reverting to relying on `CssBaseline` alone.
9. Reworked the 12-phase task template's day-offsets to close a real scheduling gap: Phase 01's
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
10. Enriched the seed data (`lib/mockDb.ts`) for demo/screenshot purposes: a second project
   ("Vertex Robotics", Solution type, well underway with real delays and achievements — contrast
   against the original early-stage "TE Connectivity" project) and a `simulateProgress` helper
   that stamps realistic status/owner/achievement data across both without hand-authoring every
   task. Surfaced and fixed a real bug in `computeAchievement` (`lib/businessLogic.ts`): it called
   `businessDaysBetween(actualStart, actualFinish)` with the earlier date first, which that
   function's signed "a minus b" convention turns negative — on-time multi-day task completions
   were incorrectly earning "Outstanding Performance" badges. Args are swapped now
   (`actualFinish, actualStart`).
11. Added a per-project week-off calendar (see "Business-day calendar" above) — a day-of-week
   picker on the New Project / Project Settings form, max 2 days, defaulting to Saturday+Sunday.
   Every business-day calculation in `lib/dateUtils.ts`/`lib/businessLogic.ts` now takes the
   project's `weekOff` instead of hardcoding Sat/Sun. Also removed the seed project's
   auto-assigned task owners — every task (seeded or newly created) now starts unassigned.
12. Migrated the entire app from JavaScript/JSX to TypeScript (`strict` mode, no `.js`/`.jsx`
   remaining under `app/`, `components/`, `lib/`, `context/`) — see "TypeScript" above. Surfaced
   one real latent bug in the process: `OrgSelect` (`components/common.tsx`) never accepted or
   forwarded a `disabled` prop, so `TaskCard`'s owner dropdown wasn't actually being locked for
   Pending-Approval tasks; fixed as part of the migration.
13. Team Performance page decluttered: KPI summary row added (`StatCard`, extracted from
   `Dashboard.tsx` into `common.tsx` for reuse), Total/Completed/Pending columns merged into one
   "Tasks" cell, zero-task rows show muted "—"/"No tasks" instead of repeated literal zeros, and
   the name/role cell's line-height bug (MUI DataGrid forces cell `line-height` to match row
   height, which was pushing two-line cell content up into the row above) was fixed.
14. Project detail header compacted: back button is icon-only (no "Portfolio" label), and the
   separate "Product"/status-chip row above the title was merged onto the title's own line to
   save vertical space.
15. Added a global dark-themed scrollbar (`app/globals.css`) — the browser-default light/white
   scrollbar thumb read as a bug against this app's dark ground, especially in the always-visible
   phase nav list and task panel scroll regions.
16. Replaced the hand-vectorized SVG logo approximation with the real uploaded asset
   (`public/ApplicationIcon.png`), used via `next/image` for both the navbar mark and the
   browser favicon (`app/layout.tsx` metadata).
17. Removed the "On Track Projects" dashboard accordion — folded into "In Progress".
18. Simplified `ROLES` from a 5-role simulation (Admin/PM/Team Lead/Team Member/Viewer) down to
   Admin + Developer, both full access, per user request — see "Roles" above.
19. Redesigned `TaskCard` to match a supplied reference screenshot: inline always-editable
   Owner/Day-from-start/Planned-start/Duration fields (commit on blur) instead of a side Drawer.
   `TaskEditorDrawer.jsx` was deleted and replaced by `TaskDetailsDialog.tsx` (a centered modal,
   consistent with every other editor in the app) for name/priority/dependencies only.
   description/owner/scheduling moved to the inline card fields.
20. `TicketsPanel` reorganized into three accordions (Raised/In Progress/Completed) matching the
    dashboard's project-accordion pattern.
21. Converted the whole app from a single-file MUI artifact (built earlier, still published as a
    Claude.ai Artifact) into this proper Next.js project with real API routes + mock DB + React
    state, sidebar removed in favor of top nav only.
22. Fixed a real timezone bug in the original date math: mixing local-time `Date` parsing with
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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
