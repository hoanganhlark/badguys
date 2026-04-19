# Plan: Refactor BadGuys Dashboard to Ant Design

## Context

The BadGuys app currently uses a mix of **Tailwind CSS utilities**, **custom CSS classes** (`styles.css`), and **hand-rolled UI patterns** (dropdowns, modals, forms, tables). Ant Design (antd v6.3.6) is already installed in `package.json` but **completely unused** in the codebase.

**Goals:**
- Replace all custom HTML/Tailwind UI with Ant Design components
- Preserve 100% of business logic and data flow
- Eliminate fragile hand-rolled patterns (dropdowns, modal overlays, custom backdrop logic)
- Achieve consistent, accessible UI across all pages
- Remove/simplify custom CSS where Ant Design components cover the functionality
- Maintain the visual identity (font, colors) via Ant Design `ConfigProvider` theme tokens

**Scope:** The refactor spans:
- Main calculator UI (`App.tsx`, `ExpensesSection`, `PlayersSection`, `ResultCard`, `ConfigSidebar`, `SessionsModal`, `Toast`)
- Login pages (`LoginModal`, `LoginPage`)
- Dashboard pages (`RankingPage`, `AuditPage`, `UserManagementPage`)
- Dashboard panels (`RankingSidebar`, `RankingPanel`, `MembersPanel`, `MatchFormPanel`, `PlayerStatsModal`)
- Error handling (`ErrorBoundary`)

---

## Dependency Graph & Vertical Slices

### Component Dependencies (Read-Only)
```
App.tsx (root layout + routing)
├─ ConfigSidebar.tsx
├─ SessionsModal.tsx
├─ LoginModal.tsx
├─ Toast.tsx
├─ ExpensesSection.tsx
├─ PlayersSection.tsx
├─ ResultCard.tsx
├─ RankingPage.tsx (conditional route)
│  ├─ RankingSidebar.tsx
│  ├─ RankingPanel.tsx
│  ├─ MembersPanel.tsx
│  ├─ MatchFormPanel.tsx
│  └─ PlayerStatsModal.tsx
├─ AuditPage.tsx (conditional route)
└─ UserManagementPage.tsx (conditional route)
```

### Vertical Slices (Work Order)

Each slice is a **complete, self-contained feature path** that you can test and verify end-to-end.

#### **Slice 1: Theme Setup & Foundation**
- Set up Ant Design `ConfigProvider` with custom theme tokens
- Migrate custom CSS variables and color tokens
- Preserve Plus Jakarta Sans font family
- Ensure all Ant Design components respect the theme globally

**Files:** `src/main.tsx` (ConfigProvider wrapper), `src/styles.css` (minimal custom CSS remains)

---

#### **Slice 2: Authentication (Non-Dashboard)**
- Refactor `LoginModal.tsx` → Ant `Modal` + `Form` + `Input`
- Refactor `LoginPage.tsx` → same Ant components on a full page
- Business logic: username/password submission, error display, loading state
- **Verification:** Login flow works, validation shows errors, submit button loading state works

**Files:** `src/components/LoginModal.tsx`, `src/components/LoginPage.tsx`

**Dependencies:** Slice 1

---

#### **Slice 3: Main App Layout & Sidebar Config**
- Refactor `App.tsx` topbar → Ant `Layout.Header` + `Dropdown` (replace hand-built dropdowns)
- Refactor `ConfigSidebar.tsx` → Ant `Drawer` + `Switch` + `InputNumber`
- Replace Change Password modal → Ant `Modal` + `Form`
- Move Toast calls to `message` API (replace `<Toast>` component)
- Business logic: open/close sidebar, update config values, password change, toast notifications
- **Verification:** Sidebar opens/closes, config values persist to localStorage, password modal works, toasts appear

**Files:** `src/App.tsx`, `src/components/ConfigSidebar.tsx`, `src/components/Toast.tsx` (can delete)

**Dependencies:** Slice 1, Slice 2

---

#### **Slice 4: Calculator Input & Output (Main Page)**
- Refactor `ExpensesSection.tsx` → Ant `InputNumber`
- Refactor `PlayersSection.tsx` → Ant `Input.TextArea` + `Tag` (with click-to-toggle + closable)
- Refactor `ResultCard.tsx` → Ant `Card` + `Statistic`
- Business logic: parse players, calculate fees, display results unchanged
- **Verification:** Input fields work, player tags toggle and remove, fees calculate correctly, copy button sends to clipboard

**Files:** `src/components/ExpensesSection.tsx`, `src/components/PlayersSection.tsx`, `src/components/ResultCard.tsx`

**Dependencies:** Slice 1, Slice 3

---

#### **Slice 5: Session History Modal**
- Refactor `SessionsModal.tsx` → Ant `Modal` + `List` / `Card`
- Business logic: load sessions, delete session, copy summary text with normalization
- **Verification:** Modal opens/closes, sessions list loads, delete works, copy action preserves `kLabels` normalization

**Files:** `src/components/SessionsModal.tsx`

**Dependencies:** Slice 1, Slice 4

---

#### **Checkpoint 1: Main App Is Functional**
At this point, the main calculator page (non-dashboard routes) should work end-to-end. Test locally:
```bash
npm run dev
# Visit http://localhost:5173
# Test: Enter players, change config, copy summary, open sidebar, save session
```

---

#### **Slice 6: Dashboard Navigation & Layout**
- Refactor `RankingSidebar.tsx` → Ant `Drawer` (mobile) + `Layout.Sider` + `Menu` (desktop)
- Refactor `RankingPage.tsx` topbar → Ant `Layout.Header` + `Dropdown` (user menu)
- Layout: `Layout` + `Layout.Header` + `Layout.Sider` + `Layout.Content`
- Business logic: navigate between Member/Match/Ranking views, open/close sidebar on mobile
- **Verification:** Sidebar toggling works, navigation buttons work, responsive behavior is intact

**Files:** `src/components/RankingPage.tsx`, `src/components/ranking/RankingSidebar.tsx`

**Dependencies:** Slice 1, Slice 3

---

#### **Slice 7: Ranking Members Panel**
- Refactor `MembersPanel.tsx` → Ant `Form` (add/edit form) + `Table` (desktop) / `List` (mobile or unified Table)
- Replace rank badges → Ant `Tag` with appropriate colors
- Business logic: CRUD members, inline level selection, edit/delete actions with confirmation
- **Verification:** Add member, edit level, delete member (with confirmation), rank badge colors display correctly

**Files:** `src/components/ranking/MembersPanel.tsx`

**Dependencies:** Slice 1, Slice 6

---

#### **Slice 8: Ranking Matches Panel**
- Refactor `MatchFormPanel.tsx` → Ant `Form` + `Radio.Group` + `Select` + `DatePicker` + `InputNumber`
- Business logic: select match type, pick players, enter scores, save match result
- **Verification:** Match type toggle, player selection, date/score inputs work, save triggers Firebase update

**Files:** `src/components/ranking/MatchFormPanel.tsx`

**Dependencies:** Slice 1, Slice 6, Slice 7

---

#### **Slice 9: Ranking Display Panel**
- Refactor `RankingPanel.tsx` → Ant `Table` (unified for desktop/mobile) + `Progress` (win-rate bars)
- Replace custom mobile/desktop dual rendering with Ant `Table.scroll`
- Business logic: display rankings, sort by rank, show match history per player
- **Verification:** Table renders with all columns, progress bars show correctly, match history displays with dates

**Files:** `src/components/ranking/RankingPanel.tsx`

**Dependencies:** Slice 1, Slice 6, Slice 7, Slice 8

---

#### **Slice 10: Player Stats Modal**
- Refactor `PlayerStatsModal.tsx` → Ant `Modal` + `Progress` + `Collapse` (for expandable metric sections)
- Business logic: display stats for selected player, expandable formula/explanation sections
- **Verification:** Modal opens, metric rows display with progress bars, accordion expand/collapse works

**Files:** `src/components/ranking/PlayerStatsModal.tsx`

**Dependencies:** Slice 1, Slice 6, Slice 9

---

#### **Checkpoint 2: Ranking Dashboard Is Functional**
Test the ranking workflow:
```bash
npm run dev
# Navigate to /dashboard/ranking
# Test: Add member, record match, view rankings, click player for stats, mobile sidebar toggle
```

---

#### **Slice 11: Audit Log Page**
- Refactor `AuditPage.tsx` → Ant `Layout` + `Select` (filters) + `Table` (event log)
- Business logic: filter by user/type, paginate events, display event properties
- **Verification:** Filter dropdowns work, table updates, pagination works if logs are long

**Files:** `src/components/AuditPage.tsx`

**Dependencies:** Slice 1, Slice 6

---

#### **Slice 12: User Management Page**
- Refactor `UserManagementPage.tsx` → Ant `Form` (create user) + `Table` (users list with inline actions)
- Inline role `<select>` → Ant `Select` as a table column render
- Delete/Lock actions → Ant `Popconfirm` wrapping a `Button`
- Business logic: create user, change role, lock/unlock, delete user
- **Verification:** Create user form works, role change updates in table, lock/delete with confirmation dialogs

**Files:** `src/components/UserManagementPage.tsx`

**Dependencies:** Slice 1, Slice 6

---

#### **Slice 13: Error Boundary**
- Refactor `ErrorBoundary.tsx` → Ant `Result` + `Button`
- Business logic: catch errors, display error result, provide reload button
- **Verification:** Manually throw an error; verify error boundary catches it and shows reload button

**Files:** `src/components/ErrorBoundary.tsx`

**Dependencies:** Slice 1

---

#### **Slice 14: Cleanup & Custom CSS Migration**
- Remove/migrate custom CSS from `src/styles.css`
  - Delete `.app-topbar`, `.sidebar-panel`, `.panel-backdrop`, `.dashboard-*`, `.card`, `.input-minimal` (Ant components replace them)
  - Keep `.animate-fade` keyframe if used by transition animations in new code, or replace with Ant motion tokens
  - Keep `.tag-*` color mappings if using as reference, or delete once `Tag` color props are fully integrated
  - Keep font `@import` and any global body styles (background color, font family)
- Verify no broken className references remain
- **Verification:** No console errors, no visual regressions, all pages render

**Files:** `src/styles.css`

**Dependencies:** Slices 1–13

---

## Acceptance Criteria (Per Slice)

Each slice is complete when:

1. **All UI elements are replaced** with Ant Design components (see mapping in Component Audit above)
2. **Business logic is unchanged** — no modifications to state management, data flow, API calls, or calculations
3. **Functionality works end-to-end:**
   - Inputs accept values and trigger handlers
   - Forms validate and submit
   - Modals/drawers open/close correctly
   - Lists and tables render and are interactive
4. **Styling is consistent** with the app theme (via `ConfigProvider`)
5. **Responsive behavior is intact** (mobile drawer, desktop layout, table scrolling)
6. **No console errors** in browser dev tools
7. **No broken imports or missing antd components**

---

## Implementation Notes

### Key Patterns & Reusable Mapping

| Custom Pattern | Ant Design Replacement | Notes |
|---|---|---|
| Custom fixed overlay modal | `<Modal>` | Handles backdrop, Escape key, click-outside |
| Custom sidebar drawer | `<Drawer>` | Replaces .sidebar-panel + .panel-backdrop + manual Escape listener |
| Hand-built dropdown menus | `<Dropdown menu={{ items: [...] }}>` | Replaces ref + useEffect click-outside logic |
| `<input type="text">` | `<Input>` or `<Form.Item><Input /></Form.Item>` | If in a form, nest in Form.Item |
| `<input type="password">` | `<Input.Password>` | |
| `<input type="number">` | `<InputNumber>` | Use `min`, `max`, `precision` props |
| `<input type="checkbox">` | `<Checkbox>` or `<Switch>` | Switch for toggles, Checkbox for forms |
| `<textarea>` | `<Input.TextArea autoSize />` | Replaces manual `useLayoutEffect` height sync |
| `<select>` | `<Select>` or `<Form.Item><Select /></Form.Item>` | |
| `<input type="datetime-local">` | `<DatePicker showTime />` | |
| Hand-built tag chips | `<Tag closable onClose={...} onClick={...} />` | Keep click-to-toggle, add close button |
| Custom progress bar `<div>` | `<Progress percent={...} />` | |
| `.card` (white box with shadow) | `<Card>` | |
| Custom stat display | `<Statistic />` | For key metrics (fee, rank, count) |
| Custom table + dual mobile view | `<Table scroll={{ x: ... }} />` | Ant Table handles responsive scrolling |
| Manual form validation errors | `<Form>` with `Form.Item validateStatus` | Form handles error display |
| Toast notification custom component | `message.success() / message.info()` | Replace entire component with API calls |

### Firestore Mobile Keyboard Workaround

The `--mobile-keyboard-inset` CSS variable is used in `RankingPage.tsx` and `UserManagementPage.tsx` to handle mobile keyboard overlap. This is **not** changed by the Ant Design refactor — the JavaScript `useEffect` listeners for `visualViewport` remain in place. Ant Design components will respect the padding from this variable if set on the parent container.

### Preserve Custom Behavior

- **Player tag cycle** (`male → female → set → male`) — Keep the `onTogglePlayer` handler, wire to `Tag onClick`.
- **Copy summary text normalization** (`normalizeKLabels`) — Keep the function, wire to copy button's `onClick` or antd `Typography.Paragraph copyable.text` option.
- **Duplicate name detection** — Keep the Map-based logic in `PlayersSection`, just update the visual display from `.tag-duplicate` class to `Tag` color prop.
- **Mobile keyboard inset** — Keep the CSS variable and `visualViewport` listener.
- **Auto-disarming reset button** — Keep the timer logic in `App.tsx`.
- **Firestore subscriptions & Firebase calls** — All unchanged; UI refactor only.

---

## Verification Steps

### Per-Slice Testing
After each slice, run:
```bash
npm run dev
# or
npm run build && npm run preview  # test production build
```

Manually test:
- Component renders without errors
- User interactions work (click, type, select, toggle)
- Business logic result is unchanged
- No console errors

### Full Integration Testing (Checkpoint 3)

1. **Calculator page** (`/`):
   - Input expenses and players
   - Toggle player tags
   - View calculated fees
   - Copy summary
   - Open sidebar, change config, close
   - View/delete recent sessions

2. **Ranking dashboard** (`/dashboard/ranking`):
   - Add member
   - Record singles/doubles match
   - View rankings table
   - Click player for stats modal
   - Toggle admin metrics visibility
   - Mobile: verify sidebar drawer opens/closes

3. **Audit log** (`/dashboard/audit`):
   - Filter by user/type
   - Verify events display correctly

4. **User management** (`/dashboard/users`):
   - Create new user
   - Change user role (inline select)
   - Lock/delete user (with confirmation)

5. **Auth**:
   - Login modal appears on protected routes
   - Password validation works
   - Logout works

6. **Responsive**:
   - Desktop and mobile viewports both work
   - Sidebar drawer on mobile, static sidebar on desktop
   - Tables scroll horizontally on narrow screens

7. **Telegram notifications** (if configured):
   - Verify Telegram messages still send on session save/visit

---

## Critical Files to Modify

| Phase | File | Changes |
|---|---|---|
| 1 | `src/main.tsx` | Wrap `<App>` with Ant `<ConfigProvider theme={...}>` |
| 1 | `src/styles.css` | Remove custom component styles; keep font/global styles |
| 2 | `src/components/LoginModal.tsx` | 100% rewrite: `Modal` + `Form` |
| 2 | `src/components/LoginPage.tsx` | 100% rewrite: `Form` + `Layout` |
| 3 | `src/App.tsx` | Major: topbar → `Layout.Header`, dropdowns → `Dropdown`, remove Change Password modal, replace Toast |
| 3 | `src/components/ConfigSidebar.tsx` | 100% rewrite: `Drawer` + `Switch` + `InputNumber` |
| 4 | `src/components/ExpensesSection.tsx` | ~30 lines: replace `<input>` with `<InputNumber>` |
| 4 | `src/components/PlayersSection.tsx` | Major: `Input.TextArea` + `Tag`, keep click-to-toggle logic |
| 4 | `src/components/ResultCard.tsx` | Rewrite: `Card` + `Statistic` + `Divider` |
| 5 | `src/components/SessionsModal.tsx` | 100% rewrite: `Modal` + `List`/`Card`, keep copy normalization |
| 6 | `src/components/RankingPage.tsx` | Major: `Layout` + `Layout.Header` + `Layout.Sider`, topbar dropdowns |
| 6 | `src/components/ranking/RankingSidebar.tsx` | 100% rewrite: `Drawer` (mobile) + `Layout.Sider` + `Menu` (desktop) |
| 7 | `src/components/ranking/MembersPanel.tsx` | Major: `Form` + `Table` + `Tag`, keep edit/delete logic |
| 8 | `src/components/ranking/MatchFormPanel.tsx` | Major: `Form` + `Radio.Group` + `Select` + `DatePicker` + `InputNumber` |
| 9 | `src/components/ranking/RankingPanel.tsx` | Major: unified `Table` (replaces dual mobile/desktop), `Progress`, keep click-for-stats |
| 10 | `src/components/ranking/PlayerStatsModal.tsx` | 100% rewrite: `Modal` + `Progress` + `Collapse` |
| 11 | `src/components/AuditPage.tsx` | Major: `Table` + filter `Select`, keep sorting/pagination |
| 12 | `src/components/UserManagementPage.tsx` | Major: `Form` (create) + `Table` with inline `Select` and `Popconfirm` actions |
| 13 | `src/components/ErrorBoundary.tsx` | Minor: `Result` + `Button` |
| 14 | `src/styles.css` | Remove obsolete custom classes, keep essentials |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Breaking business logic | Slices 1–5 (non-dashboard) have no logic changes; test extensively before Slice 6+ |
| Mobile UX regression | Each slice tests responsive behavior; Checkpoint 2 validates mobile-specific flows (drawer, table scrolling) |
| Performance | Ant components are optimized; no expected perf issues. Verify with `npm run build` if needed. |
| Styling consistency | Use `ConfigProvider theme` tokens for colors/fonts — no hardcoding Tailwind colors in Ant components |
| Missing dependencies | Ant Design is already installed; no new npm packages needed |
| Custom CSS conflicts | By removing custom `.card`, `.input-minimal`, etc. and replacing with Ant components, CSS conflicts are eliminated |
| Mobile keyboard overlap | Keep the existing `visualViewport` listener and CSS variable; Ant components inherit the padding |

---

## Definition of Done

The refactor is complete when:

✅ All components render with Ant Design UI  
✅ All business logic is preserved (no functional changes)  
✅ No console errors or warnings in dev/production builds  
✅ All routes work (`/`, `/login`, `/dashboard/ranking`, `/dashboard/audit`, `/dashboard/users`, `/ranking`)  
✅ Responsive design works on mobile and desktop  
✅ Custom CSS is minimal (only global styles and keyframes remain)  
✅ All Checkpoints pass: main app functional → ranking dashboard functional → full app functional  
✅ Telegram notifications still work (if configured)  
✅ Production build (`npm run build`) succeeds and deploys
