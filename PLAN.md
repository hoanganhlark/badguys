# Implementation Plan: Refactor Sessions Loading & Standardize Loading States

## Overview

This plan refactors the session data loading in App.tsx to use the existing React Query pattern (`useSessions` hook) instead of manual state management, and ensures all async-data-loading components display consistent loading spinners without layout shifts. Firebase has already been completely removed from the codebase.

**Key findings:**
- Firebase/Firestore: Already fully removed ✓
- Sessions loading: Currently manual state in App.tsx (should use `useSessions` hook)
- Sessions modal: Already supports loading state via props, displays Antd `Spin`
- Query hooks: Already exist and follow a pattern (useAuditEvents, useUsers, useRankingCategories, useRankingMembers)
- Loading spinners: Already used in some pages (AuditPage, UserManagementPage, CategoryManagementPage)

## Architecture Decisions

1. **Use existing query patterns**: Leverage `useSessions` hook already defined in `src/hooks/queries/useSessions.ts` instead of manual state
2. **Consistent spinner component**: Use Antd `Spin` (already imported/used across the codebase) for all loading states
3. **No breaking changes**: Keep SessionsModal component API the same; just refactor the parent (App.tsx) to use hooks
4. **Preserve error handling**: Maintain current error messages and recovery flows
5. **Query caching**: Use historical data defaults (10min stale time, no auto-refetch) for sessions

## Detailed Task Breakdown

### Phase 1: Refactor Sessions Data Loading

#### Task 1: Replace Manual Session State with `useSessions` Hook
**Description:** Remove manual state management from App.tsx (sessionsLoading, sessionsError, sessions) and replace with the `useSessions()` hook. This standardizes sessions fetching with the same React Query pattern used elsewhere.

**Files to modify:**
- `src/App.tsx` — Replace state and `loadLastSessions()` function with `useSessions()` hook

**Acceptance criteria:**
- [ ] `sessionsLoading`, `sessionsError`, `sessions` state removed from App.tsx
- [ ] `loadLastSessions()` function removed
- [ ] `useSessions()` hook imported and called in App.tsx
- [ ] SessionsModal receives loading, error, and sessions from hook
- [ ] `openSessionsModal()` calls hook's `refetch()` instead of `loadLastSessions()`
- [ ] Sessions removal still calls `removeSession()` and refetches
- [ ] No manual fetch calls remain; all go through React Query

**Verification:**
- [ ] `npm run build` succeeds with no TS errors
- [ ] Sessions modal opens and displays loading spinner while fetching
- [ ] Sessions list displays correctly after load completes
- [ ] Session removal triggers a refetch
- [ ] Error states display error message

**Dependencies:** None

**Estimated scope:** Small (1 file, ~20 lines changed)

---

#### Task 2: Update Error Messages and Logging
**Description:** Replace any remaining Firebase-related error messages with more generic text. Review console.warn logs for clarity.

**Files to modify:**
- `src/App.tsx` — Update error message keys that reference Firebase

**Acceptance criteria:**
- [ ] Error message `"app.loadSessionsFirebaseError"` replaced with neutral text (e.g., `"app.loadSessionsFailed"`)
- [ ] Error message `"app.toastFirebaseNotReadyDelete"` replaced with neutral text
- [ ] Console warnings are clear and actionable
- [ ] Translation strings reviewed in `src/i18n/resources.ts` for Firebase references

**Verification:**
- [ ] Grep for "firebase" in src/ returns no results (except comments)
- [ ] Error messages render correctly in UI when Supabase is unavailable

**Dependencies:** Task 1

**Estimated scope:** XS (1-2 files, ~5 lines changed)

---

### Phase 2: Standardize Loading States Across All Async Components

#### Task 3: Audit All Async-Data-Loading Components
**Description:** Review all components that fetch data asynchronously and verify they display loading spinners. Components to check: AuditPage, UserManagementPage, CategoryManagementPage, RankingPage (and sub-contexts).

**Acceptance criteria:**
- [ ] Create a list of all components that use React Query hooks or fetch data
- [ ] Document which already have loading spinners (expected: AuditPage, UserManagementPage, CategoryManagementPage)
- [ ] Document which are missing spinners (if any)
- [ ] Document loading state handling in context providers (RankingMembersContext, RankingMatchesContext)

**Verification:**
- [ ] All components with async data are identified
- [ ] Loading behaviors documented in inline comments

**Dependencies:** None

**Estimated scope:** XS (research/documentation only)

---

#### Task 4: Add Missing Loading Spinners to Components
**Description:** For any components identified in Task 3 that lack loading spinners, add Antd `Spin` component with consistent styling (e.g., centered, with optional tip text).

**Acceptance criteria:**
- [ ] Any component fetching data shows a `Spin` component during loading
- [ ] Spinner is centered and does not cause layout shift
- [ ] Spinner uses consistent styling across all components
- [ ] Spinner includes descriptive `tip` text from i18n
- [ ] Error state still displays (Alert component) without spinner

**Verification:**
- [ ] Manual browser test: Open each data-loading page and observe spinner appears
- [ ] No console warnings about missing translations

**Dependencies:** Task 3

**Estimated scope:** Small (0-3 files, depends on findings from Task 3)

---

#### Task 5: Standardize Loading State Display in Ranking Contexts
**Description:** Review RankingMembersContext and RankingMatchesContext for loading state. If not exposed, add `isLoading` flag from underlying queries so consuming components can display spinners.

**Files to review:**
- `src/features/ranking/context/RankingMembersContext.tsx`
- `src/features/ranking/context/RankingMatchesContext.tsx`

**Acceptance criteria:**
- [ ] RankingMembersContext exposes `isLoading` flag
- [ ] RankingMatchesContext exposes `isLoading` flag (if it fetches independently)
- [ ] Components consuming context can render spinners when loading
- [ ] No blocking spinners (data loads in background, UI remains interactive if possible)

**Verification:**
- [ ] Context type definitions updated if needed
- [ ] No TypeScript errors in consuming components

**Dependencies:** Task 3

**Estimated scope:** Small (2-4 files, adding 1-2 lines per context)

---

### Phase 3: Final Verification and Cleanup

#### Task 6: Type Safety and Build Verification
**Description:** Run TypeScript compiler and tests to ensure no errors introduced by refactoring.

**Acceptance criteria:**
- [ ] `npm run build` succeeds with no TS errors
- [ ] `npm test -- --run` passes all tests (or no test failures introduced)
- [ ] No unused imports remain
- [ ] Grep for "firebase" in src/ returns no results (except doc comments)

**Verification:**
- [ ] Run `tsc -b` and verify no errors
- [ ] Run tests and review results
- [ ] Inspect grep output

**Dependencies:** Tasks 1-5

**Estimated scope:** XS (verification only)

---

#### Task 7: Documentation and Commit
**Description:** Update comments and create commit message summarizing changes.

**Acceptance criteria:**
- [ ] Comments added to explain why `useSessions` hook is used in App.tsx
- [ ] Comments added to explain loading state patterns in any newly modified components
- [ ] Commit message follows project conventions
- [ ] Changes align with CLAUDE.md guidelines

**Verification:**
- [ ] Code review shows clear explanations for non-obvious patterns
- [ ] Commit message is concise and descriptive

**Dependencies:** Tasks 1-6

**Estimated scope:** XS (documentation only)

---

## Checkpoint: After Tasks 1-2 (Sessions Refactoring Complete)
- [ ] Sessions modal fully migrated to use React Query
- [ ] No manual session state in App.tsx
- [ ] Error messages are Firebase-free
- [ ] Sessions loading, display, and removal all work correctly

## Checkpoint: After Tasks 3-5 (Loading States Standardized)
- [ ] All async-loading components identified
- [ ] All components show loading spinners
- [ ] Context providers expose loading flags
- [ ] Loading spinners styled consistently

## Checkpoint: After Tasks 6-7 (Final Verification)
- [ ] Build succeeds, no type errors
- [ ] Tests pass
- [ ] Code is documented
- [ ] Ready to commit and merge

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Manual state removal breaks session flow | High | Task 1 includes comprehensive acceptance criteria; test in browser before proceeding |
| Missing loading spinners confuse users | Medium | Task 4 adds spinners to all async components; Task 6 verifies |
| Context loading flags not exposed | Medium | Task 5 explicitly checks and adds flags if needed |
| Unused dependencies remain | Low | Task 6 runs full build and grep for firebase references |

---

## Testing Strategy

**Phase 1 (Sessions):**
- [ ] Open sessions modal manually, verify spinner appears during fetch
- [ ] Verify sessions load and display correctly
- [ ] Verify session removal triggers refetch and list updates

**Phase 2 (Loading States):**
- [ ] Load each page that fetches data (Audit, Users, Categories, Ranking)
- [ ] Verify spinner appears and disappears appropriately
- [ ] Verify data displays after load completes
- [ ] Verify no layout shift occurs when spinner appears/disappears

**Phase 3 (Build & Tests):**
- [ ] Run `npm run build` and verify success
- [ ] Run `npm test -- --run` and verify no failures
- [ ] Grep for firebase and verify no results in src/

---

## Open Questions

- None at this time; codebase is well-structured and React Query patterns are already established.

---

## Summary

This refactoring standardizes session data loading to use React Query (like the rest of the app) and ensures all async-fetching components display loading spinners consistently. Firebase references have already been removed. The work is low-risk due to existing query hook infrastructure and straightforward component modifications.
