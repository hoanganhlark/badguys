# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server (base path `/`)
- `npm run build` — TypeScript check + Vite production build (base path `/badguys/`)
- `npm run preview` — Preview production build locally
- `npm test` — Run Vitest test suite in watch mode; use `npm test -- --run` for single run
- `npm test -- path/to/file.test.ts` — Run a specific test file
- `npm run seed:users` — Seed dev-users collection in Firestore with default test accounts (requires `.env.local`)
- `npm run migrate:admin-bi` — Migrate all admin user references to 'bi' username in dev-users and dev-matches collections

## Architecture

**BadGuys** is a single-page React + TypeScript app for splitting badminton session costs. Includes a ranking tracker modal for tournament results and player rankings (client-side, localStorage-backed). Features user authentication, role-based access control (admin/user), and Firebase Firestore for session history, user management, and Telegram Bot API for notifications.

### Key files

- `src/App.tsx` — Root component; owns all state, wires together calculation and UI; handles authentication flow
- `src/context/AuthContext.tsx` — Authentication state management; login, logout, and role/user data
- `src/components/LoginModal.tsx` — Login form modal; handles username/password authentication
- `src/components/auth/AdminRoute.tsx` — Protected route component requiring admin role
- `src/components/auth/ProtectedRoute.tsx` — Protected route component requiring authentication
- `src/lib/core.ts` — Core business logic: `parsePlayersBulk()`, `calculateResult()`, `buildSummaryText()`, `buildSessionPayload()`
- `src/types.ts` — Shared types: `Player`, `AppConfig`, `CalcResult`, `SessionRecord`, `RankingSettings`, `RankingMetricVisibility`
- `src/env.ts` — Parses `VITE_*` env vars with fallback defaults
- `src/lib/firebase.ts` — Firestore init, session CRUD, user management (auth, password), and subscriptions
- `src/lib/telegram.ts` — Async Telegram notification (silent failure on error)
- `src/lib/platform.ts` — localStorage, clipboard, URL params, device detection
- `src/lib/rankingStats.ts` — Glicko2-based rating calculations for tournament rankings; computes skill rating, rating deviation, volatility, and activity metrics
- `src/components/RankingPage.tsx` — Ranking system: manages member CRUD, match recording (singles/doubles), and ranking display; supports public guest view and authenticated user access
- `src/i18n/index.ts` — i18next configuration; manages language initialization, fallback (Vietnamese), and localStorage persistence
- `src/i18n/resources.ts` — Internationalization strings (Vietnamese only)
- `vite.config.ts` — Base path is `/` in dev, `/badguys/` in production build

### Cost calculation model

Players fall into four categories handled by `calculateResult()` in `src/lib/core.ts`:
1. **Set players** — fixed rate per set, excluded from shared pool
2. **Custom-fee players** — fixed amount, excluded from shared pool
3. **Female players** — share remaining cost but capped at a configurable max (default 60k)
4. **Male players** — share remaining cost equally

### Player input syntax (parsed by `parsePlayersBulk()`)

Single textarea; each line is one player. Supported modifiers:
- `n` suffix → female (e.g. `Alice n`)
- `2s` suffix → 2-set player (e.g. `Bob 2s`)
- `30k` suffix → custom fixed fee
- `+10k` suffix → surcharge added on top
- Numbered lists (`1. Name`, `2/ Name`) are stripped automatically

### Authentication & Routes

User authentication via `AuthContext` (login with username/password, MD5-hashed passwords stored in Firestore).

**Routes:**
- `/` — Main cost calculator (guest accessible)
- `/login` — Login form
- `/dashboard/ranking` — Ranking dashboard (authenticated users only)
- `/ranking` — Public ranking view (guest accessible, no member/match edit)
- `/ranking/login` — Login form on public ranking page
- `/users` — User management page (admin only)

**Roles:**
- `admin` — Can manage users, edit all members/matches, delete any content
- `user` — Can record matches, manage own matches, view rankings

### Ranking system

Player ratings use the **Glicko2** algorithm (a Bayesian rating system accounting for rating deviation and volatility). Matches are processed periodically to update ratings. Match records include `playedAt` (timestamp) and `durationMinutes` (optional match length) for more accurate rating updates. Configurable via `RankingSettings`: tau parameter (player rating volatility) and penaltyCoefficient (activity-based penalties).

**Firestore collections** are automatically prefixed with "dev-" in development mode (when `MODE=development`). Collection names: `ranking-members`, `ranking-matches`, `users`, `matches`. In production, collections use plain names without prefix.

### State management

Pure React hooks (`useState`, `useEffect`, `useMemo`) with i18next for internationalization. `localStorage` persists config, input drafts, members, matches, and language preference. Authentication state managed via `AuthContext`. App language is fixed to Vietnamese; language switching is not supported.

### Testing

Tests run via Vitest with jsdom environment (allows DOM testing in Node). Test setup imports `@testing-library/jest-dom` for DOM matchers. Add tests in `src/` with `.test.ts` or `.test.tsx` suffix.


## Environment variables

Copy `.env.example` to `.env.local` for local development.

**Required for Firestore access:**
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` — Firestore authentication and database
- `VITE_FIREBASE_COLLECTION_SESSIONS` — Sessions collection name (default: "sessions"; auto-prefixed with "dev-" in development mode)

**Required for Telegram notifications:**
- `VITE_TELEGRAM_BOT_TOKEN`, `VITE_TELEGRAM_GROUP_CHAT_ID` — Bot token and target group

**Cost calculation configuration (optional defaults provided):**
- `VITE_BADGUY_FEMALE_MAX` — Female player cost cap in thousands (default: 60)
- `VITE_BADGUY_TUBE_PRICE` — Tube price in thousands (default: 290)
- `VITE_BADGUY_SET_PRICE` — Price per set in thousands (default: 12)
- `VITE_BADGUY_SHUTTLES_PER_TUBE` — Shuttles per tube for calculations (default: 12)

**Feature toggles:**
- `VITE_BADGUY_ROUND_RESULT` — Round cost results to nearest 1k (default: true)
- `VITE_BADGUY_ENABLE_COURT_COUNT` — Show court count input field (default: true)
- `VITE_BADGUY_ENABLE_TELEGRAM_NOTIFICATION` — Enable Telegram notifications (default: true)

**Other:**
- `VITE_APP_VERSION` — Version string displayed in UI (auto-generated in CI)

## Workflow

After completing each logical unit of work, commit the changes with a clear, descriptive message so that individual changes are easy to identify and revert if needed. Commit at natural checkpoints — e.g. after adding a feature, fixing a bug, or refactoring a module — rather than batching everything at the end.

## Deployment

CI/CD via `.github/workflows/deploy-pages.yml`. Pushes to `main` trigger a build and deploy to GitHub Pages. Build version tag is set dynamically as `vYYYY.MM.DD.RUN_NUMBER`.
