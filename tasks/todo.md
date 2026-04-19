# Task List: Ant Design Refactor

## Checkpoints

### Checkpoint 1: Main App Is Functional ✓

Main calculator page (non-dashboard routes) works end-to-end.

### Checkpoint 2: Ranking Dashboard Is Functional ✓

Ranking dashboard with all admin pages works end-to-end.

### Checkpoint 3: Full App Refactored & Cleaned Up ✓

All components migrated, custom CSS removed, no console errors.

---

## Slice 1: Theme Setup & Foundation

- [x] Set up Ant Design `ConfigProvider` with custom theme tokens in `src/main.tsx`
- [x] Migrate custom CSS variables and color tokens to theme
- [x] Preserve Plus Jakarta Sans font family in theme config
- [x] Verify Ant Design components respect the theme globally
- [ ] Remove unused Tailwind from global styles if needed

**Files:** `src/main.tsx`, `src/styles.css`

---

## Slice 2: Authentication (Non-Dashboard)

- [x] Refactor `LoginModal.tsx` → Ant `Modal` + `Form` + `Input`
- [x] Refactor `LoginPage.tsx` → Ant `Form` + `Input` on a full page
- [x] Implement username/password form submission
- [x] Implement error display via Form.Item validation
- [x] Implement loading state on submit button
- [ ] Test login flow end-to-end
- [ ] Test password validation works
- [ ] Test submit button loading state

**Files:** `src/components/LoginModal.tsx`, `src/components/LoginPage.tsx`

**Depends on:** Slice 1

---

## Slice 3: Main App Layout & Sidebar Config

- [x] Refactor `App.tsx` topbar → Ant `Layout.Header` + `Dropdown` menus
- [x] Replace hand-built ranking dropdown menu with Ant `Dropdown`
- [x] Replace hand-built user dropdown menu with Ant `Dropdown`
- [x] Refactor `ConfigSidebar.tsx` → Ant `Drawer` + `Switch` + `InputNumber`
- [x] Extract Change Password modal to separate component using Ant `Modal` + `Form`
- [x] Replace `<Toast>` component calls with `message` API
- [x] Update all toast calls in App.tsx to use `message.success()` / `message.info()`
- [ ] Test sidebar open/close
- [ ] Test config values persist to localStorage
- [ ] Test password modal works
- [ ] Test toast notifications appear

**Files:** `src/App.tsx`, `src/components/ConfigSidebar.tsx`, `src/components/Toast.tsx`

**Depends on:** Slice 1, Slice 2

---

## Slice 4: Calculator Input & Output (Main Page)

- [x] Refactor `ExpensesSection.tsx` → Ant `InputNumber` fields
- [x] Refactor `PlayersSection.tsx` → Ant `Input.TextArea` + `Tag` components
- [x] Keep click-to-toggle player mode logic on Tag click
- [x] Keep remove button on Tag (onClose prop)
- [x] Keep duplicate detection warning as Alert
- [x] Refactor `ResultCard.tsx` → Ant `Card` + `Statistic` + `Divider`
- [ ] Test input fields accept values and trigger state changes
- [ ] Test player tags toggle mode and remove
- [ ] Test fees calculate correctly
- [ ] Test copy button sends to clipboard

**Files:** `src/components/ExpensesSection.tsx`, `src/components/PlayersSection.tsx`, `src/components/ResultCard.tsx`

**Depends on:** Slice 1, Slice 3

---

## Slice 5: Session History Modal

- [x] Refactor `SessionsModal.tsx` → Ant `Modal` + `List` (or Card per session)
- [x] Implement loading state with Spin
- [x] Implement empty state with Empty component
- [x] Implement error state with Alert
- [x] Keep copy summary text with normalization logic intact
- [x] Implement delete session with Popconfirm
- [ ] Test modal open/close
- [ ] Test sessions list loads
- [ ] Test delete action works with confirmation
- [ ] Test copy preserves `kLabels` normalization

**Files:** `src/components/SessionsModal.tsx`

**Depends on:** Slice 1, Slice 4

---

## Checkpoint 1: Main App Is Functional

Test the main calculator page:

```bash
npm run dev
# Visit http://localhost:5173
# Test: Enter players, change config, copy summary, open sidebar, save session
```

---

## Slice 6: Dashboard Navigation & Layout

- [x] Refactor `RankingSidebar.tsx` → Ant `Drawer` (mobile) + `Layout.Sider` + `Menu` (desktop)
- [x] Refactor `RankingPage.tsx` layout → Ant `Layout` + `Layout.Header` + `Layout.Sider` + `Layout.Content`
- [x] Replace topbar dropdowns with Ant `Dropdown`
- [x] Keep mobile hamburger button to toggle drawer
- [x] Keep responsive behavior (drawer on mobile, static sidebar on desktop)
- [ ] Test sidebar toggle on mobile
- [ ] Test navigation buttons work
- [ ] Test responsive layout behavior

**Files:** `src/components/RankingPage.tsx`, `src/components/ranking/RankingSidebar.tsx`

**Depends on:** Slice 1, Slice 3

---

## Slice 7: Ranking Members Panel

- [x] Refactor `MembersPanel.tsx` → Ant `Form` (add/edit form)
- [x] Replace table rendering → Ant `Table` with 3 columns (Name, Level/Rank, Actions)
- [x] Replace rank badges → Ant `Tag` with color prop
- [x] Implement edit action (inline edit or modal form)
- [x] Implement delete action with Popconfirm
- [x] Keep CRUD logic intact
- [ ] Test add member form submission
- [ ] Test edit member level
- [ ] Test delete member with confirmation dialog
- [ ] Test rank badge colors display

**Files:** `src/components/ranking/MembersPanel.tsx`

**Depends on:** Slice 1, Slice 6

---

## Slice 8: Ranking Matches Panel

- [x] Refactor `MatchFormPanel.tsx` → Ant `Form` + form components
- [x] Replace match type toggle → Ant `Radio.Group` with `Radio.Button`
- [x] Replace player selects → Ant `Select` components
- [x] Replace datetime input → Ant `DatePicker` with `showTime`
- [x] Replace score number inputs → Ant `InputNumber`
- [x] Keep "Add Set" button logic intact
- [ ] Test match type toggle works
- [ ] Test player selection works
- [ ] Test datetime and score inputs work
- [ ] Test form submission updates Firebase

**Files:** `src/components/ranking/MatchFormPanel.tsx`

**Depends on:** Slice 1, Slice 6, Slice 7

---

## Slice 9: Ranking Display Panel

- [x] Refactor `RankingPanel.tsx` → unified Ant `Table` (replaces dual mobile/desktop rendering)
- [x] Replace custom progress bars → Ant `Progress` component
- [x] Implement table columns: Rank, Name, Win Rate, Score
- [x] Implement horizontal scroll for mobile: `<Table scroll={{ x: 600 }}>`
- [x] Keep click-for-stats behavior (navigate to player detail modal)
- [x] Keep match history display logic
- [ ] Test table renders all columns
- [ ] Test progress bars show correct values
- [ ] Test responsive scrolling on narrow screens
- [ ] Test match history displays with dates

**Files:** `src/components/ranking/RankingPanel.tsx`

**Depends on:** Slice 1, Slice 6, Slice 7, Slice 8

---

## Slice 10: Player Stats Modal

- [x] Refactor `PlayerStatsModal.tsx` → Ant `Modal` + `Progress` + `Collapse`
- [x] Replace custom expandable sections → Ant `Collapse` panels
- [x] Replace custom progress bars → Ant `Progress`
- [x] Keep metric calculations intact
- [ ] Test modal open/close
- [ ] Test metric rows display with progress bars
- [ ] Test accordion expand/collapse works
- [ ] Test formula/explanation sections render

**Files:** `src/components/ranking/PlayerStatsModal.tsx`

**Depends on:** Slice 1, Slice 6, Slice 9

---

## Checkpoint 2: Ranking Dashboard Is Functional

Test the ranking dashboard workflow:

```bash
npm run dev
# Navigate to /dashboard/ranking
# Test: Add member, record match, view rankings, click player for stats, mobile sidebar toggle
```

---

## Slice 11: Audit Log Page

- [x] Refactor `AuditPage.tsx` → Ant `Layout` + `Select` (filters) + `Table`
- [x] Implement filter by user: Ant `Select` dropdown
- [x] Implement filter by event type: Ant `Select` dropdown
- [x] Replace table rendering → Ant `Table` with 7 columns (Time, Type, Event, User, Role, Path, Params)
- [x] Keep sorting and pagination logic intact
- [ ] Test filter dropdowns work
- [ ] Test table updates based on filters
- [ ] Test pagination works if logs are long

**Files:** `src/components/AuditPage.tsx`

**Depends on:** Slice 1, Slice 6

---

## Slice 12: User Management Page

- [x] Refactor `UserManagementPage.tsx` → Ant `Form` (create user) + `Table` (users list)
- [x] Implement create user form: Ant `Form` + `Input` + `Input.Password` + `Select` (role) + `Button`
- [x] Replace users table rendering → Ant `Table` with 5 columns (Username, Role, Created At, Last Login, Actions)
- [x] Implement inline role change: table cell renders Ant `Select`
- [x] Implement lock/unlock action: table cell renders `Button` with Popconfirm
- [x] Implement delete action: table cell renders `Button` with Popconfirm
- [x] Keep CRUD logic intact
- [ ] Test create user form submission
- [ ] Test inline role change updates table
- [ ] Test lock/delete with confirmation dialogs
- [ ] Test own account is protected from delete/lock

**Files:** `src/components/UserManagementPage.tsx`

**Depends on:** Slice 1, Slice 6

---

## Slice 13: Error Boundary

- [x] Refactor `ErrorBoundary.tsx` → Ant `Result` + `Button`
- [x] Implement error state display with `Result` component (status="error")
- [x] Implement reload button with `Button` component
- [x] Keep error catching logic intact
- [ ] Test error boundary catches errors
- [ ] Test reload button resets the app

**Files:** `src/components/ErrorBoundary.tsx`

**Depends on:** Slice 1

---

## Slice 14: Cleanup & Custom CSS Migration

- [x] Review `src/styles.css` and identify obsolete custom CSS classes
- [x] Remove `.app-topbar`, `.sidebar-panel`, `.panel-backdrop` (replaced by Ant Layout/Drawer)
- [x] Remove `.dashboard-*`, `.card`, `.input-minimal` (replaced by Ant components)
- [ ] Keep `.animate-fade` keyframe if needed, or replace with Ant motion tokens
- [ ] Keep font `@import` and global body styles (bg, font-family)
- [x] Verify no broken className references in components
- [ ] Search codebase for any remaining Tailwind utility classes that should stay
- [ ] Test no console errors after CSS cleanup
- [ ] Verify no visual regressions across all pages

**Files:** `src/styles.css`, all components

**Depends on:** Slices 1–13

---

## Checkpoint 3: Full App Refactored & Cleaned Up

Test all routes and verify completeness:

```bash
npm run dev
# Test:
# - / (calculator page)
# - /login (login page)
# - /dashboard/ranking (dashboard)
# - /dashboard/audit (audit log, admin only)
# - /dashboard/users (user management, admin only)
# - /ranking (public ranking view)
# - Mobile and desktop viewports
# - Telegram notifications (if configured)
```

Run production build:

```bash
npm run build
npm run preview
```

Verify:

- ✅ No console errors
- ✅ All pages render correctly
- ✅ All interactions work
- ✅ Mobile responsive design intact
- ✅ Production build succeeds
- ✅ Custom CSS minimal (only global styles remain)
