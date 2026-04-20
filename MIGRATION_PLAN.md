# Migration Plan: React Vite → Next.js 15 + Supabase

## Overview

Migrate BadGuys from a Vite-based SPA (React Router, Firebase, localStorage) to Next.js 15 (App Router) with Supabase (PostgreSQL + Auth). Business logic (Glicko2 ranking, cost calculation, Telegram integration) remains unchanged. All routes converted to Server Components where read-only, Server Actions for mutations.

**Scope:** 
- Replace Firebase with Supabase PostgreSQL
- Replace React Router with Next.js file-based routing
- Replace custom MD5 auth with either Supabase Auth or keep custom auth in DB
- Replace localStorage ranking state with database-backed persistence
- Maintain all public URLs for backward compatibility
- Keep i18n (Vietnamese only)

**Timeline:** Estimate ~80-120 tasks (this plan is Phase 1: dependency graph & macro tasks)

---

## Architecture Decisions

### 1. Authentication Strategy
**Decision:** Keep custom username/password auth stored in Supabase PostgreSQL
**Rationale:** 
- Existing app uses custom MD5 hash auth, not Supabase Auth
- Simpler migration path (no user migration complexity)
- Maintains compatibility with existing usernames
- Server-side role enforcement via middleware

**Alternative considered:** Supabase Auth (native)
- Would require migrating user credentials
- Adds OAuth capability but not needed now
- More overhead for simple username/password flow

### 2. Server Components vs Client Components
**Decision:** Use Server Components for all read-only pages, Client Components only for interactive UI
**Rationale:**
- `/` (cost calculator) — Client Component (real-time input)
- `/ranking` (public ranking view) — Server Component (static read)
- `/dashboard/ranking` — Client Component (form interactions)
- `/dashboard/audit` — Server Component (read-only audit log)
- `/dashboard/users` — Client Component (user management forms)

### 3. Data Persistence
**Decision:** Database-backed for all ranking/session data, session storage for UI draft state
**Rationale:**
- Rankings, matches, members must persist reliably across user sessions
- Input drafts can stay in localStorage (convenience, not critical)
- Session data moves from Firestore to Supabase `sessions` table
- User settings (tau, penaltyCoefficient) in `ranking_settings` table

### 4. API Routes vs Server Actions
**Decision:** Server Actions for all mutations, no REST API routes (unless needed for Telegram webhook)
**Rationale:**
- Reduces API surface area
- Safer CSRF handling with Next.js
- Server Actions integrate naturally with forms

---

## Database Schema (Supabase PostgreSQL)

### Tables to Create

```
users
├── id (UUID, primary key)
├── username (text, unique)
├── password (text, MD5 hash)
├── role (enum: 'admin', 'member', default: 'member')
├── is_disabled (boolean, default: false)
├── created_at (timestamp)
└── last_login_at (timestamp)

ranking_members
├── id (bigint, primary key)
├── name (text)
├── level (text, e.g., 'Yo', 'Lo')
├── created_at (timestamp)

ranking_matches
├── id (bigint, primary key)
├── type (enum: 'singles', 'doubles')
├── team1 (text array)
├── team2 (text array)
├── sets (text array, e.g., ['21-19', '18-21'])
├── date (text, YYYY-MM-DD)
├── played_at (timestamp)
├── duration_minutes (integer)
├── created_by (UUID, foreign key → users.id)
├── created_at (timestamp)

ranking_snapshots
├── id (UUID, primary key)
├── data (jsonb, array of {memberId, memberName, rank, rankScore})
├── created_at (timestamp)

sessions
├── id (UUID, primary key)
├── date_key (text, YYYY-MM-DD)
├── summary_text (text)
├── court_fee (numeric)
├── court_count (integer)
├── shuttle_count (integer)
├── shuttle_fee (numeric)
├── total (numeric)
├── male_fee (numeric)
├── female_fee (numeric)
├── females_count (integer)
├── males_count (integer)
├── set_players_count (integer)
├── players (jsonb)
├── created_at (timestamp)

audit_events
├── id (UUID, primary key)
├── event_name (text)
├── event_type (enum: 'event', 'route_change')
├── params (jsonb)
├── user_properties (jsonb)
├── page_path (text)
├── mode (text)
├── created_at (timestamp)
├── user_id (UUID, nullable, foreign key → users.id)

ranking_categories
├── id (UUID, primary key)
├── name (text)
├── display_name (text)
├── order (integer)
├── created_at (timestamp)

ranking_settings
├── id (UUID, primary key)
├── user_id (UUID, foreign key → users.id)
├── tau (float, default: 0.5)
├── penalty_coefficient (float, default: 0.3)
├── metric_visibility (jsonb)
├── created_at (timestamp)
├── updated_at (timestamp)
```

### RLS Policies

```
ranking_members: SELECT public, INSERT/UPDATE/DELETE authenticated (user)
ranking_matches: SELECT public, INSERT/UPDATE/DELETE authenticated (user)
ranking_snapshots: SELECT public, INSERT/UPDATE/DELETE (admin only)
sessions: SELECT public, INSERT public, UPDATE/DELETE (admin only)
audit_events: SELECT (admin only), INSERT authenticated
ranking_categories: SELECT public, INSERT/UPDATE/DELETE (admin only)
ranking_settings: SELECT own record, INSERT/UPDATE own record
users: SELECT (admin only), INSERT/UPDATE/DELETE (admin only)
```

---

## Task Breakdown by Phase

### Phase 1: Foundation (Tasks 1-8)

Setup Next.js project, Supabase, env config, and types.

**Task 1: Initialize Next.js 15 App Router project**
- Create new Next.js project with `create-next-app`
- Remove Vite/Firebase dependencies
- Set up TypeScript strict mode
- Configure path aliases (`@/*`)
- Copy over preserved logic files (core.ts, rankingStats.ts, telegram.ts, hash.ts, analytics.ts)

**Task 2: Set up Supabase project & database schema**
- Create Supabase project
- Run SQL migrations to create all tables (users, ranking_members, ranking_matches, etc.)
- Set up RLS policies
- Generate TypeScript types from Supabase schema (`supabase gen types`)

**Task 3: Create environment config & Supabase client**
- Copy `.env.example` → `.env.local` with Supabase keys
- Create `lib/supabase.ts` with Supabase client initialization
- Create `env.ts` config loader (migrate from Vite env format to Next.js)
- Ensure feature flags work (telegram, court count, round result)

**Task 4: Create database utility functions & types**
- Create `lib/db/` directory with functions for each table
- `lib/db/users.ts` — getUserByUsername, updateUserPassword, getUserById, etc.
- `lib/db/ranking.ts` — getRankingMembers, getRankingMatches, createMatch, etc.
- `lib/db/sessions.ts` — saveDailySummary, getRecentSessions, etc.
- `lib/db/audit.ts` — trackAuditEvent, getAuditEvents
- `lib/db/categories.ts` — getRankingCategories
- Export all types from `lib/db/index.ts`

**Task 5: Implement authentication middleware**
- Create `middleware.ts` for route protection
- Create session storage (JWT in httpOnly cookie or custom session)
- Create `lib/auth.ts` with login/logout/getCurrentUser functions
- Create `lib/authServer.ts` for server-side auth checks
- Implement role-based access control (admin middleware)

**Task 6: Replace Analytics (Firebase → Supabase)**
- Migrate `lib/analytics.ts` to use Supabase `audit_events` table
- Keep same function signatures: `trackEvent`, `trackPageView`, `trackRouteChange`, `setUserProperties`
- Store user properties in audit_events.user_properties (jsonb)

**Task 7: Create root layout & setup providers**
- Create `app/layout.tsx` with Next.js metadata, fonts
- Add i18next provider for Vietnamese translations
- Add Toast/notification provider (keep Ant Design or migrate to Shadcn)
- Set up error boundary component

**Task 8: Create placeholder pages for all routes**
- Create page files (empty) for all routes:
  - `app/page.tsx` (/)
  - `app/login/page.tsx` (/login)
  - `app/dashboard/ranking/page.tsx`
  - `app/dashboard/audit/page.tsx`
  - `app/dashboard/users/page.tsx`
  - `app/ranking/page.tsx`
  - `app/ranking/login/page.tsx`

**Checkpoint 1: Foundation Complete**
- [ ] Next.js builds without errors
- [ ] Supabase schema created and RLS policies applied
- [ ] Environment config loads correctly
- [ ] Database functions testable (manual Supabase console test)
- [ ] Auth middleware can check login status

---

### Phase 2: Core Authentication & Cost Calculator (Tasks 9-15)

Implement login system and port the main cost calculator page.

**Task 9: Implement login page (`/login`)**
- Create `app/login/page.tsx` (Client Component)
- Create `app/components/LoginForm.tsx` with username/password fields
- Create Server Action `lib/auth/loginAction.ts` for authentication
- Validate credentials against users table (MD5 hash comparison)
- Set session cookie on success
- Redirect to `/` on success
- Show error message on failure

**Task 10: Implement logout & session management**
- Create `lib/auth/logoutAction.ts` Server Action
- Create `lib/auth/getCurrentUser.ts` for server-side user retrieval
- Create `app/api/auth/logout/route.ts` for session clearing
- Add logout button to all pages (in header/nav)

**Task 11: Port cost calculator page (`/`)**
- Create `app/page.tsx` (Client Component)
- Copy all components from current src:
  - ExpensesSection
  - PlayersSection
  - ResultCard
  - ConfigSidebar
  - SessionsModal
  - ChangePasswordModal
- Keep all business logic from `src/lib/core.ts` (no changes)
- Wire up state management (useState for inputs, useMemo for calculations)
- Replace Firebase calls with Supabase equivalents
- Keep localStorage for draft state (courtFeeInput, bulkInput, etc.)

**Task 12: Create components for cost calculator**
- Create `app/components/ExpensesSection.tsx`
- Create `app/components/PlayersSection.tsx`
- Create `app/components/ResultCard.tsx`
- Create `app/components/ConfigSidebar.tsx`
- Create `app/components/SessionsModal.tsx`
- Create `app/components/ChangePasswordModal.tsx`
- Keep styling identical to current (Tailwind + Ant Design)

**Task 13: Implement session management (save/load recent sessions)**
- Create Server Actions: `lib/actions/sessions.ts`
  - `saveDailySummary()` — save to sessions table
  - `getRecentSessions()` — fetch from sessions table with LIMIT
  - `removeSession()` — delete session (admin only)
- Wire up in cost calculator page
- Keep Telegram notification calls (`lib/telegram.ts`)

**Task 14: Implement change password flow**
- Create Server Action `lib/auth/changePasswordAction.ts`
- Verify current password matches stored hash
- Hash new password with MD5 and update users table
- Return success/error to modal
- Wire up ChangePasswordModal

**Task 15: Migrate localStorage drafts to Supabase (optional for Phase 2)**
- Create `user_drafts` table (id, user_id, draft_type, data, updated_at)
- Create Server Action `lib/actions/drafts.ts` for save/load
- OR keep localStorage for drafts (simpler, acceptable)
- Recommendation: Keep localStorage for Phase 2, migrate in Phase 3

**Checkpoint 2: Core App Working**
- [ ] `/` loads and cost calculation works
- [ ] `/login` authentication works
- [ ] Sessions save to Supabase and load
- [ ] Password change works
- [ ] All links/buttons present but not all wired yet
- [ ] No Firebase references remain in cost calculator code

---

### Phase 3: Ranking System (Tasks 16-25)

Port the entire ranking system with database backing.

**Task 16: Create ranking types & utility functions**
- Copy `src/components/ranking/types.ts` to `app/components/ranking/types.ts`
- Copy `src/lib/rankingStats.ts` (Glicko2 — unchanged)
- Copy `src/lib/rankingLevel.ts` (unchanged)
- Create `lib/ranking/stats.ts` — wrapper around rankingStats with Supabase queries
- Copy all ranking components (MembersPanel, MatchFormPanel, RankingPanel, etc.)

**Task 17: Implement ranking data queries**
- Create `lib/ranking/members.ts`
  - `getRankingMembers()` — fetch from DB
  - `createRankingMember()` — Server Action
  - `updateRankingMember()` — Server Action
  - `deleteRankingMember()` — Server Action (admin only)
- Create `lib/ranking/matches.ts`
  - `getRankingMatches()` — fetch from DB
  - `createRankingMatch()` — Server Action
  - `updateRankingMatch()` — Server Action
  - `deleteRankingMatch()` — Server Action
- Create `lib/ranking/snapshots.ts`
  - `getLatestRankingSnapshot()` — fetch from DB
  - `saveRankingSnapshot()` — Server Action (admin only)

**Task 18: Create ranking settings table & queries**
- Create `ranking_settings` table in Supabase
- Create `lib/ranking/settings.ts`
  - `getRankingSettings(userId)` — load user's tau, penaltyCoefficient, metricVisibility
  - `updateRankingSettings()` — Server Action
- Replace localStorage ranking settings with DB-backed storage
- Keep defaults in `DEFAULT_RANKING_SETTINGS`

**Task 19: Implement RankingPage component (`/dashboard/ranking`)**
- Create `app/dashboard/ranking/page.tsx` (Client Component, interactive)
- Copy `src/components/RankingPage.tsx` logic
- Replace all localStorage calls with Supabase queries
- Replace all Firebase subscriptions with Supabase realtime or polling
- Implement all sub-components:
  - MembersPanel (CRUD for members)
  - MatchFormPanel (add singles/doubles matches)
  - RankingPanel (display ranked players with stats)
  - RankingSidebar (settings, navigation)

**Task 20: Implement match form & validation**
- Create `app/components/ranking/MatchFormPanel.tsx`
- Copy logic from current component
- Wire up `createRankingMatch()` Server Action
- Validate: type (singles/doubles), team sizes, sets, date
- Update local state on success
- Keep Glicko2 stats calculation in-place (unchanged)

**Task 21: Implement member management**
- Create `app/components/ranking/MembersPanel.tsx`
- Copy logic from current component
- Wire up `createRankingMember()`, `updateRankingMember()`, `deleteRankingMember()` Server Actions
- Validate member names, prevent duplicates
- Support level editing (Yo, Lo, etc.)
- Auto-build members from matches on save

**Task 22: Implement ranking display & statistics**
- Create `app/components/ranking/RankingPanel.tsx`
- Fetch members and matches from DB
- Calculate Glicko2 stats using `rankingStats.ts` (unchanged)
- Display ranked players with:
  - Rank, name, level
  - Skill rating, rating deviation, volatility
  - Win rate, activity metrics
  - Configurable metric visibility
- Support toggling metric visibility

**Task 23: Implement player stats modal**
- Create `app/components/ranking/PlayerStatsModal.tsx`
- Copy current component
- Display detailed stats for a selected player
- Show match history, recent performance trends
- Show Glicko2 algorithm parameters

**Task 24: Implement public ranking view (`/ranking`)**
- Create `app/ranking/page.tsx` (Server Component for read-only)
- Fetch members and matches from DB
- Calculate stats
- Display ranking table (no edit buttons)
- Add login button (links to `/ranking/login`)

**Task 25: Implement ranking login page (`/ranking/login`)**
- Create `app/ranking/login/page.tsx` (Client Component)
- Same as `/login` but redirects to `/dashboard/ranking` on success
- Or reuse LoginForm component

**Checkpoint 3: Ranking System Complete**
- [ ] `/dashboard/ranking` loads and displays members/matches
- [ ] Can add/edit/delete members
- [ ] Can add/edit/delete matches
- [ ] Glicko2 stats calculate correctly
- [ ] `/ranking` (public) shows read-only ranking
- [ ] Member CRUD works with DB persistence
- [ ] Settings (tau, penalty) load/save from DB

---

### Phase 4: Admin Pages (Tasks 26-30)

Implement admin-only pages and features.

**Task 26: Implement audit page (`/dashboard/audit`)**
- Create `app/dashboard/audit/page.tsx` (Server Component, admin-only)
- Copy `src/components/AuditPage.tsx` logic
- Fetch from `audit_events` table (admin-only RLS)
- Display table with:
  - Event name, timestamp, user, event type
  - Params, user properties, page path
  - Filter/sort by date, user, event type
- Keep analytics tracking as-is (fired from client)

**Task 27: Implement user management page (`/dashboard/users`)**
- Create `app/dashboard/users/page.tsx` (Client Component, admin-only)
- Copy `src/components/UserManagementPage.tsx` logic
- Fetch all users from DB
- CRUD operations:
  - Add user (username, initial password, role)
  - Edit user (username, role, disabled status)
  - Delete user
  - Reset password
- Hash password with MD5 before storing
- Wire up Server Actions for each operation

**Task 28: Implement ranking categories page (`/dashboard/categories`)**
- Create `app/dashboard/categories/page.tsx` (Client Component, admin-only)
- Copy `src/components/CategoryManagementPage.tsx` logic
- Fetch from `ranking_categories` table
- CRUD for categories:
  - Create, edit, delete categories
  - Set display name and order
- Categories used for... (check current app)

**Task 29: Create admin middleware & route protection**
- Create `lib/middleware/adminOnly.ts` middleware
- Protect routes:
  - `/dashboard/audit` → admin only
  - `/dashboard/users` → admin only
  - `/dashboard/categories` → admin only
- Return 403 if not admin
- Redirect to login if not authenticated

**Task 30: Implement Telegram webhook (if needed)**
- Check if Telegram bot sends updates to app
- If yes: create `app/api/telegram/route.ts` webhook handler
- Handle bot updates for notifications/commands
- Keep `lib/telegram.ts` for sending notifications (unchanged)

**Checkpoint 4: Admin Features Complete**
- [ ] `/dashboard/audit` shows audit events (admin only)
- [ ] `/dashboard/users` allows user CRUD (admin only)
- [ ] `/dashboard/categories` manages ranking categories (admin only)
- [ ] Route protection enforced (non-admin redirected to login)
- [ ] All Server Actions for mutations implemented

---

### Phase 5: Integration & Testing (Tasks 31-35)

Wire everything together, migrate data, test end-to-end.

**Task 31: Create data migration script**
- Firebase → Supabase migration:
  - Export Firestore collections as JSON
  - Write Node.js migration script
  - Insert into Supabase tables (users, ranking_members, ranking_matches, sessions, audit_events)
  - Validate data integrity
  - Test on staging database first

**Task 32: Test all routes & user flows**
- Test public routes: `/` (cost calculator), `/ranking` (public ranking)
- Test guest flows: use app without login
- Test authenticated flows: login → `/dashboard/ranking` → edit/create/delete
- Test admin flows: `/dashboard/audit`, `/dashboard/users`, `/dashboard/categories`
- Test role enforcement: non-admin cannot access admin pages
- Test password change, logout, session persistence

**Task 33: Set up Supabase Realtime subscriptions (if needed)**
- Check if current app needs real-time updates
- If yes: implement realtime listeners for ranking data
- Otherwise: keep polling (simpler for MVP)
- Recommendation: Use polling for Phase 1, add realtime in Phase 2 if needed

**Task 34: Create seed script for development**
- Create `scripts/seed-db.mjs` for dev data
- Insert test users (admin, member)
- Insert sample ranking members and matches
- Insert sample audit events
- Run on fresh `npm run dev`
- Make idempotent (check if data exists before inserting)

**Task 35: Performance optimization & testing**
- Run Lighthouse audit
- Optimize images (if any)
- Test Core Web Vitals (LCP, FID, CLS)
- Load test with realistic data sizes
- Test on mobile (responsive design)

**Checkpoint 5: Integration Complete**
- [ ] All data migrated from Firebase to Supabase
- [ ] End-to-end tests pass (public, user, admin flows)
- [ ] No console errors or warnings
- [ ] Lighthouse score > 90
- [ ] Performance acceptable (<3s LCP)

---

### Phase 6: Deployment (Tasks 36-38)

Prepare for production deployment on Vercel.

**Task 36: Set up Vercel deployment**
- Create `vercel.json` (optional configuration)
- Set up environment variables in Vercel dashboard
- Connect GitHub repo to Vercel
- Enable automatic deployments on push to `main`
- Test preview deployments

**Task 37: Configure production Supabase**
- Create production Supabase project
- Replicate schema from dev database
- Enable backups and monitoring
- Set up SSL certificates
- Test prod database connection from Vercel

**Task 38: Final checklist & launch**
- [ ] All tests pass (unit + integration)
- [ ] No security issues (audit dependencies)
- [ ] Error tracking set up (Sentry or similar)
- [ ] Analytics working (Telegram notifications, audit logs)
- [ ] Rollback plan documented (if needed)
- [ ] User data backed up
- [ ] Deploy to production

**Checkpoint 6: Ready for Launch**
- [ ] App deployed to Vercel
- [ ] Production database working
- [ ] All URLs reachable and functional
- [ ] Admin features accessible
- [ ] Logging/monitoring active

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during Firebase → Supabase migration | **High** | Run migration on copy of data first, validate row counts |
| Auth logic bugs (MD5 hashing, password verification) | **High** | Add unit tests for auth functions before Phase 2 |
| Ranking stats calculation changes (Glicko2) | **High** | Preserve `rankingStats.ts` unchanged, add tests |
| Role enforcement not enforced on server | **Medium** | Implement admin middleware before Phase 4 |
| RLS policies too permissive | **Medium** | Audit RLS policies before production, test each policy |
| Performance regression from Firebase → DB queries | **Medium** | Profile and optimize queries in Phase 5 |
| User session persistence lost | **Low** | Add session tests, use httpOnly cookies |
| Vietnamese text encoding issues | **Low** | Test UTF-8 in Supabase, validate i18n strings |

---

## Open Questions

1. **Custom Auth vs Supabase Auth?** Currently proposing custom (MD5 in DB). Confirm scope.
2. **Realtime requirements?** Current app uses polling (RankingPage useEffect). Add Supabase Realtime or keep polling?
3. **Telegram webhook?** Does bot send messages back to app? Or only app sends to bot?
4. **Deployment URL?** Keep github.io or move to vercel.app? (affects base path)
5. **Feature flags in production?** Should feature flags (telegram, court count) be configurable in Supabase, or stay in env?

---

## Estimated Effort

- **Phase 1 (Foundation):** 8 tasks, ~16-24 hours
- **Phase 2 (Auth + Cost Calc):** 7 tasks, ~14-21 hours
- **Phase 3 (Ranking):** 10 tasks, ~30-50 hours (most complex)
- **Phase 4 (Admin):** 5 tasks, ~10-15 hours
- **Phase 5 (Integration):** 5 tasks, ~10-15 hours
- **Phase 6 (Deployment):** 3 tasks, ~5-10 hours

**Total: 38+ tasks, ~85-135 hours (~2-3 weeks full-time)**

---

## Next Steps

1. **Finalize scope** — Review open questions with human
2. **Create task list** — Break each task into Verifiable subtasks in TaskCreate
3. **Start Phase 1** — Initialize Next.js and Supabase schema
4. **Iterate** — Complete each phase, checkpoint after each
5. **Deploy** — Production launch on Vercel

---

## File Structure (Post-Migration)

```
badguys-next/
├── app/
│   ├── layout.tsx                          # Root layout
│   ├── page.tsx                            # Cost calculator (/)
│   ├── login/
│   │   └── page.tsx                        # Login (/login)
│   ├── ranking/
│   │   ├── page.tsx                        # Public ranking (/ranking)
│   │   └── login/
│   │       └── page.tsx                    # Ranking login (/ranking/login)
│   ├── dashboard/
│   │   ├── ranking/
│   │   │   └── page.tsx                    # Ranking dashboard (/dashboard/ranking)
│   │   ├── audit/
│   │   │   └── page.tsx                    # Audit log (/dashboard/audit)
│   │   ├── users/
│   │   │   └── page.tsx                    # User management (/dashboard/users)
│   │   └── categories/
│   │       └── page.tsx                    # Category management (/dashboard/categories)
│   ├── api/
│   │   ├── auth/
│   │   │   └── logout/
│   │   │       └── route.ts                # Logout API
│   │   └── telegram/
│   │       └── route.ts                    # Telegram webhook (optional)
│   └── components/
│       ├── LoginForm.tsx
│       ├── ExpensesSection.tsx
│       ├── PlayersSection.tsx
│       ├── ResultCard.tsx
│       ├── ConfigSidebar.tsx
│       ├── SessionsModal.tsx
│       ├── ChangePasswordModal.tsx
│       ├── ranking/
│       │   ├── MembersPanel.tsx
│       │   ├── MatchFormPanel.tsx
│       │   ├── RankingPanel.tsx
│       │   ├── RankingSidebar.tsx
│       │   ├── PlayerStatsModal.tsx
│       │   └── types.ts
│       ├── AuditPage.tsx
│       ├── UserManagementPage.tsx
│       └── CategoryManagementPage.tsx
├── lib/
│   ├── supabase.ts                         # Supabase client
│   ├── auth.ts                             # Auth helpers
│   ├── authServer.ts                       # Server-side auth
│   ├── db/
│   │   ├── index.ts
│   │   ├── users.ts
│   │   ├── ranking.ts
│   │   ├── sessions.ts
│   │   ├── audit.ts
│   │   └── categories.ts
│   ├── ranking/
│   │   ├── members.ts
│   │   ├── matches.ts
│   │   ├── snapshots.ts
│   │   ├── settings.ts
│   │   ├── stats.ts
│   │   └── index.ts
│   ├── actions/
│   │   ├── sessions.ts
│   │   ├── ranking.ts
│   │   └── admin.ts
│   ├── middleware/
│   │   ├── adminOnly.ts
│   │   └── authRequired.ts
│   ├── core.ts                             # (unchanged from original)
│   ├── rankingStats.ts                     # (unchanged from original)
│   ├── telegram.ts                         # (unchanged from original)
│   ├── hash.ts                             # (unchanged from original)
│   ├── analytics.ts                        # (migrated to Supabase)
│   ├── constants.ts
│   ├── platform.ts
│   └── env.ts
├── i18n/
│   ├── index.ts                            # i18next config
│   └── resources.ts                        # Vietnamese strings
├── middleware.ts                           # Next.js middleware for auth
├── .env.example
├── .env.local
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.ts
├── package.json
├── vercel.json
└── scripts/
    └── seed-db.mjs                         # Dev data seeder

```

