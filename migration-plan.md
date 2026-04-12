# BadGuys App Migration Plan (Simplified)

## 1. Current Architecture Overview

### Current runtime
- One static page in `index.html`.
- All behavior is in `assets/app.js` with global functions and inline events.
- Firebase setup and Firestore access are in `assets/firebase.js`.
- Styling is Tailwind CDN + `assets/styles.css`.
- Env placeholders are injected into HTML (`window.BADGUY_ENV`).

### Current files
- `index.html`: full UI and env bootstrap.
- `assets/app.js`: parsing, calculations, summary, copy, toast, modal/sidebar, Telegram notify.
- `assets/firebase.js`: Firestore init and `save/get/remove session` methods.
- `assets/styles.css`: custom visuals.
- `scripts/inject-env.ps1`: local placeholder injection.
- `.env.example`: runtime values and defaults.

### Behavior that must stay identical
- Player parsing rules (`n`, `2s`, `30k`, `+10k`).
- Tag click cycle: male -> female -> set(1) -> male.
- Cost split logic (female cap, set pricing, custom fee exclusion, round option).
- Same summary output format and ordering.
- Same Telegram triggers (visit once/day, copy event).
- Same Firestore payload/date-key behavior.
- Same reset confirmation UX and history modal flows.

## 2. Proposed React + Vite + TypeScript Architecture

### Stack
- Vite + React + TypeScript.
- Tailwind via npm config (not CDN), keep current UI look.
- Firebase modular SDK.
- Vitest + React Testing Library.

### Design principle
- Keep it simple: one feature-oriented `App` with small components and a few utility files.
- Move pure business logic to utilities first, then wire React UI around it.

## 3. Simplified Folder Structure

```text
badguy_app/
  src/
    main.tsx
    App.tsx
    styles.css
    types.ts
    env.ts
    components/
      ExpensesSection.tsx
      PlayersSection.tsx
      ResultCard.tsx
      ConfigSidebar.tsx
      SessionsModal.tsx
      Toast.tsx
    lib/
      core.ts
      platform.ts
      firebase.ts
      telegram.ts
    tests/
      setup.ts
      calculations.test.ts
      parser.test.ts
      summary.test.ts
```

This keeps the project easy to navigate while still separating UI from core logic.

## 4. Component Breakdown (Vanilla -> React)

- `App.tsx`
- Holds top-level state and composes all sections.

- `ExpensesSection.tsx`
- Court fee + shuttle count inputs.

- `PlayersSection.tsx`
- Bulk textarea, player counter, tags (toggle/remove).

- `ResultCard.tsx`
- Total, male fee, female/set display, copy button.

- `ConfigSidebar.tsx`
- Round toggle and pricing config inputs.

- `SessionsModal.tsx`
- Load/display/copy/delete recent sessions.

- `Toast.tsx`
- Reusable toast display.

## 5. State Management Approach

- Use `useState` in `App.tsx` for:
- inputs (`courtFee`, `shuttleCount`)
- `players`
- `config`
- UI state (`sidebarOpen`, `modalOpen`, `toast`)
- session list loading/error data

- Use `useMemo` for derived calculation result.
- Persist config and visit-day key in localStorage with existing keys.
- No Context initially (can add later only if needed).

## 6. Mapping Existing Logic to New Files

### File mapping
- `index.html` -> `App.tsx` + components.
- `assets/app.js` -> `components/*` + `lib/*`.
- `assets/firebase.js` -> `lib/firebase.ts`.
- `assets/styles.css` -> `src/styles.css`.
- env placeholder injection -> Vite `.env` and `env.ts`.

### Function mapping
- Parsing, calculations, summary text, and format helpers -> `lib/core.ts`.
- Clipboard fallback logic, localStorage helpers, and device/date helpers -> `lib/platform.ts`.
- Firebase session API -> `lib/firebase.ts`.
- Telegram notify helpers -> `lib/telegram.ts`.

## 7. Preserve 100% Business Logic Strategy

- Keep formulas and parsing regex logic unchanged first.
- Keep same localStorage keys and Firestore payload fields.
- Keep same message text and summary layout.
- Add parity tests for parser, calculation, and summary before UI refactor.
- Only refactor internals after parity passes.

## 8. Duplicate Logic and Refactor Plan

### Duplicate logic found
- Clipboard behavior appears in multiple places.
- Currency formatting has overlapping functions.
- Player grouping logic repeats in calculate and summary steps.

### Simple refactor
- Keep one `core.ts` file for parsing + calculation + summary + formatting.
- Keep one `platform.ts` file for clipboard + storage + device/date helpers.
- Keep Firebase and Telegram separate for clear external integration boundaries.

## 9. Testing Strategy

### Framework
- Vitest + React Testing Library + jsdom.

### Test structure
- `src/tests/parser.test.ts`
- `src/tests/calculations.test.ts`
- `src/tests/summary.test.ts`
- add component tests after core parity is stable.

### Gradual coverage plan
1. Lock parser/calculation/summary with unit tests.
2. Add tests for config persistence and reset behavior.
3. Add component tests for input -> result -> copy flow.
4. Add Firebase/Telegram service tests with mocks.

## 10. Migration Steps (Simplified)

1. Create Vite React TypeScript project in current repo.
2. Add Tailwind (npm), Vitest, and RTL setup.
3. Port env handling to `.env` + `env.ts` with same defaults.
4. Port pure logic to `lib/core.ts` and platform/browser helpers to `lib/platform.ts`.
5. Add parity tests for these core modules.
6. Build React components matching current UI and wire existing logic.
7. Port Firebase and Telegram integrations.
8. Implement modal/sidebar/back-button and toast behavior.
9. Run full regression checklist to confirm identical behavior.
10. Remove legacy global/inline JS after parity is confirmed.

## 11. Done Criteria

- App runs on React + Vite + TypeScript.
- User flows and outputs remain unchanged.
- Core business logic has parity tests.
- Env, Firebase, and Telegram continue to work.

---

Step 1 planning document only. No implementation code yet.
