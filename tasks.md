# Salary Calendar Web App - Implementation Plan

## Task 1: Bootstrap React + Vite project with base configuration
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Initialize `package.json` and Vite React project structure in the repo root
  - Install core dependencies: react, react-dom, vite, date-fns (for date utilities)
  - Configure Vite with React plugin and sensible defaults (port, base paths)
  - Create base folder structure: `src/components/`, `src/pages/`, `src/hooks/`, `src/utils/`, `src/store/`, `src/types/`, `src/styles/`
  - Add global stylesheet with CSS reset and base colors/typography
  - Set up a root entry (`main.jsx` / `App.jsx`) that renders a placeholder layout
- **Acceptance Criteria Addressed**: AC-10, AC-13
- **Test Requirements**:
  - `rule` TR-1.1: Running `npm install` succeeds with no errors.
  - `rule` TR-1.2: Running `npm run dev` starts Vite dev server on default port, and visiting the page renders "Salary Calendar" header with no console errors.
  - `rule` TR-1.3: Running `npm run build` completes successfully producing a `dist/` folder with bundled assets.
  - `rubric` TR-1.4: Folder structure quality; scale 1-5; anchors 1=no structure 3=basic 5=clean separation matching spec; threshold >= 4; evidence = `tree` listing of src folder.
- **Notes**: Prefer TypeScript `.tsx` for static typing benefits. If TS setup is problematic, plain JSX is acceptable but `types/` should still contain JSDoc type files.

## Task 2: Implement LocalStorage data store layer with typed schemas
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Define data shape types/interfaces: Employee, AttendanceRecord, LeaveRecord, AppSettings, Session
  - Create storage utility (`src/store/storage.js`) with safe JSON read/write, error handling, default seeding
  - Storage keys: `salaryCalendar:employees`, `salaryCalendar:attendance`, `salaryCalendar:leaves`, `salaryCalendar:settings`, `salaryCalendar:session`
  - Implement seed logic for first-run admin creation (AC-1): if `employees` is empty, create default admin profile with `role: 'admin'`
  - Provide store hooks/functions: `useEmployees()`, `useAttendance(empId)`, `useLeaves(empId)`, `useSettings()`, `useSession()` returning values and setters (with automatic persistence)
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-10, NFR-3
- **Test Requirements**:
  - `rule` TR-2.1: When localStorage is empty and store is initialized, `salaryCalendar:employees` key contains exactly one admin record (visible via DevTools Application tab).
  - `rule` TR-2.2: Mutating via store setter (e.g., add employee) and reloading page preserves the new record (AC-10).
  - `rule` TR-2.3: Corrupt JSON in storage (manually broken) triggers reset to defaults without crashing the app (NFR-3).
  - `rule` TR-2.4: Type-check or runtime-prop-validate every read so that malformed fields fall back to schema defaults.
- **Notes**: A small context-provider or zustand-like custom hook based pattern is acceptable; no heavy state lib required.

## Task 3: Authentication / role session & simple login screen
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Login page (first screen) with two options when multiple employees exist: pick a name and choose role (Admin is shown only if that employee is actually an admin). Single-admin mode logs directly in.
  - On first run, present a simple admin setup form (admin name + designation + default salary settings) instead of raw seed — fulfills AC-1 interactive onboarding.
  - Session state stored in LocalStorage key `salaryCalendar:session` with `{ employeeId, role, loggedInAt }`
  - Top bar shows current user name + role switcher / logout
  - Private-route wrapper: accessing any page without a session redirects to login
- **Acceptance Criteria Addressed**: AC-1, AC-9
- **Test Requirements**:
  - `rule` TR-3.1: First-run flow: empty storage → admin setup form → submit → dashboard loads; admin record has role=admin.
  - `rule` TR-3.2: Attempting direct URL navigation to `/dashboard` while no session → redirects to `/login`.
  - `rule` TR-3.3: When switched to employee role, store hook filter functions return only records where `employeeId === session.employeeId` (used by AC-9 coverage; final AC-9 evidence in Task 9).
- **Notes**: Keep it simple; no password protection per v1 constraints.

## Task 4: Employee profile management UI (Admin CRUD + self view/edit)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - **Admin only**: Employee list page with add/edit/delete actions. Table shows name, ID, designation, role, salary mode, salary summary.
  - Add/Edit form with all FR-2 fields: name, email, phone, employeeId, designation, department, joiningDate, role, salaryMode ('fixed'|'hourly'), fixedSalary, hourlyRate, workStart (HH:MM), workEnd (HH:MM), salaryDay (1-31).
  - **Any user**: Profile page showing own profile data; employee can edit own contact info but not salary/role fields; admin can edit everything.
  - Avatar generated from initials as colored circle (no image upload needed in v1).
- **Acceptance Criteria Addressed**: AC-2, AC-9
- **Test Requirements**:
  - `rule` TR-4.1: Admin creates employee E with salaryMode=fixed fixedSalary=22000 salaryDay=25 → E appears in list; after reload still exists (TR-4.1 satisfies persistence side of AC-2).
  - `rule` TR-4.2: Admin deletes employee X; attendance/leave records belonging to X are also removed (or soft filtered); X no longer appears in any dropdown.
  - `rule` TR-4.3: Employee role views /profile — salary and role field inputs are disabled or hidden.
  - `rubric` TR-4.4: Form UX quality; scale 1-5; 1=broken 3=usable 5=clear validation, date pickers, sensible defaults; threshold >=4; evidence screenshot.

## Task 5: Calendar core component & navigation
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (can be done in parallel after Task 1, but depends on types from Task 2 for props)
- **Description**:
  - Build reusable `<Calendar month={Date} onDaySelect={fn} renderDayBadge={fn} />` component in `src/components/Calendar/`
  - Use date-fns for month grid generation (handle leap years, first day of week configurable — default Monday/Sunday per settings)
  - Navigation: Previous/Next month buttons, "Today" button, month-year header with dropdown quick-selectors
  - Day cell hover/details popup panel: shows date, day summary, quick actions (clock in/out, apply leave)
  - Today highlight with distinct background style
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `rule` TR-5.1: Navigate to February 2028; component renders 29 days. Navigate to February 2023; renders 28 days.
  - `rule` TR-5.2: On load, "Today" cell class/background matches `new Date()` day-of-month for current month.
  - `rule` TR-5.3: Click next month from January → February; click previous from January → December of previous year.
  - `rubric` TR-5.4: Calendar visual clarity; scale 1-5; anchors 1=confusing 3=usable 5=distinct borders, readable, good spacing; threshold >=4; evidence screenshot.

## Task 6: Attendance (login/logout) feature
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 3, Task 5
- **Description**:
  - Dashboard quick-action Clock-In / Clock-out buttons
  - Day cell detail popup has clock-in/out controls; shows "Clocked in since HH:MM" badge
  - Attendance record shape: `{ id, employeeId, date: 'YYYY-MM-DD', clockIn: ISO timestamp, clockOut: ISO timestamp|null, totalHours: number }`
  - Clock-in creates record (or updates if same day). Clock-out sets clockOut and calculates totalHours.
  - Guard against: clocking in twice without clock out (offer "Continue session" or "Reset"), clocking out without active session (disable button).
  - Calendar badge renderer shows green check/square for days with completed attendance.
  - Attendance list view (per employee) showing all dates with clock times and hours.
- **Acceptance Criteria Addressed**: AC-4, AC-3 (badges on calendar)
- **Test Requirements**:
  - `rule` TR-6.1: Manual simulate clockIn at 9:00am, clockOut at 6:00pm → totalHours = 9.0 (plus minutes accounted).
  - `rule` TR-6.2: Attempting Clock Out when no active session → button disabled and no record written.
  - `rule` TR-6.3: Day cell on calendar shows attendance badge for any day with a completed record (visible class or DOM marker).
  - `rule` TR-6.4: Data survives reload (AC-10 composite).

## Task 7: Leave management (full-day & half-day)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 3, Task 5
- **Description**:
  - "Apply Leave" form: date picker, leave type (Casual/Sick/Personal/Others), radio: Full-day | Half-day, optional note
  - Leave record: `{ id, employeeId, date, type, duration: 'full'|'half', note, createdAt }`
  - Admin can add/remove leaves for any employee; employees only own leaves
  - Calendar render: Full-day leaves = red diagonal-fill badge; Half-day = half-filled/colored badge
  - Leave summary card on dashboard: "Leaves taken this month: X full, Y half = Z day-equivalents"
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-7.1: Submit full-day leave on 2026-10-15 half-day on 2026-10-20 → both records present in leaves table with correct duration; two distinct visual markers on calendar cells.
  - `rule` TR-7.2: Dashboard summary counts match: `fullCount + 0.5*halfCount == dayEquivalents` (e.g., 1 full + 1 half = 1.5).
  - `rule` TR-7.3: Employee role cannot submit leave on behalf of another employee (no such UI + server-side-ish validation in storage hook).

## Task 8: Salary calculator (fixed & hourly modes) + salary day marker
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 4, Task 6, Task 7
- **Description**:
  - Salary panel/page: Month selector, employee selector (admin: any; employee: self)
  - Compute logic:
    - Fixed mode: perDay = fixedSalary / configuredWorkingDaysInMonth (default 22). Leaves: full deduction = perDay * N_full; half = perDay * 0.5 * N_half. Net = fixed - deductions.
    - Hourly mode: sum attendance totalHours in month. Regular hours cap = workHoursPerDay * workingDays. OT = hours beyond, multiplied by otMultiplier (default 1.5, settings). Net = regularHours*hourlyRate + otHours*hourlyRate*otMultiplier.
  - Display breakdown cards/lines, highlight net prominently.
  - Calendar renderDayBadge: Salary day (employee.salaryDay) highlight (gold/dollar icon) + tooltip shows "Net salary: X (pay day)"
  - Salary history list per month.
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-8.1: Fixed-mode scenario AC-6 (salary 22000, workingDays 22, 1 full + 1 half leave) → UI shows Base 22000, Leave Deduction 1500, Net 20500.
  - `rule` TR-8.2: Hourly-mode scenario AC-7 (rate 100, 176h regular + 10h OT, OT multiplier 1.5) → UI Net 19100.
  - `rule` TR-8.3: Calendar cell for employee's salaryDay (say 25th) has CSS class `salary-day`; tooltip or day-details shows the calculated net amount.
  - `rubric` TR-8.4: Salary breakdown presentation clarity; scale 1-5; 1=unreadable 3=ok 5=clean itemized list with totals; threshold >=4; evidence screenshot.

## Task 9: Dashboard layout, settings page & role visibility wiring
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 4, Task 5, Task 6, Task 7, Task 8
- **Description**:
  - Dashboard layout: Header (logo, user, role switcher), sidebar nav (Dashboard, Calendar, Attendance, Leaves, Salary, Profile, [Admin-only] Employees, Settings). Content area hosts current page.
  - Dashboard widgets: Mini current-month calendar snippet, Today status card (clocked in/out + quick Clock button), Monthly summary (attendance days, leaves count, salary estimate), Recent leaves/attendance list.
  - Settings page (Admin-only or shared): work week start day, default working days per month, public holiday list (date + name; renders on calendar), default OT multiplier.
  - Employee role: hide Employees/Settings admin-only nav items; all data views pre-filtered by current employee ID.
- **Acceptance Criteria Addressed**: AC-9 (final evidence), FR-9, FR-10, AC-11
- **Test Requirements**:
  - `rule` TR-9.1: Admin view: nav shows "Employees" + "Settings"; Employee view: those items absent.
  - `rule` TR-9.2: Employee role Salary page shows no employee selector; only own data rendered (proves AC-9 scope filter).
  - `rule` TR-9.3: Adding a public holiday via Settings marks that date on calendar with a holiday badge.
  - `rubric` TR-9.4: Responsive layout (AC-11); screenshots at 375px / 768px / 1280px rated >=4.

## Task 10: Final polish, responsive refinement, end-to-end verification
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 9
- **Description**:
  - Fix any mobile layout quirks, add collapsible sidebar for mobile
  - Keyboard navigation review: tab order through calendar and forms, enter-to-submit
  - Color contrast pass on primary elements (text vs backgrounds)
  - End-to-end manual walkthrough: follow each AC scenario once fresh localStorage cleared
  - Run production build, serve `dist/` with static server, confirm everything works the same
- **Acceptance Criteria Addressed**: AC-11, AC-12, NFR-1, NFR-4, all ACs regression pass
- **Test Requirements**:
  - `rule` TR-10.1: `npm run build` succeeds; statically served `dist/` renders app, no 404s, all features function.
  - `rule` TR-10.2: Full regression sweep of each rule AC (AC-1..AC-10) on a freshly cleared browser storage completes without new failures.
  - `rubric` TR-10.3: Calendar UX rubric AC-12 independently scored >=4 via review; evidence = heuristic walkthrough notes.
