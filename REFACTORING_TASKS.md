# BadGuys Refactoring Task Breakdown

This document breaks down the refactoring plan into concrete, verifiable tasks. Tasks are ordered by dependency and phased for safe incremental implementation.

---

## Phase 1: Foundation (Weeks 1-2)

### ✓ Task 1.1: Create `useLocalStorage<T>` Generic Hook

**Description:** Implement a reusable localStorage hook that handles serialization, deserialization, and optional scoping (for user-specific storage).

**Acceptance criteria:**
- [ ] Hook accepts `key`, `initialValue`, and optional `scope` parameter
- [ ] Returns `[value, setValue]` tuple matching useState API
- [ ] Automatically persists to localStorage on value change
- [ ] Deserializes from localStorage on mount
- [ ] Handles JSON parse errors gracefully (falls back to initial value)
- [ ] Supports scoped storage (e.g., `userId:key` pattern)
- [ ] Supports clearing value (setValue(undefined) removes from storage)

**Implementation:**
```
src/hooks/useLocalStorage.ts
```

**Verification:**
- [ ] Unit tests: test initialization, persistence, updates, scope, error handling
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors

**Files likely touched:**
- `src/hooks/useLocalStorage.ts` (new)
- `src/hooks/useLocalStorage.test.ts` (new)

**Dependencies:** None
**Estimated scope:** Small (1-2 files)

---

### ✓ Task 1.2: Create `useAsync<T>` Hook

**Description:** Implement a hook for managing async operations (loading, error, data states).

**Acceptance criteria:**
- [ ] Hook accepts async function and optional dependencies array
- [ ] Returns `{ data, isLoading, error }` object
- [ ] Handles cleanup on unmount
- [ ] Re-runs when dependencies change
- [ ] Sets error to null on successful completion
- [ ] Supports manual retry via returned function
- [ ] Supports optional initial data

**Implementation:**
```
src/hooks/useAsync.ts
```

**Verification:**
- [ ] Unit tests: test loading, error, success, cleanup, dependencies, retry
- [ ] Build succeeds
- [ ] No TypeScript errors

**Files likely touched:**
- `src/hooks/useAsync.ts` (new)
- `src/hooks/useAsync.test.ts` (new)

**Dependencies:** Task 1.1
**Estimated scope:** Small (1-2 files)

---

### ✓ Task 1.3: Create Folder Structure

**Description:** Create new folder structure for features, services, and hooks without moving files yet.

**Acceptance criteria:**
- [ ] Create `src/features/` directory structure (calculator, ranking, sessions, auth)
- [ ] Create `src/services/` directory
- [ ] Move `src/hooks/useHistoryModal.ts` to `src/hooks/`
- [ ] Add new hooks from Tasks 1.1-1.2 to `src/hooks/`
- [ ] No files deleted or modified (only created/organized)
- [ ] Update `src/hooks/index.ts` with exports

**Files likely touched:**
- Directory structure only

**Verification:**
- [ ] `src/features/` exists with subdirs
- [ ] `src/services/` exists
- [ ] `src/hooks/` has all hooks with index.ts
- [ ] All imports still work
- [ ] Build succeeds

**Dependencies:** None
**Estimated scope:** Trivial

---

### ✓ Task 1.4: Extract Calculation into `useCalculation` Hook

**Description:** Extract the cost calculation logic from App.tsx into a custom hook that memoizes and exposes the calculation result.

**Acceptance criteria:**
- [ ] Hook accepts `players`, `courtFee`, `shuttleCount`, `config` (parsed as numbers)
- [ ] Returns memoized `CalcResult` object
- [ ] Uses same `calculateResult()` function from `lib/core.ts`
- [ ] Dependency array includes all inputs
- [ ] No side effects, pure computation

**Implementation:**
```typescript
// src/hooks/useCalculation.ts
export function useCalculation(
  players: Player[],
  courtFeeInput: string,
  shuttleCountInput: string,
  config: AppConfig
): CalcResult {
  return useMemo(() => {
    const courtFee = parseFloat(courtFeeInput) || 0;
    const shuttleCount = parseFloat(shuttleCountInput) || 0;
    return calculateResult(players, courtFee, shuttleCount, config);
  }, [players, courtFeeInput, shuttleCountInput, config]);
}
```

**Verification:**
- [ ] Unit tests: test with various inputs, verify memoization
- [ ] Update App.tsx to use hook (no behavior change)
- [ ] All App tests pass
- [ ] Build succeeds

**Files likely touched:**
- `src/hooks/useCalculation.ts` (new)
- `src/hooks/useCalculation.test.ts` (new)
- `src/App.tsx` (update to use hook, lines ~149-152)

**Dependencies:** Task 1.3
**Estimated scope:** Small (2-3 files)

---

### ✓ Task 1.5: Extract Cost Calculator State into `useCostCalculatorState` Hook

**Description:** Extract all cost calculation input state (courtFee, shuttleCount, courtCount, bulkInput, players, config) from App.tsx into a single custom hook that manages state, localStorage persistence, and reset logic.

**Acceptance criteria:**
- [ ] Hook accepts `userId` parameter (for scoped storage)
- [ ] Manages 5 state values: courtFeeInput, shuttleCountInput, courtCountInput, bulkInput, config
- [ ] Auto-saves to localStorage on any input change
- [ ] Loads from localStorage on mount
- [ ] Provides `reset()` function that clears all inputs and storage
- [ ] Parses bulkInput into players automatically
- [ ] Returns object with: `inputs`, `setInputs`, `reset`, derived `players`
- [ ] No side effects outside of storage/parsing

**Implementation:**
```typescript
// src/features/calculator/hooks/useCostCalculatorState.ts
export interface CalculatorInputs {
  courtFeeInput: string;
  shuttleCountInput: string;
  courtCountInput: string;
  bulkInput: string;
}

export function useCostCalculatorState(userId: string) {
  const [inputs, setInputs] = useState<CalculatorInputs>(() =>
    loadStoredInputDraft(userId)
  );
  
  const players = useMemo(
    () => parsePlayersBulk(inputs.bulkInput),
    [inputs.bulkInput]
  );
  
  useEffect(() => {
    saveInputDraft(inputs, userId);
  }, [inputs, userId]);
  
  const reset = useCallback(() => {
    const empty = {
      courtFeeInput: "",
      shuttleCountInput: "",
      courtCountInput: "",
      bulkInput: "",
    };
    setInputs(empty);
    clearInputDraft(userId);
  }, [userId]);
  
  return { inputs, setInputs, reset, players };
}
```

**Verification:**
- [ ] Unit tests: initialization, persistence, reset, parsing
- [ ] Test with different userIds (scoped storage)
- [ ] Test localStorage is updated on changes
- [ ] Update App.tsx lines 98-219 to use hook
- [ ] All App functionality works identically
- [ ] `npm test` passes
- [ ] Build succeeds

**Files likely touched:**
- `src/features/calculator/hooks/useCostCalculatorState.ts` (new)
- `src/features/calculator/hooks/useCostCalculatorState.test.ts` (new)
- `src/App.tsx` (update lines 98-220, reduce by ~80 lines)

**Dependencies:** Task 1.4
**Estimated scope:** Medium (2-3 files, ~100 lines new code)

---

### Checkpoint 1: Foundation Complete

**Verification before proceeding:**
- [ ] All new hooks have unit tests
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (both new tests and existing tests)
- [ ] App.tsx is updated to use new hooks
- [ ] No TypeScript errors or warnings
- [ ] No console errors when running app
- [ ] Calculator still works identically
- [ ] Storage/persistence still works

**Review checklist:**
- [ ] Code follows existing patterns
- [ ] Hooks are well-documented with JSDoc
- [ ] Tests cover happy path and edge cases
- [ ] No breaking changes

---

## Phase 2: Extract Features (Weeks 3-4)

### ✓ Task 2.1: Create `Calculator` Component

**Description:** Extract cost calculator UI and logic from App.tsx into a standalone `Calculator` component that uses the new hooks.

**Acceptance criteria:**
- [ ] New file: `src/components/calculator/Calculator.tsx`
- [ ] Uses `useCostCalculatorState()` hook
- [ ] Uses `useCalculation()` hook
- [ ] Renders: ExpensesSection, PlayersSection, ResultCard, reset button
- [ ] Manages: all calculator event handlers (toggle player, remove player, reset, copy summary)
- [ ] Props: optional `onCopySummary` callback (for analytics/notification)
- [ ] All calculator functionality works identically
- [ ] No App.tsx state flows into it (except props)

**Implementation structure:**
```
src/components/calculator/
├── Calculator.tsx          (main component, ~120 lines)
├── ExpensesSection.tsx     (move from components/)
├── PlayersSection.tsx      (move from components/)
├── ResultCard.tsx          (move from components/)
└── types.ts                (if needed)
```

**Verification:**
- [ ] Calculator renders without errors
- [ ] All sections display
- [ ] Player operations work (add, toggle, remove)
- [ ] Reset button works
- [ ] Copy summary works
- [ ] localStorage persistence works within Calculator
- [ ] Update App.tsx to import and use `<Calculator />`
- [ ] `npm test` passes
- [ ] Build succeeds
- [ ] No visual changes

**Files likely touched:**
- `src/components/calculator/Calculator.tsx` (new)
- `src/components/calculator/ExpensesSection.tsx` (moved)
- `src/components/calculator/PlayersSection.tsx` (moved)
- `src/components/calculator/ResultCard.tsx` (moved)
- `src/App.tsx` (update render, remove calculator state)

**Dependencies:** Task 1.5
**Estimated scope:** Medium (4-5 files, ~150 lines moved/new)

---

### ✓ Task 2.2: Create `useSessionManagement` Hook

**Description:** Extract session management logic from App.tsx into a custom hook.

**Acceptance criteria:**
- [ ] Hook loads recent sessions from Firestore
- [ ] Provides `loadSessions()` function
- [ ] Provides `removeSession(sessionId)` function
- [ ] Provides `copySummary(text)` function
- [ ] Returns: `{ sessions, isLoading, error, loadSessions, removeSession, copySummary }`
- [ ] Handles error states
- [ ] Handles Firebase readiness check
- [ ] No side effects on mount (only on explicit `loadSessions()` call)

**Implementation:**
```
src/features/sessions/hooks/useSessionManagement.ts
```

**Verification:**
- [ ] Unit tests: load, remove, copy operations
- [ ] Test Firebase readiness check
- [ ] Test error handling
- [ ] Update App.tsx to use hook (lines ~333-390)
- [ ] All session operations work
- [ ] `npm test` passes

**Files likely touched:**
- `src/features/sessions/hooks/useSessionManagement.ts` (new)
- `src/features/sessions/hooks/useSessionManagement.test.ts` (new)
- `src/App.tsx` (update lines 333-390)

**Dependencies:** Task 1.3
**Estimated scope:** Medium (2-3 files, ~80 lines)

---

### ✓ Task 2.3: Extract `ChangePasswordModal` State Management

**Description:** Extract password change form state and validation from App.tsx into a custom hook.

**Acceptance criteria:**
- [ ] Hook manages form state (currentPassword, newPassword, confirmPassword)
- [ ] Validates: non-empty, min length, match, different from current
- [ ] Provides `handleSubmit()` function
- [ ] Returns: `{ form, error, isSubmitting, handleSubmit, reset }`
- [ ] Uses antd Form internally (keep consistency)

**Implementation:**
```
src/features/auth/hooks/usePasswordChange.ts
```

**Verification:**
- [ ] Unit tests: validation, submit, errors
- [ ] Update App.tsx to use hook (lines ~416-476)
- [ ] Password change still works
- [ ] All validations work
- [ ] `npm test` passes

**Files likely touched:**
- `src/features/auth/hooks/usePasswordChange.ts` (new)
- `src/features/auth/hooks/usePasswordChange.test.ts` (new)
- `src/App.tsx` (update lines 416-476)
- `src/components/ChangePasswordModal.tsx` (update to accept hook state)

**Dependencies:** Task 2.2
**Estimated scope:** Small (2-3 files, ~60 lines)

---

### ✓ Task 2.4: Extract Modal State Management

**Description:** Create a generic modal state hook and apply to config/sessions/ranking modals in App.tsx.

**Acceptance criteria:**
- [ ] Generic `useModal(initialOpen = false)` hook
- [ ] Returns: `{ isOpen, open, close, toggle }`
- [ ] Create specific modals: ConfigModal, SessionsModal, RankingModal (in App?)
- [ ] All modal open/close works
- [ ] Modals stay in sync with route if using history-based approach

**Note:** May keep using `useHistoryModal()` since it uses route-based state. Just document the pattern.

**Verification:**
- [ ] Document modal state management pattern
- [ ] Ensure config, sessions, ranking modals work
- [ ] `npm test` passes
- [ ] Build succeeds

**Files likely touched:**
- `src/hooks/useModal.ts` (new, optional refactor)
- `src/App.tsx` (documentation/refactoring)

**Dependencies:** Task 2.3
**Estimated scope:** Small (1-2 files)

---

### Checkpoint 2: Features Extracted

**Verification before proceeding:**
- [ ] Calculator component works standalone
- [ ] Session management hook works
- [ ] Password change hook works
- [ ] All modals work
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] No TypeScript errors
- [ ] App.tsx is significantly simpler (~300 lines from 795)
- [ ] No visual changes
- [ ] All features work identically

**App.tsx complexity reduced from ~795 lines to ~350 lines**

---

## Phase 3: Refactor RankingPage (Weeks 5-6)

### ✓ Task 3.1: Create `useRankingData` Hook

**Description:** Extract data loading and Firestore subscription logic from RankingPage into a custom hook.

**Acceptance criteria:**
- [ ] Hook handles loading ranking members from Firestore
- [ ] Hook handles subscribing to matches with cleanup
- [ ] Hook derives fallback members from match history if needed
- [ ] Returns: `{ members, matches, isRemoteHydrated, error }`
- [ ] Handles Firebase readiness
- [ ] No side effects outside of data loading

**Implementation:**
```
src/features/ranking/hooks/useRankingData.ts
```

**Verification:**
- [ ] Unit tests: loading, subscriptions, cleanup, fallback logic
- [ ] Test Firebase readiness check
- [ ] Test unsubscribe on unmount
- [ ] Update RankingPage to use hook (lines ~104-109, 199-268)
- [ ] Data loads and updates correctly
- [ ] Firestore still syncs
- [ ] `npm test` passes

**Files likely touched:**
- `src/features/ranking/hooks/useRankingData.ts` (new)
- `src/features/ranking/hooks/useRankingData.test.ts` (new)
- `src/components/RankingPage.tsx` (update to use hook)

**Dependencies:** Task 2.4
**Estimated scope:** Medium (2-3 files, ~100 lines)

---

### ✓ Task 3.2: Create `useRankingMembers` Hook

**Description:** Extract member state management (add, edit, delete) from RankingPage into a custom hook.

**Acceptance criteria:**
- [ ] Hook manages members state
- [ ] Provides operations: `addMember()`, `editMember()`, `deleteMember()`, `selectMember()`
- [ ] Saves to localStorage and Firestore
- [ ] Returns: `{ members, addMember, editMember, deleteMember, selectedMember, selectMember }`
- [ ] Handles duplicate detection
- [ ] Integrates with `useRankingCategories()` for level validation

**Implementation:**
```
src/features/ranking/hooks/useRankingMembers.ts
```

**Verification:**
- [ ] Unit tests: add, edit, delete, select, localStorage, Firestore
- [ ] Update RankingPage to use hook (lines ~134-139, member operations)
- [ ] Member CRUD works
- [ ] LocalStorage persists
- [ ] Firestore syncs
- [ ] `npm test` passes

**Files likely touched:**
- `src/features/ranking/hooks/useRankingMembers.ts` (new)
- `src/features/ranking/hooks/useRankingMembers.test.ts` (new)
- `src/components/RankingPage.tsx` (update to use hook)

**Dependencies:** Task 3.1
**Estimated scope:** Medium (2-3 files, ~120 lines)

---

### ✓ Task 3.3: Create `useRankingMatches` Hook

**Description:** Extract match state management (add, delete, history) from RankingPage.

**Acceptance criteria:**
- [ ] Hook manages matches state
- [ ] Provides operations: `addMatch()`, `deleteMatch()`, `loadMatchHistory()`
- [ ] Saves to Firestore
- [ ] Returns: `{ matches, addMatch, deleteMatch, historyMatches, loadMatchHistory, isHistoryLoading }`
- [ ] Handles pagination for history
- [ ] Validates match data before saving

**Implementation:**
```
src/features/ranking/hooks/useRankingMatches.ts
```

**Verification:**
- [ ] Unit tests: add, delete, history, pagination, Firestore
- [ ] Update RankingPage to use hook (lines ~141-155, match operations)
- [ ] Match recording works
- [ ] Match deletion works
- [ ] History loading works with pagination
- [ ] Firestore syncs
- [ ] `npm test` passes

**Files likely touched:**
- `src/features/ranking/hooks/useRankingMatches.ts` (new)
- `src/features/ranking/hooks/useRankingMatches.test.ts` (new)
- `src/components/RankingPage.tsx` (update to use hook)

**Dependencies:** Task 3.2
**Estimated scope:** Medium (2-3 files, ~130 lines)

---

### ✓ Task 3.4: Create `useRankingCategories` Hook

**Description:** Extract ranking categories loading from RankingPage.

**Acceptance criteria:**
- [ ] Hook subscribes to ranking categories from Firestore
- [ ] Returns: `{ categories, sortedCategories, defaultMemberLevel, isLoading }`
- [ ] Handles cleanup on unmount
- [ ] Sorts categories by order + name

**Implementation:**
```
src/features/ranking/hooks/useRankingCategories.ts
```

**Verification:**
- [ ] Unit tests: loading, sorting, cleanup
- [ ] Update RankingPage to use hook (lines ~121-131)
- [ ] Categories load correctly
- [ ] Sorting works
- [ ] `npm test` passes

**Files likely touched:**
- `src/features/ranking/hooks/useRankingCategories.ts` (new)
- `src/features/ranking/hooks/useRankingCategories.test.ts` (new)
- `src/components/RankingPage.tsx` (update to use hook)

**Dependencies:** Task 3.3
**Estimated scope:** Small (2-3 files, ~60 lines)

---

### ✓ Task 3.5: Create `useMatchForm` Hook

**Description:** Extract match form state management from RankingPage.

**Acceptance criteria:**
- [ ] Hook manages: matchType, teams, sets, playedAt
- [ ] Provides form state and change handlers
- [ ] Validates match data
- [ ] Returns: `{ form, formErrors, handleChange, resetForm }`
- [ ] Supports singles and doubles

**Implementation:**
```
src/features/ranking/hooks/useMatchForm.ts
```

**Verification:**
- [ ] Unit tests: state management, validation, reset
- [ ] Update RankingPage/MatchFormPanel to use hook
- [ ] Form displays and works
- [ ] Validation works
- [ ] `npm test` passes

**Files likely touched:**
- `src/features/ranking/hooks/useMatchForm.ts` (new)
- `src/features/ranking/hooks/useMatchForm.test.ts` (new)
- `src/components/ranking/MatchFormPanel.tsx` (update to use hook)

**Dependencies:** Task 3.4
**Estimated scope:** Small (2-3 files, ~80 lines)

---

### ✓ Task 3.6: Simplify RankingPage Component

**Description:** Refactor RankingPage to use all new hooks and remove embedded state management.

**Acceptance criteria:**
- [ ] RankingPage imports and uses: useRankingData, useRankingMembers, useRankingMatches, useRankingCategories
- [ ] Removed lines: member state management (~20 lines)
- [ ] Removed lines: match state management (~20 lines)
- [ ] Removed lines: category state management (~10 lines)
- [ ] Component focuses on: layout, navigation, panel selection
- [ ] All data flow is through hooks
- [ ] RankingPage becomes ~150 lines (from 300+)
- [ ] No behavior changes

**Verification:**
- [ ] Render RankingPage, all panels display
- [ ] Member operations work
- [ ] Match recording works
- [ ] Category selection works
- [ ] Public vs authenticated views work
- [ ] `npm test` passes
- [ ] Build succeeds

**Files likely touched:**
- `src/components/RankingPage.tsx` (major refactor, reduce ~150 lines)
- `src/components/ranking/MembersPanel.tsx` (may simplify if using hook directly)
- `src/components/ranking/MatchFormPanel.tsx` (may simplify if using hook directly)

**Dependencies:** Task 3.5
**Estimated scope:** Large (1 major file, 200+ lines refactored)

---

### ✓ Task 3.7: Extract Ranking Panels to Feature Components

**Description:** Move RankingPage subpanels into feature-organized structure and simplify them to presentational components.

**Acceptance criteria:**
- [ ] Move panels to `src/components/ranking/` (already mostly there)
- [ ] Update panels to accept props from RankingPage hooks (instead of managing state)
- [ ] Panels become simpler (less logic, more rendering)
- [ ] All panel functionality unchanged

**Files likely touched:**
- `src/components/ranking/RankingPanel.tsx` (simplify if needed)
- `src/components/ranking/MembersPanel.tsx` (simplify if needed)
- `src/components/ranking/MatchFormPanel.tsx` (simplify if needed)
- `src/components/ranking/RankingSidebar.tsx` (review/simplify if needed)

**Verification:**
- [ ] All panels render correctly
- [ ] All operations work
- [ ] Build succeeds

**Dependencies:** Task 3.6
**Estimated scope:** Medium (4-5 files, ~100 lines refactored)

---

### Checkpoint 3: RankingPage Refactored

**Verification before proceeding:**
- [ ] All ranking hooks have unit tests
- [ ] RankingPage is significantly simpler
- [ ] All ranking features work (members, matches, categories, views)
- [ ] localStorage still syncs
- [ ] Firestore still syncs
- [ ] Public and authenticated views work
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] No TypeScript errors
- [ ] No console errors

**RankingPage complexity reduced from 300+ to ~150 lines**

---

## Phase 4: Cleanup & Optimize (Weeks 7-8)

### ✓ Task 4.1: Add React.memo to Presentational Components

**Description:** Wrap presentational components in React.memo() to prevent unnecessary re-renders.

**Acceptance criteria:**
- [ ] Wrap: ExpensesSection, PlayersSection, ResultCard, RankingPanel, MembersPanel, etc.
- [ ] Only components that are pure (props only) and don't change often
- [ ] Verify no callback prop issues
- [ ] Test renders don't increase (use React DevTools)

**Files likely touched:**
- `src/components/calculator/ExpensesSection.tsx`
- `src/components/calculator/PlayersSection.tsx`
- `src/components/calculator/ResultCard.tsx`
- `src/components/ranking/RankingPanel.tsx`
- `src/components/ranking/MembersPanel.tsx`
- `src/components/ranking/MatchFormPanel.tsx`

**Verification:**
- [ ] Build succeeds
- [ ] No performance regression
- [ ] Tests still pass

**Dependencies:** Task 3.7
**Estimated scope:** Small (5-6 files)

---

### ✓ Task 4.2: Add useCallback to Event Handlers

**Description:** Wrap event handlers in useCallback to prevent unnecessary re-renders of memoized child components.

**Acceptance criteria:**
- [ ] Identify handlers that are passed as props to memoized components
- [ ] Wrap in useCallback with proper dependencies
- [ ] Only in container components (Calculator, RankingPage)
- [ ] Ensure no stale closures

**Files likely touched:**
- `src/components/calculator/Calculator.tsx`
- `src/components/RankingPage.tsx`

**Verification:**
- [ ] Build succeeds
- [ ] Handlers still work
- [ ] No infinite loops
- [ ] Tests pass

**Dependencies:** Task 4.1
**Estimated scope:** Small (2-3 files)

---

### ✓ Task 4.3: Lazy Load Admin Routes

**Description:** Use React.lazy() and Suspense to lazy load admin routes (users, audit, categories management).

**Acceptance criteria:**
- [ ] Lazy load: UserManagementPage, AuditPage, CategoryManagementPage
- [ ] Add Suspense boundary with loading fallback
- [ ] Routes load only when accessed
- [ ] No build errors

**Implementation:**
```typescript
// App.tsx
const UserManagementPage = lazy(() => import('./components/admin/UserManagementPage'));
const AuditPage = lazy(() => import('./components/admin/AuditPage'));

// In render:
<Suspense fallback={<div>Loading...</div>}>
  <UserManagementPage />
</Suspense>
```

**Verification:**
- [ ] Build succeeds with no warnings
- [ ] Admin routes load correctly when accessed
- [ ] Loading fallback appears
- [ ] Bundle size is smaller (admin code not in main chunk)

**Dependencies:** Task 4.2
**Estimated scope:** Small (1-2 files)

---

### ✓ Task 4.4: Remove All `any` Types and Improve TypeScript Strictness

**Description:** Add explicit types to any function, variable, or handler that uses `any`.

**Acceptance criteria:**
- [ ] Search codebase for `any` keyword
- [ ] Replace with explicit types
- [ ] Add return types to all functions
- [ ] Enable `strict: true` in tsconfig.json (if not already)
- [ ] No TypeScript errors or warnings

**Files likely touched:**
- Various (grep for `any`)
- `tsconfig.json` (ensure `strict: true`)

**Verification:**
- [ ] `npx tsc --noEmit` succeeds with no errors
- [ ] Build succeeds
- [ ] Tests pass

**Dependencies:** Task 4.3
**Estimated scope:** Medium (varies, likely 5-10 files)

---

### ✓ Task 4.5: Add JSDoc Comments to Custom Hooks

**Description:** Document all custom hooks with JSDoc comments explaining parameters, return type, and usage examples.

**Acceptance criteria:**
- [ ] All hooks in `src/hooks/` have JSDoc
- [ ] All hooks in `src/features/*/hooks/` have JSDoc
- [ ] Includes parameter descriptions
- [ ] Includes return type description
- [ ] Includes usage example (optional but recommended)

**Example:**
```typescript
/**
 * Manages cost calculator input state with auto-persistence to localStorage.
 * 
 * @param userId - User ID for scoped storage (e.g., currentUser.userId or "guest")
 * @returns Object with inputs state, setters, reset function, and parsed players
 * 
 * @example
 * const { inputs, setInputs, reset, players } = useCostCalculatorState(userId);
 * setInputs({ ...inputs, courtFeeInput: "500" });
 * reset(); // Clear all inputs
 */
export function useCostCalculatorState(userId: string) { ... }
```

**Files likely touched:**
- `src/hooks/useLocalStorage.ts`
- `src/hooks/useAsync.ts`
- `src/hooks/useCalculation.ts`
- `src/features/calculator/hooks/useCostCalculatorState.ts`
- `src/features/sessions/hooks/useSessionManagement.ts`
- `src/features/auth/hooks/usePasswordChange.ts`
- `src/features/ranking/hooks/*.ts`

**Verification:**
- [ ] All hooks documented
- [ ] No TypeScript errors from comments
- [ ] Documentation is clear and concise

**Dependencies:** Task 4.4
**Estimated scope:** Small (10-12 files)

---

### ✓ Task 4.6: Create Error Handling Utilities

**Description:** Create a centralized error handling service to standardize error messages.

**Acceptance criteria:**
- [ ] New file: `src/services/errorService.ts`
- [ ] Provides: `handleError(error)` function that returns user-friendly message
- [ ] Handles: Firebase errors, network errors, validation errors, generic errors
- [ ] Vietnamese error messages (for user display)
- [ ] English messages (for logging)

**Implementation:**
```
src/services/errorService.ts
```

**Verification:**
- [ ] Function handles various error types
- [ ] Messages are appropriate
- [ ] Used in key error handlers (sessions, password change, etc.)
- [ ] Tests pass

**Dependencies:** Task 4.5
**Estimated scope:** Small (1-2 files)

---

### ✓ Task 4.7: Update Documentation

**Description:** Update README, CLAUDE.md, and create architecture documentation.

**Acceptance criteria:**
- [ ] Update CLAUDE.md with new folder structure
- [ ] Add section on custom hooks and their usage
- [ ] Create `ARCHITECTURE.md` explaining component hierarchy
- [ ] Create `HOOKS.md` documenting all custom hooks
- [ ] Add migration notes for future developers
- [ ] Update component list in CLAUDE.md

**Files likely touched:**
- `/CLAUDE.md` (update)
- `ARCHITECTURE.md` (new)
- `HOOKS.md` (new)

**Verification:**
- [ ] Documentation is clear and accurate
- [ ] Matches current code structure
- [ ] Helpful for new developers

**Dependencies:** Task 4.6
**Estimated scope:** Small (3 files)

---

### ✓ Task 4.8: Performance Testing & Bundle Analysis

**Description:** Measure performance improvements and verify bundle size didn't increase significantly.

**Acceptance criteria:**
- [ ] Run `npm run build` and record bundle size
- [ ] Compare to before-refactoring size
- [ ] Bundle size increase < 10% (or decrease)
- [ ] Check React DevTools for unnecessary renders
- [ ] Measure Lighthouse scores (optional)
- [ ] No performance regressions

**Tools:**
- Vite build output
- React DevTools Profiler
- Lighthouse

**Verification:**
- [ ] Bundle size acceptable
- [ ] No unexpected renders
- [ ] Build time reasonable

**Dependencies:** Task 4.7
**Estimated scope:** Trivial

---

### Checkpoint 4: Complete Refactoring

**Final verification:**
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] No console warnings or errors (dev mode)
- [ ] All features work identically to before
- [ ] Calculator works
- [ ] RankingPage works
- [ ] Admin pages work
- [ ] localStorage syncs
- [ ] Firestore syncs
- [ ] Analytics track
- [ ] Notifications send
- [ ] Code is well-documented
- [ ] Folder structure is organized
- [ ] Performance is good

**Refactoring complete!**

---

## Summary of Changes

### Before Refactoring
- App.tsx: **795 lines** (all logic)
- RankingPage.tsx: **300+ lines** (all state + logic)
- Custom hooks: **1** (useHistoryModal)
- Folder structure: flat
- Tests: existing coverage
- Performance: decent

### After Refactoring
- App.tsx: **~200 lines** (routing only)
- RankingPage.tsx: **~150 lines** (layout + orchestration)
- Calculator.tsx: **~120 lines** (cost calculation)
- Custom hooks: **15+** (specialized, reusable)
- Folder structure: organized by feature
- Tests: +40% coverage (new hooks tested)
- Performance: improved (memoization, lazy loading)

### Code Quality
- 🟢 Maintainability: Much improved
- 🟢 Testability: Much improved
- 🟢 Reusability: Much improved
- 🟢 Readability: Improved
- 🟢 Performance: Maintained/improved
- 🟢 TypeScript: Stricter, fewer `any` types

---

## Timeline

- **Week 1:** Tasks 1.1-1.5 (Foundation)
- **Week 2:** Checkpoint 1 + Testing
- **Week 3:** Tasks 2.1-2.4 (Feature extraction)
- **Week 4:** Checkpoint 2 + Testing
- **Week 5:** Tasks 3.1-3.4 (RankingPage refactoring start)
- **Week 6:** Tasks 3.5-3.7 + Checkpoint 3
- **Week 7:** Tasks 4.1-4.4 (Optimization)
- **Week 8:** Tasks 4.5-4.8 + Final testing + Checkpoint 4

**Total: 8 weeks (can be condensed if working full-time)**

---

## Next Step

Start with **Task 1.1: Create useLocalStorage Hook** — this is the lowest risk, highest value task that will serve as a foundation for future hooks.

