# BadGuys Refactoring Plan

## Overview

This document outlines a comprehensive refactoring strategy for the BadGuys cost calculator and ranking system. The goal is to improve maintainability, reusability, and testability without changing business logic or breaking existing functionality.

**Key constraints:**
- ✅ Preserve all business logic
- ✅ Keep Firebase/Firestore integration
- ✅ Maintain current routing behavior
- ✅ No heavy new dependencies
- ✅ Zero user-facing behavior changes

---

## Current State Analysis

### Issues Identified

#### 1. **App.tsx is Overloaded (795 lines)**

**Responsibilities:**
- Route handling and navigation
- Cost calculation state management
- Input draft persistence
- Session management (load, delete, copy)
- Password change modal
- Analytics initialization
- Reset button logic with timer
- Telegram notifications
- Config sidebar state

**Problems:**
- Hard to test individual features
- Difficult to reuse calculation logic
- Mixed concerns (routing, state, business logic, UI)
- Too many state variables and effects
- Modal states scattered throughout

**Current structure:**
```
App.tsx
├── useState × 14 (courtFee, shuttleCount, courtCount, bulkInput, players, 
                   config, sessions, resetArmed, changePassword*, etc.)
├── useRef × 2 (resetTimer, previousPath)
├── useEffect × 7 (analytics, tracking, storage, guest notification)
├── Event handlers × 12+ (handleCopySummary, handleRemoveSession, etc.)
└── Render: Headers, sections, modals
```

#### 2. **RankingPage.tsx is Large (300+ lines so far)**

**Responsibilities:**
- Member CRUD operations
- Match recording (singles/doubles)
- Ranking calculations
- Firebase data hydration
- Local storage persistence
- Navigation management
- Multiple panel display modes

**Problems:**
- Mixed data fetching and state management
- No custom hooks for ranking-specific logic
- Complex effect chains
- Unclear dependencies between state variables
- Duplicate logic (members vs history members)

#### 3. **State Management Patterns**

**Current approach:**
- Raw useState for related data
- Multiple dependencies in single effects
- Direct localStorage calls
- No custom hooks for domain logic

**Issues:**
- Related state scattered (e.g., form inputs, validation)
- Hard to maintain invariants
- Difficult to test
- Code duplication

#### 4. **Folder Structure is Flat**

```
src/
├── components/           # All components mixed
│   ├── App.tsx
│   ├── RankingPage.tsx
│   ├── ExpensesSection.tsx
│   ├── auth/             # Only auth gets subfolder
│   └── ranking/          # Ranking sub-components only
├── context/
├── hooks/                # Minimal
├── lib/                  # All utilities mixed
│   ├── core.ts (business logic)
│   ├── firebase.ts (data access)
│   ├── analytics.ts
│   ├── platform.ts
│   └── ...
└── i18n/
```

**Issues:**
- No clear separation by feature
- Hard to find related code
- Mixes infrastructure (Firebase) with business logic (core.ts)

#### 5. **Component Decomposition Opportunities**

| Component | Size | Issues | Decomposition |
|-----------|------|--------|---------------|
| **App.tsx** | 795 | Too many responsibilities | Split into feature-based child components + custom hooks |
| **RankingPage.tsx** | 300+ | Mixed concerns | Extract hooks for data, separate panels, state management |
| **ConfigSidebar.tsx** | Unknown | Password + sessions mixed | Split into PasswordModal + SessionsModal (already have these) |
| **UserManagementPage.tsx** | Unknown | Likely large | Extract user form, user list into sub-components |
| **ExpensesSection** | 75 | Good | Keep as-is (presentational) |
| **PlayersSection** | 128 | Good but bulk logic could be extracted | Potential: separate parser preview |
| **ResultCard** | Unknown | Likely presentational | Keep as-is |

---

## Proposed Architecture

### 1. Custom Hooks (Extraction)

#### Calculation Hooks

**`useCalculation(players, courtFee, shuttleCount, config)`**
- Wraps `calculateResult()`
- Returns memoized `CalcResult`
- Dependency: `players`, `courtFee`, `shuttleCount`, `config`

```typescript
const calc = useCalculation(players, courtFee, shuttleCount, config);
```

**`useCostCalculatorState()`**
- Manages: `courtFeeInput`, `shuttleCountInput`, `courtCountInput`, `bulkInput`, `players`, `config`
- Provides: state setters, reset logic
- Returns: `{ inputs, setInputs, reset, ... }`
- Handles: loading from localStorage, saving to localStorage on change

```typescript
const { inputs, setInputs, reset } = useCostCalculatorState(userId);
```

#### Storage Hooks

**`useLocalStorage<T>(key, initialValue, scope?)`**
- Generic localStorage with scoped keys
- Auto-serialization/deserialization
- Returns: `[value, setValue]`

```typescript
const [config, setConfig] = useLocalStorage('config', defaultConfig, userId);
```

**`useStoredInputDraft(scope)`**
- Wraps input state + storage
- Returns: `{ inputs, setInputs, clear }`

#### Firebase Hooks

**`useRankingData()`**
- Manages: members, matches loading from Firestore
- Provides: data, hydrated state, subscriptions cleanup
- Returns: `{ members, matches, isLoading, error }`

**`useRankingCategories()`**
- Fetches and subscribes to ranking categories
- Returns: `{ categories, isLoading, error }`

#### Session Hooks

**`useSessionManagement()`**
- Manages: sessions list, loading state, errors
- Provides: load, delete, copy operations
- Returns: `{ sessions, isLoading, error, loadSessions, removeSession, ... }`

#### Modal/Navigation Hooks

**`useModalByRoute(baseRoute, modalName)`**
- Generic modal state based on route
- Returns: `{ isOpen, open, close }`

#### Ranking Hooks

**`useRankingMembers()`**
- Manage member CRUD, selection
- Returns: `{ members, edit, delete, add, ... }`

**`useRankingMatches()`**
- Manage match CRUD, history
- Returns: `{ matches, addMatch, deleteMatch, ... }`

### 2. Folder Structure

```
src/
├── components/
│   ├── common/                 # Reusable UI components
│   │   ├── Toast.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ...
│   ├── auth/
│   │   ├── LoginModal.tsx
│   │   ├── ChangePasswordModal.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── AdminRoute.tsx
│   ├── calculator/             # Cost calculator feature
│   │   ├── Calculator.tsx      # Main calculator container (formerly in App)
│   │   ├── ExpensesSection.tsx
│   │   ├── PlayersSection.tsx
│   │   └── ResultCard.tsx
│   ├── sessions/               # Session management feature
│   │   ├── SessionsModal.tsx
│   │   └── SessionHistory.tsx  # New: extracted list
│   ├── ranking/                # Ranking dashboard feature
│   │   ├── RankingPage.tsx
│   │   ├── RankingPanel.tsx
│   │   ├── MembersPanel.tsx
│   │   ├── MatchFormPanel.tsx
│   │   ├── RankingSidebar.tsx
│   │   ├── PlayerStatsModal.tsx
│   │   └── types.ts
│   ├── admin/                  # Admin-only features
│   │   ├── UserManagementPage.tsx
│   │   ├── AuditPage.tsx
│   │   ├── CategoryManagementPage.tsx
│   │   └── components/
│   └── App.tsx                 # Router only (very small)
│
├── features/                   # Feature-specific hooks, logic, types
│   ├── calculator/
│   │   ├── hooks/
│   │   │   ├── useCalculation.ts
│   │   │   ├── useCostCalculatorState.ts
│   │   │   └── useCalculatorReset.ts
│   │   ├── types.ts            # Move from main types.ts
│   │   └── utils.ts            # Calculation utilities
│   ├── ranking/
│   │   ├── hooks/
│   │   │   ├── useRankingData.ts
│   │   │   ├── useRankingMembers.ts
│   │   │   ├── useRankingMatches.ts
│   │   │   ├── useRankingCategories.ts
│   │   │   └── useMatchForm.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── sessions/
│   │   ├── hooks/
│   │   │   └── useSessionManagement.ts
│   │   └── types.ts
│   └── auth/
│       ├── hooks/
│       │   └── usePasswordChange.ts
│       └── types.ts
│
├── hooks/                      # Generic, cross-cutting hooks
│   ├── useLocalStorage.ts
│   ├── useStoredInputDraft.ts
│   ├── useModalByRoute.ts
│   ├── useHistoryModal.ts
│   └── useAsync.ts
│
├── services/                   # Business logic layer
│   ├── calculatorService.ts    # Move core.ts functions here
│   ├── rankingService.ts       # Move ranking logic here
│   ├── sessionService.ts       # Session operations
│   ├── authService.ts          # Auth logic
│   └── ...
│
├── lib/
│   ├── firebase.ts             # Firebase/Firestore only (keep as-is)
│   ├── telegram.ts             # Telegram API (keep as-is)
│   ├── analytics.ts            # Analytics (keep as-is)
│   ├── platform.ts             # Platform utilities (keep as-is)
│   ├── rankingStats.ts         # Glicko2 algorithm (keep as-is)
│   ├── rankingStorage.ts       # Ranking storage (keep as-is)
│   ├── constants.ts            # Keep as-is
│   ├── hash.ts                 # Keep as-is
│   └── rankingLevel.ts         # Keep as-is
│
├── context/
│   ├── AuthContext.tsx         # Keep as-is
│   ├── ...
│
├── i18n/                       # Keep as-is
├── types.ts                    # Shared types (gradually move to feature folders)
├── env.ts                      # Keep as-is
└── main.tsx
```

### 3. Component Decomposition

#### App.tsx → Simplified Router

**Before:** 795 lines, mixed concerns
**After:** ~80 lines, routing only

```typescript
// App.tsx (Router only)
export default function App() {
  const location = useLocation();
  
  // Just route to the right component
  if (location.pathname.startsWith("/dashboard")) {
    return <AdminLayout><RankingPage /></AdminLayout>;
  }
  
  return <MainLayout><Calculator /></MainLayout>;
}
```

#### Calculator Feature (extracted from App.tsx)

**New: `components/calculator/Calculator.tsx`** (~150 lines)
- Manages: cost calculation state
- Uses: `useCostCalculatorState()`, `useCalculation()`
- Renders: ExpensesSection, PlayersSection, ResultCard, reset button

```typescript
export function Calculator() {
  const { inputs, setInputs, reset } = useCostCalculatorState(userId);
  const calc = useCalculation(inputs.players, ...);
  // Simpler render
}
```

#### Sessions Feature (extracted from ConfigSidebar)

**New: `components/sessions/SessionHistory.tsx`** (~100 lines)
- Displays: session list
- Uses: `useSessionManagement()`
- Props: none, hooks handle everything

#### RankingPage.tsx → Split into Multiple Hooks

**New hooks:**
- `useRankingData()` — data loading and subscriptions
- `useRankingMembers()` — member state + operations
- `useRankingMatches()` — match state + operations
- `useMatchForm()` — form state for new match

**Simplified RankingPage.tsx** (~100 lines)
- Uses the hooks
- Focuses on layout and panel selection
- Clearer data flow

---

## State Management Refactor

### Before (scattered in App.tsx)

```typescript
const [courtFeeInput, setCourtFeeInput] = useState(loadedValue);
const [shuttleCountInput, setShuttleCountInput] = useState(loadedValue);
const [courtCountInput, setCourtCountInput] = useState(loadedValue);
const [bulkInput, setBulkInput] = useState(loadedValue);
const [players, setPlayers] = useState(parsePlayersBulk(bulkInput));
const [config, setConfig] = useState(loadedConfig);
// ... more state
```

### After (encapsulated in hook)

```typescript
const { inputs, setInputs, reset } = useCostCalculatorState(userId);
const calc = useCalculation(
  inputs.players,
  inputs.courtFee,
  inputs.shuttleCount,
  inputs.config
);
```

### Validation Example

**Before:** String parsing scattered in handlers
**After:** Encapsulated validation in `useCalculation()`

```typescript
// useCalculation.ts
const calc = useMemo(() => {
  const courtFee = parseFloat(courtFeeInput) || 0;
  const shuttleCount = parseFloat(shuttleCountInput) || 0;
  return calculateResult(players, courtFee, shuttleCount, config);
}, [players, courtFeeInput, shuttleCountInput, config]);
```

---

## Separation of Concerns

### Current Issues

| Layer | Current | Issue |
|-------|---------|-------|
| **UI** | Components (App.tsx, RankingPage.tsx) | Mixed with state and business logic |
| **State** | useState in components | Scattered, duplicated, no invariants |
| **Business Logic** | lib/core.ts, mixed in App | Partially extracted, some logic in components |
| **Data Access** | lib/firebase.ts | Well-isolated |
| **Infrastructure** | lib/telegram.ts, lib/analytics.ts | Well-isolated |

### After Refactoring

| Layer | Implementation | Boundary |
|-------|----------------|----------|
| **UI** | `components/` | Props only, no side effects |
| **State** | `features/*/hooks/` | Custom hooks, encapsulated logic |
| **Business Logic** | `services/` | Pure functions, no React dependencies |
| **Data Access** | `lib/firebase.ts` | Async functions, no state |
| **Infrastructure** | `lib/telegram.ts`, `lib/analytics.ts` | Standalone utilities |

### Specific Improvements

**Example: Calculator state encapsulation**

```typescript
// features/calculator/hooks/useCostCalculatorState.ts
export function useCostCalculatorState(userId: string) {
  const [inputs, setInputs] = useState(() => 
    loadStoredInputDraft(userId)
  );
  
  // Auto-save to localStorage
  useEffect(() => {
    saveInputDraft(inputs, userId);
  }, [inputs, userId]);
  
  // Reset is encapsulated
  const reset = () => {
    const empty = { courtFee: "", shuttleCount: "", /* ... */ };
    setInputs(empty);
    clearInputDraft(userId);
  };
  
  return { inputs, setInputs, reset };
}
```

**Example: Firebase data encapsulation**

```typescript
// features/ranking/hooks/useRankingData.ts
export function useRankingData() {
  const [members, setMembers] = useState<Member[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Hydration, subscriptions, cleanup all in here
  useEffect(() => {
    // ... complex subscription logic
    return () => unsubscribe();
  }, []);
  
  return { members, matches, isLoading };
}
```

---

## Performance Improvements

### 1. Memoization

**Current issue:** App.tsx has `useMemo` for calc but many renders still occur

**Improvements:**
- Wrap `ExpensesSection`, `PlayersSection` in `React.memo()` ✅ (already presentational)
- Memoize handlers with `useCallback()` in container components
- Split RankingPage into smaller memoized panels

**Implementation:**
```typescript
const MemoizedExpensesSection = React.memo(ExpensesSection);
const MemoizedPlayersSection = React.memo(PlayersSection);
```

### 2. Code Splitting

**Current:** All routes loaded upfront

**Improvement:** Lazy load ranking/admin routes
```typescript
const RankingPage = lazy(() => import('./components/ranking/RankingPage'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
```

### 3. Avoid Unnecessary Re-renders

**App.tsx issue:** Every state change re-renders entire App (header, calculator, modals, etc.)

**Solution:** Extract features into separate route components
```typescript
// App.tsx just routes
if (path === '/') return <CalculatorPage />;
if (path === '/dashboard') return <RankingPage />;
```

---

## Code Quality Improvements

### 1. TypeScript Strictness

**Current:**
- Some `any` types in handlers
- Loose input validation
- No strict null checks in some places

**Improvements:**
- Add `strict: true` to tsconfig (if not already)
- Remove all `any` types
- Add proper return types to all functions
- Use type guards for uncertain values

### 2. Reusable Patterns

**Modal pattern:** Extract modal state management
```typescript
// Generic modal hook
const useModal = (initialOpen = false) => ({
  isOpen,
  open: () => setIsOpen(true),
  close: () => setIsOpen(false),
  toggle: () => setIsOpen(!isOpen),
});
```

**Form pattern:** Generic form state + validation
```typescript
const useForm<T> = (onSubmit: (data: T) => void) => ({
  values,
  errors,
  touched,
  handleChange,
  handleSubmit,
});
```

### 3. Error Handling

**Current:** Try-catch in multiple places with generic error messages

**Improvement:** Centralized error handling
```typescript
// services/errorService.ts
export const handleError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Lỗi không xác định";
};
```

### 4. Naming Conventions

**Ensure consistent patterns:**
- Component files: PascalCase (`Calculator.tsx`)
- Hook files: camelCase (`useCalculation.ts`)
- Utility files: camelCase (`formatK.ts`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_FEMALE_MAX`)

---

## Refactoring Roadmap

### Phase 1: Foundation (Low Risk, High Value) — Weeks 1-2

1. **Create generic custom hooks** (no breaking changes)
   - `useLocalStorage<T>()` — generic storage hook
   - `useAsync<T>()` — async operation handler
   - Verify with tests

2. **Extract calculation logic** (already isolated, low risk)
   - Create `useCostCalculatorState()` hook
   - Create `useCalculation()` hook
   - Move parsing logic into feature folder
   - Update App.tsx to use hooks (no UI change)

3. **Create folder structure**
   - Add `src/features/` folders
   - Add `src/services/` folder
   - Add `src/hooks/` folder (move existing hooks)
   - No file changes yet, just organization

**Checkpoint:**
- ✅ All tests pass
- ✅ App builds without warnings
- ✅ Zero UI/behavior changes
- ✅ New hooks are exported and documented

### Phase 2: Extract Features (Medium Risk, Medium Value) — Weeks 3-4

4. **Extract Calculator feature**
   - Create `components/calculator/Calculator.tsx`
   - Create `features/calculator/` hooks and types
   - Move calculation-related state from App.tsx
   - Update App.tsx to use `<Calculator />`
   - Verify Calculator still works standalone

5. **Extract Sessions feature**
   - Create `components/sessions/SessionsModal.tsx` (already exists, copy into new structure)
   - Create `useSessionManagement()` hook
   - Move session state from App.tsx
   - Update ConfigSidebar to use hook

6. **Create base layouts**
   - Create `MainLayout` (App.tsx content without calculator)
   - Create `AdminLayout` (for admin routes)
   - Update App.tsx routing

**Checkpoint:**
- ✅ All tests pass
- ✅ Calculator works isolated from App.tsx
- ✅ Sessions work with hook
- ✅ All routes still function

### Phase 3: Refactor RankingPage (Higher Risk, Higher Value) — Weeks 5-6

7. **Create ranking hooks**
   - Create `useRankingData()` — loads members, matches from Firestore
   - Create `useRankingMembers()` — member CRUD
   - Create `useRankingMatches()` — match CRUD
   - Create `useMatchForm()` — form state for new match
   - Extract existing RankingPage logic into hooks

8. **Decompose RankingPage**
   - Keep RankingPage as layout/orchestrator
   - RankingPanel, MembersPanel, MatchFormPanel become simpler (just render, use props)
   - Move state management to hooks

9. **Test RankingPage thoroughly**
   - Verify all panels display correctly
   - Test member add/edit/delete
   - Test match recording
   - Test public vs authenticated views

**Checkpoint:**
- ✅ All RankingPage tests pass
- ✅ Member operations work
- ✅ Match recording works
- ✅ Public and authenticated views work
- ✅ Local storage and Firestore sync still work

### Phase 4: Clean Up & Optimize (Low Risk, Medium Value) — Weeks 7-8

10. **Refactor remaining components**
    - Split large modals (ConfigSidebar)
    - Add `React.memo()` to presentational components
    - Add `useCallback()` to event handlers
    - Lazy load admin routes

11. **Code quality pass**
    - Add missing TypeScript types
    - Remove all `any` types
    - Add error boundaries
    - Improve error messages

12. **Documentation**
    - Add JSDoc comments to hooks
    - Document folder structure
    - Create component usage examples
    - Update CLAUDE.md with new architecture

13. **Performance testing**
    - Measure bundle size before/after
    - Check React DevTools for unnecessary renders
    - Verify lazy loading works

**Checkpoint:**
- ✅ All tests pass
- ✅ Bundle size doesn't increase significantly
- ✅ No performance regressions
- ✅ Code is well-documented
- ✅ Ready for production

---

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Break calculator logic | High | Medium | Extract hooks with 100% test coverage first |
| Break RankingPage | High | High | Refactor in phases, test each step |
| Firebase integration breaks | High | Low | Keep firebase.ts untouched, test carefully |
| Routing breaks | Medium | Medium | Test all routes after each phase |
| Performance regression | Medium | Low | Measure with DevTools, lazy load routes |
| Type errors from refactoring | Low | High | Use TypeScript strict mode, lint |

---

## Success Criteria

- [ ] All existing tests pass
- [ ] New hooks have >80% test coverage
- [ ] No TypeScript errors or warnings
- [ ] App starts without errors
- [ ] All routes work as before
- [ ] Calculator works identically
- [ ] RankingPage works identically
- [ ] localStorage/Firestore sync works
- [ ] Analytics continue to work
- [ ] No console errors or warnings
- [ ] Bundle size doesn't increase >10%
- [ ] Build time doesn't increase >20%

---

## File Organization Reference

### Before & After: Calculator State

**Before (App.tsx, lines 98-114):**
```typescript
const [courtFeeInput, setCourtFeeInput] = useState(
  () => loadStoredInputDraft(storageScopeKey).courtFeeInput,
);
const [shuttleCountInput, setShuttleCountInput] = useState(
  () => loadStoredInputDraft(storageScopeKey).shuttleCountInput,
);
// ... repeated 2 more times
```

**After (features/calculator/hooks/useCostCalculatorState.ts):**
```typescript
export const useCostCalculatorState = (userId: string) => {
  const [inputs, setInputs] = useState(() => 
    loadStoredInputDraft(userId)
  );
  // ... auto-save, reset, etc.
  return { inputs, setInputs, reset };
};
```

**Usage in App/Calculator:**
```typescript
const { inputs, setInputs, reset } = useCostCalculatorState(userId);
```

---

## Commit Checkpoints

After each phase, create a commit with a clear message:

```
Phase 1: Create generic hooks (useLocalStorage, useAsync)
Phase 2: Extract calculator feature
Phase 3: Extract sessions feature
Phase 4: Refactor RankingPage data management
Phase 5: Decompose RankingPage UI components
Phase 6: Code quality & performance pass
```

---

## Next Steps

1. Review this plan with the team
2. Approve Phase 1 scope
3. Start with generic hooks (lowest risk)
4. Create tests for each new hook
5. Gradually migrate App.tsx
6. Test thoroughly at each checkpoint
7. Document new patterns

