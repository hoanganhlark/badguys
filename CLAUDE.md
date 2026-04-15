# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server (base path `/`)
- `npm run build` — TypeScript check + Vite production build (base path `/badguys/`)
- `npm run preview` — Preview production build locally
- `npm test` — Run Vitest test suite

## Architecture

**BadGuys** is a single-page React + TypeScript app for splitting badminton session costs. Deployed to GitHub Pages, with Firebase Firestore for session history and Telegram Bot API for notifications.

### Key files

- `src/App.tsx` — Root component; owns all state, wires together calculation and UI
- `src/lib/core.ts` — Core business logic: `parsePlayersBulk()`, `calculateResult()`, `buildSummaryText()`, `buildSessionPayload()`
- `src/types.ts` — Shared types: `Player`, `AppConfig`, `CalcResult`, `SessionRecord`
- `src/env.ts` — Parses `VITE_*` env vars with fallback defaults
- `src/lib/firebase.ts` — Firestore init and session CRUD
- `src/lib/telegram.ts` — Async Telegram notification (silent failure on error)
- `src/lib/platform.ts` — localStorage, clipboard, URL params, device detection
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

### State management

Pure React hooks (`useState`, `useEffect`, `useMemo`). No external state library. `localStorage` persists config, input drafts, and admin flag across reloads.

### Admin mode

Enabled via URL param `?r=@` or toggled in UI. Unlocks session delete and suppresses Telegram notifications.

## Environment variables

Copy `.env.example` to `.env.local` for local development. Required secrets for production (set as GitHub Actions secrets/variables):
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` — Firestore access
- `VITE_TELEGRAM_BOT_TOKEN`, `VITE_TELEGRAM_GROUP_CHAT_ID` — Notifications

Optional overrides: female max fee, tube price, set price, court fee defaults.

## Workflow

After completing each logical unit of work, commit the changes with a clear, descriptive message so that individual changes are easy to identify and revert if needed. Commit at natural checkpoints — e.g. after adding a feature, fixing a bug, or refactoring a module — rather than batching everything at the end.

## Deployment

CI/CD via `.github/workflows/deploy-pages.yml`. Pushes to `main` trigger a build and deploy to GitHub Pages. Build version tag is set dynamically as `vYYYY.MM.DD.RUN_NUMBER`.
