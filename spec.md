# Salary Calendar Web App - Product Requirements Document

## Overview
- **Summary**: A browser-based employee salary and attendance calendar application built with React + Vite. Features include a monthly calendar view with salary day marking, salary calculator (fixed + hourly modes), office login/logout time tracking, leave management (full/half day), and employee profile management.
- **Purpose**: Provide individual employees and small teams with an all-in-one tool to track attendance, manage leaves, calculate monthly salary, and view payroll information in a calendar-centric interface.
- **Target Users**:
  - **Employee Role**: View own calendar, log in/out, apply for leaves, view salary details, update own profile
  - **Admin Role**: Manage all employees, view all calendars/leaves, configure salary settings, manage roles

## Goals
- Build a responsive, calendar-first single-page application accessible from desktop and mobile browsers
- Persist all data reliably using browser LocalStorage (no backend dependency)
- Support dual salary calculation modes: fixed monthly salary with leave deductions, and hourly rate based on logged hours
- Provide intuitive login/logout time tracking per day with automatic hourly totals
- Enable full-day and half-day leave requests with visual calendar indicators
- Include a complete employee profile section with personal, compensation, and role details
- Support admin + employee role-based access with appropriate data visibility restrictions

## Non-Goals
- No backend server deployment, API, or database integration in v1
- No email notifications, calendar sync (Google/Outlook), or external integrations
- No payroll tax computation, statutory deductions, or payslip PDF generation
- No multi-device real-time sync; data is scoped to a single browser profile
- No team collaboration features such as comments, approval workflows, or document attachments

## Background & Context
- Project directory is currently empty; this is a greenfield implementation.
- User confirmed stack: React + Vite frontend, LocalStorage persistence, both salary modes, Admin + Employee roles.
- User prefers a working prototype first and will provide iterative feedback after seeing results.

## Functional Requirements
- **FR-1 Authentication & Roles**: App starts with a simple role-based login screen (no password in v1; select role + employee name from list or create admin on first run). Admin sees all data; Employee sees only own data.
- **FR-2 Employee Profile Management**: Create, view, edit employee profiles with fields: name, email, phone, employee ID, designation, department, joining date, avatar (optional initials), role (Admin/Employee), salary mode (Fixed/Hourly), fixed monthly salary amount, hourly rate, official working hours (start/end), monthly salary day (e.g., 25th).
- **FR-3 Monthly Calendar View**: Full month grid calendar with today highlight, navigation controls (prev/next month, jump to today), and day-level detail panel. Visually marks: salary day, full-day leaves, half-day leaves, logged attendance days, and public holidays (configurable).
- **FR-4 Attendance Login/Logout**: Per-day clock-in and clock-out actions recording exact timestamps. Auto-compute total worked hours. Prevent invalid states (e.g., logout before login, multiple simultaneous sessions). Show a running "clocked in" indicator.
- **FR-5 Leave Management**: Apply for full-day or half-day leave specifying date, leave type (Casual/Sick/Personal/Others), and optional note. Leave counts in salary deductions. Leaves shown on calendar with distinct visual badges.
- **FR-6 Salary Calculator**: Two modes switchable per employee:
  - **Fixed Mode**: Monthly salary minus per-day deductions for full-day leaves and half-day deductions for half-day leaves. Per-day rate = (monthly salary) / (working days in month).
  - **Hourly Mode**: (Total logged working hours in month) x (hourly rate). Optionally apply overtime multiplier beyond official daily hours.
  - Display a salary breakdown panel: base amount, leave deductions, overtime (if any), net payable, next salary date.
- **FR-7 Salary Day Marker**: Calendar clearly highlights the configured monthly salary day; shows the computed net salary amount on that day's cell tooltip/details.
- **FR-8 Data Persistence**: All data (employees, attendance records, leaves, profile settings, current role session) read from and written to LocalStorage with sensible defaults on first launch.
- **FR-9 Dashboard Summary**: Landing dashboard shows: current month calendar summary, today's attendance status, leaves taken this month, salary estimate-to-date, and quick action buttons (Login, Apply Leave, View Salary).
- **FR-10 Settings**: Admin can configure global settings: default work hours, list of public holidays, default leave balance. Employee can change their own view preferences.

## Non-Functional Requirements
- **NFR-1 Responsiveness**: UI usable on desktop (>=1024px) and mobile (<=480px) viewports with no horizontal scrolling.
- **NFR-2 Performance**: Calendar render and month transition complete in under 300ms on a typical consumer laptop.
- **NFR-3 Data Integrity**: LocalStorage reads/writes wrapped with JSON parse/serialize error handling and graceful fallbacks; corrupt storage is reset without crashing the app.
- **NFR-4 Accessibility**: Semantic HTML, keyboard-navigation support for calendar and form controls, adequate color contrast.
- **NFR-5 Maintainability**: Component modularity (components per feature), clear folder structure, inline TypeScript-style PropTypes via TypeScript types, no dead/unused code.

## Constraints
- **Technical**:
  - Frontend-only; React 18+ with Vite build toolchain.
  - Storage limited to browser LocalStorage (typically ~5MB).
  - No external backend, auth service, or build-time dependency requiring API keys.
- **Business**:
  - Salary computation uses simplified logic; not intended for legally compliant payroll.
  - Role switching in v1 is non-password-protected (suitable for personal / small-team trusted environment).
- **Dependencies**:
  - Vite and React official packages.
  - UI may use a lightweight CSS approach (plain CSS modules or utility classes). No heavy UI framework unless necessary.
  - date-fns or similar tiny date utility library preferred over Moment.js for calendar math.

## Assumptions
- A single user / small trusted team will use one browser installation; no encryption of LocalStorage data required in v1.
- A calendar month has 22 default working days for per-day salary math (weekends excluded); admin can tweak.
- Overtime computation in hourly mode is optional; default multiplier 1.5x if enabled.
- Half-day leave counts as 0.5 leave days and deducts half of the per-day rate in fixed mode.
- First run seeds an admin user automatically; user is guided through profile creation.

## Acceptance Criteria

### AC-1: App launches and onboards first-run admin
- **Type**: `rule`
- **Given**: Fresh browser with no LocalStorage data for the app
- **When**: User opens the app URL
- **Then**: App presents a one-time admin setup screen; after submitting admin name and basic profile, dashboard loads showing the seeded admin profile
- **Pass Condition**: On first run LocalStorage `salaryCalendar:employees` contains exactly 1 record with `role: 'admin'`; dashboard renders without console errors
- **Evidence**: Manual browser walkthrough + DevTools Application tab LocalStorage inspection

### AC-2: Employee CRUD from admin
- **Type**: `rule`
- **Given**: Logged in as Admin
- **When**: Admin creates a new employee (with profile fields FR-2), edits them, then deletes another
- **Then**: The Employees list reflects the changes; LocalStorage persists across page reload; deleted employee no longer appears in calendars or dropdowns
- **Pass Condition**: After reload, counts match; GET-like read of LocalStorage employee list matches UI
- **Evidence**: Screenshots of list before/after + `localStorage.getItem` output in console

### AC-3: Calendar renders with navigation
- **Type**: `rule`
- **Given**: Dashboard loaded for any user
- **When**: User clicks previous/next month and "Today"
- **Then**: Calendar grid updates correctly for that month with proper day-to-weekday mapping, today is highlighted in current month; leap year and month edge cases correct
- **Pass Condition**: Feb 2028 (leap) shows 29 days; Jan/Dec transition works; today highlight matches `new Date()` day
- **Evidence**: Navigate to three different months and compare cells with known calendar; console no errors

### AC-4: Attendance login/logout records and computes hours
- **Type**: `rule`
- **Given**: Employee viewing today's calendar cell
- **When**: Employee clicks "Clock In" at time T1 then "Clock Out" at time T2 (T2>T1)
- **Then**: Day cell is marked attended; both timestamps stored; total worked hours displayed = round((T2-T1)/3600000, 2)
- **Pass Condition**: LocalStorage attendance record exists with both stamps; displayed hours match manual calculation within 0.01h tolerance
- **Evidence**: DevTools readback of attendance record + UI screenshot

### AC-5: Leave application (full + half day) persists and shows on calendar
- **Type**: `rule`
- **Given**: Employee dashboard with a current month calendar
- **When**: Employee applies for one full-day leave on date A and one half-day leave on date B, both in current month
- **Then**: Calendar cell A shows a full-leave visual badge; cell B shows half-leave badge; both leaves appear in the monthly leaves list
- **Pass Condition**: Leaves persisted in LocalStorage under correct employee ID and correct types
- **Evidence**: UI screenshots of both cells + LocalStorage leaves array dump

### AC-6: Fixed salary mode deduction math
- **Type**: `rule`
- **Given**: Employee on Fixed mode with monthly salary = 22000, configured 22 working days in month
- **When**: Month contains 1 full-day leave and 1 half-day leave, no other changes
- **Then**: Per-day rate = 1000; full deduction = 1000; half deduction = 500; net salary displayed = 20500
- **Pass Condition**: Salary breakdown panel shows exact numbers 22000, 1000, 500, 20500
- **Evidence**: Screenshot of salary panel + console log of calculator function output

### AC-7: Hourly salary mode calculation
- **Type**: `rule`
- **Given**: Employee on Hourly mode, hourly rate = 100, official 8h/day, 22 working days, overtime 1.5x enabled
- **When**: Employee logs exactly 176 regular hours (22 x 8) plus 10 overtime hours
- **Then**: Salary = (176 x 100) + (10 x 100 x 1.5) = 19100
- **Pass Condition**: Salary panel displays 19100 with breakdown line items matching
- **Evidence**: Screenshot + console calculator output

### AC-8: Salary day highlighted with amount
- **Type**: `rule`
- **Given**: Employee salary day configured to day 25 of the month, current month has a computed net amount
- **When**: Calendar renders the month containing day 25
- **Then**: Day-25 cell has a distinct "salary day" style marker; tooltip/detail shows the computed net salary
- **Pass Condition**: Day 25 DOM class/style contains salary marker; tooltip text matches net figure from AC-6 or AC-7
- **Evidence**: DOM inspection + screenshot

### AC-9: Role-based data visibility
- **Type**: `rule`
- **Given**: App has Admin "A" and Employee "E" with distinct leaves/attendance
- **When**: Switched to Employee role and logged in as E
- **Then**: Calendar, profile, salary, leaves, attendance show only E's data; admin-only nav items (Employees list, global settings) are hidden
- **Pass Condition**: UI shows only E-specific data; network/console shows no attempt to read other employees' data from LocalStorage (read paths filtered by current employee ID)
- **Evidence**: Two screenshots (Admin view vs Employee E view)

### AC-10: Persistence across page refresh
- **Type**: `rule`
- **Given**: Data created (employee, attendance, leaves, settings)
- **When**: Browser reload button pressed
- **Then**: After reload, same dashboard state renders, all counts unchanged, no console errors
- **Pass Condition**: JSON.stringify of LocalStorage data before and after reload match (minus timestamps of clock-in time if currently clocked)
- **Evidence**: Console dumps of `localStorage` key before/after reload

### AC-11: Responsive layout
- **Type**: `rubric`
- **Dimension**: Visual quality and usability of the UI across viewport widths (mobile <=480px, tablet, desktop >=1024px)
- **Scale**: 1-5
- **Anchors**: 1 = layout broken at one or more widths, horizontal scroll or overlapping elements; 3 = usable at all widths with minor spacing issues; 5 = polished, optimized layout with appropriate mobile-first patterns (collapsible nav, stacked cards, touch-friendly targets)
- **Pass Threshold**: >= 4
- **Evidence**: Screenshots at 375px, 768px, 1280px widths with notes on any issues

### AC-12: Calendar UX clarity
- **Type**: `rubric`
- **Dimension**: Intuitiveness and visual clarity of the calendar-centric interface, including day markers, legend, navigation, and day-details panel
- **Scale**: 1-5
- **Anchors**: 1 = confusing or inconsistent markers, unclear how to perform common actions; 3 = usable with small legend/labeling gaps; 5 = instantly readable — different event types (salary, full-leave, half-leave, attendance) are visually distinct with a legend; interactions feel effortless
- **Pass Threshold**: >= 4
- **Evidence**: Heuristic walkthrough notes + screenshot of calendar with annotations

### AC-13: Code structure maintainability
- **Type**: `rubric`
- **Dimension**: Folder structure, component boundaries, and readability of source code
- **Scale**: 1-5
- **Anchors**: 1 = monolithic files, no separation of concerns; 3 = basic folder layout with some cross-feature coupling; 5 = clean separation (components/, pages/, hooks/, utils/, store/, types/), each file under ~300 lines, clear naming, no copy-pasted logic
- **Pass Threshold**: >= 4
- **Evidence**: Directory tree listing + representative file samples

## Open Questions
- [ ] (Resolved via user preference) Default salary calculation mode chosen per employee; fixed + hourly both supported.
- [ ] (Deferred to v2) Password-protected login; v1 uses role picker.
- [ ] (Deferred to v2) Public holiday dates preloaded for a specific country; v1 lets admin manually add holidays.
