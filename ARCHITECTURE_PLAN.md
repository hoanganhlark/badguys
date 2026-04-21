# BadGuys Ranking App Architecture Refactoring Plan

## Executive Summary

The BadGuys ranking app has accumulated architectural debt in data fetching, state management, and component organization. This plan outlines a phased migration toward a clean, maintainable architecture that enforces clear separation of concerns.

**Current State:** Mixed data fetching (custom hooks + unused React Query), deep prop drilling, context bloat, unclear data ownership.

**Target State:** React Query owns all server data, feature containers own data fetching, contexts reserved for global/UI state only, clear container vs presentational boundaries.

---

## Part 1: High-Level Architectural Problems

### Problem 1: Dual Data Fetching Patterns (Mixed Standards)

**Status:** CRITICAL

**Current:**
- `useRankingMembers()` in `src/features/ranking/hooks/` uses custom hook pattern: `useState` + `useEffect` + direct Supabase calls
- `useRankingMembersQuery()` exists in `src/hooks/queries/` but is **not used** in RankingMembersContext
- `useRankingMatches()` in `src/features/ranking/hooks/` follows same custom pattern
- `useRankingCategories()` in `src/features/ranking/hooks/` follows same custom pattern
- No consistent standard; developers must choose between two incompatible patterns

**Why it's a problem:**
- Custom hooks don't cache, deduplicate, or manage refetches properly
- React Query hooks offer retry logic, background sync, cache management—but unused
- Cache invalidation is manual and error-prone
- Developers waste time reimplementing React Query functionality
- Mixing patterns makes it unclear when to use which approach

**Code locations:**
- `src/features/ranking/hooks/useRankingMembers.ts` (lines 116-144)
- `src/features/ranking/hooks/useRankingMatches.ts` (lines 108-200+)
- `src/features/ranking/hooks/useRankingCategories.ts` (lines 36-51)
- `src/hooks/queries/useRankingMembers.ts` (exists but unused)

---

### Problem 2: Deep Prop Drilling via Provider Bridges

**Status:** HIGH

**Current Flow:**
```
RankingPage (fetches users, builds usernamesById)
  ├─ RankingUIProvider (top-level, wraps entire tree)
  ├─ RankingMembersProvider (fetches members)
  │   └─ RankingMatchesBridge (manual bridge component)
  │       └─ RankingMatchesProvider (receives members as prop)
  │           └─ RankingPageInner
  │               ├─ RankingPageHeader
  │               ├─ RankingSidebar
  │               └─ RankingPageContent
  │                   ├─ MembersPanel
  │                   ├─ MatchFormPanel
  │                   └─ RankingPanel
  │                       └─ PlayerStatsModalWrapper
```

**Data flow problem:**
- `RankingPage` fetches `users` (list of all system users)
- Builds `usernamesById` map and passes it down
- Passes to `RankingMatchesBridge`, which passes to `RankingMatchesProvider`
- `RankingPageContent` consumes contexts from both `RankingMembersProvider` and `RankingMatchesProvider`
- MembersPanel and MatchFormPanel both reach into both contexts

**Why it's a problem:**
- Three nested context providers make testing and refactoring hard
- RankingMatchesBridge exists only to bridge data between providers
- Unclear which component owns which data
- Changes to data structure ripple through multiple layers
- Hard to add/remove features without touching 5+ components

**Code locations:**
- `src/components/RankingPage.tsx` (lines 44-88)
- `src/features/ranking/context/RankingMembersContext.tsx` (line 43)
- `src/features/ranking/context/RankingMatchesContext.tsx` (line 91-98)

---

### Problem 3: Context Bloat—Form State Mixed with Server State

**Status:** HIGH

**Current:**
```typescript
// RankingMembersContext mixes three concerns:
type RankingMembersContextValue = {
  // Server data (should be from useRankingMembersQuery)
  members: Member[];
  isLoading: boolean;
  categories: any[];  // <- Should be from useRankingCategoriesQuery
  sortedCategories: any[];
  
  // Form state (UI local state)
  isEditing: number | null;
  memberFormName: string;
  memberFormLevel: RankingLevel;
  
  // Handlers (mix of data mutations and form updates)
  handleAddOrEditMember: () => void;
  handleDeleteMember: (id: number) => void;
};
```

**Why it's a problem:**
- Hard to reason about: Is this a server-state container or a form?
- Testing is complex: must mock both data and form handlers
- Reusing form state logic elsewhere is impossible
- If members don't load, form state still exists (confusing)
- Unclear where mutations should go (form handler? mutation hook?)

**Code locations:**
- `src/features/ranking/context/RankingMembersContext.tsx` (lines 13-32)
- `src/features/ranking/context/RankingMatchesContext.tsx` (lines 34-76)

---

### Problem 4: Unsafe Data Dependencies in Nested Providers

**Status:** MEDIUM

**Current:**
```typescript
// RankingMatchesBridge passes members from RankingMembersProvider to RankingMatchesProvider
function RankingMatchesBridge({ children }: Props) {
  const { members } = useRankingMembersContext();  // What if still loading?
  
  return (
    <RankingMatchesProvider
      members={members}  // Passed as prop, could be empty []
      // ...
    >
      {children}
    </RankingMatchesProvider>
  );
}
```

**Why it's a problem:**
- No guarantee members are loaded before RankingMatchesProvider accesses them
- RankingMatchesProvider must handle empty members array gracefully
- If members load, RankingMatchesProvider doesn't re-run its logic unless it re-renders
- Race conditions possible in data dependencies

**Code locations:**
- `src/components/RankingPage.tsx` (lines 63-88)
- `src/features/ranking/context/RankingMatchesContext.tsx` (lines 91-200)

---

### Problem 5: No Clear Container vs Presentational Boundary

**Status:** MEDIUM

**Current:**
- Components like `MembersPanel`, `MatchFormPanel`, `RankingPanel` access contexts directly
- No single "container" component that owns data and passes it down
- Each component reaches into both `RankingMembersContext` and `RankingMatchesContext`
- Hard to find where mutations happen

**Example:**
```typescript
// MembersPanel.tsx reaches into context for data AND handlers
const { members, isLoading, handleAddOrEditMember, ... } = useRankingMembersContext();
```

**Why it's a problem:**
- Presentational components are tied to context structure
- Can't reuse components in different features without context
- Mutations are hidden inside context, hard to track
- Testing requires context mocks instead of simple prop mocks

**Code locations:**
- `src/components/ranking/MembersPanel.tsx` (lines 34-49)
- `src/components/ranking/MatchFormPanel.tsx` (lines 32-50)
- `src/components/ranking/RankingPanel.tsx` (entire file)

---

### Problem 6: Inconsistent Hook Patterns (useRankingMembers vs useRankingMembersQuery)

**Status:** MEDIUM

**Current:**
- `src/hooks/queries/useRankingMembers.ts` defines `useRankingMembersQuery()` (React Query)
- `src/features/ranking/hooks/useRankingMembers.ts` defines `useRankingMembers()` (custom)
- RankingMembersContext uses the custom hook, not the Query hook
- Similar situation for matches and categories

**Why it's a problem:**
- Code exists but is unused (dead code)
- Developers are confused about which to use
- React Query benefits (caching, deduplication) are not realized
- Two ways to do the same thing

---

## Part 2: Target Architecture

### Core Principles

1. **React Query Owns Server Data**
   - All data from Supabase flows through `useQuery` hooks
   - No direct Supabase calls except in `src/lib/api.ts`
   - Cache invalidation via `queryClient.invalidateQueries()`

2. **Feature Containers Own Data Fetching**
   - `RankingMembersContainer` fetches members + categories
   - `RankingMatchesContainer` fetches matches
   - Containers pass data to presentational components via props

3. **Props for Component Inputs, Context for Global State**
   - Props: feature data, callbacks, UI props
   - Context: auth state, global UI state (theme, modals), i18n
   - NOT server data

4. **Separate Concerns: Data, Form State, UI State**
   - Data mutations: handled by React Query mutations
   - Form state: local component state or custom form hooks
   - UI state: contexts only for genuinely global state

5. **Single Responsibility per Context**
   - `RankingUIContext`: modal open/close, sidebar toggle, view selection
   - Form state: managed locally in containers or via custom hooks
   - Server data: fetched in containers, passed via props

### Target Structure

```
src/features/ranking/
├── hooks/
│   ├── useRankingMembers.ts (DELETED - replaced by useRankingMembersQuery)
│   ├── useRankingMatches.ts (DELETED - replaced by useRankingMatchesQuery)
│   ├── useRankingCategories.ts (DELETED - replaced by useRankingCategoriesQuery)
│   ├── useMatchForm.ts (KEPT - local form state only)
│   └── index.ts (updated exports)
│
├── containers/  (NEW)
│   ├── RankingMembersContainer.tsx
│   │   ├── Fetches: members, categories (via useQuery)
│   │   ├── Manages: member form state
│   │   └── Renders: MembersPanel (presentational)
│   │
│   ├── RankingMatchesContainer.tsx
│   │   ├── Fetches: matches (via useQuery)
│   │   ├── Manages: match form state
│   │   └── Renders: MatchFormPanel + RankingPanel (presentational)
│   │
│   └── index.ts
│
├── context/
│   ├── RankingUIContext.tsx (UNCHANGED - UI state only)
│   ├── RankingMembersContext.tsx (DELETED)
│   ├── RankingMatchesContext.tsx (DELETED)
│   └── index.ts (updated exports)
│
└── components/ (moved to src/components/ranking, unchanged)
    ├── MembersPanel.tsx (props-only)
    ├── MatchFormPanel.tsx (props-only)
    ├── RankingPanel.tsx (props-only)
    └── ...
```

### Data Flow (Target)

```
RankingPage
  ├─ RankingUIProvider
  │   └─ RankingMembersContainer
  │       ├─ Fetches members + categories via useQuery
  │       ├─ Manages member form state (useState)
  │       └─ Renders MembersPanel (props: members, categories, onAdd, onEdit, ...)
  │
  └─ RankingMatchesContainer
      ├─ Fetches matches via useQuery
      ├─ Manages match form state (useMatchForm hook)
      └─ Renders MatchFormPanel + RankingPanel
          └─ (props: matches, rankings, onSave, onDelete, ...)
```

**Key improvements:**
- Single level of provider nesting (RankingUIContext only)
- Data ownership is explicit (containers fetch, render presentational components)
- Props are the contract between containers and presentational components
- Form state is colocated with its container
- Easy to test: mock props instead of context

---

## Part 3: Phased Migration Plan

### Overview

Five phases, each with clear success criteria. Phases can be partially parallelized, but listed in dependency order.

### Phase 1: Establish React Query as Standard (Week 1)
**Goal:** Create all missing React Query hooks, establish cache patterns.
**No component changes yet—just hook layer.**

**Deliverables:**
1. `src/hooks/queries/useRankingMembersQuery.ts` (update existing, ensure used)
2. `src/hooks/queries/useRankingMatchesQuery.ts` (create new)
3. `src/hooks/queries/useRankingCategoriesQuery.ts` (create new)
4. `src/hooks/queries/config.ts` (document cache strategy)

**Acceptance Criteria:**
- [ ] All three hooks defined with proper queryKey factories
- [ ] Mutations have onSuccess cache invalidation
- [ ] Query defaults documented (refetchInterval, staleTime, etc.)
- [ ] No custom hooks in RankingMembersContext yet (deferred to Phase 3)

**Verification:**
```bash
# Should not error; hooks are side-effect free
npx tsc --noEmit
```

---

### Phase 2: Create Feature Containers (Week 1-2)
**Goal:** Build containers that fetch data and manage local form state.
**Renders presentational components via props.**

#### 2a: RankingMembersContainer

**File:** `src/features/ranking/containers/RankingMembersContainer.tsx`

```typescript
export function RankingMembersContainer() {
  // Fetch data via React Query
  const { data: members = [], isLoading } = useRankingMembersQuery();
  const { data: categories = [] } = useRankingCategoriesQuery();
  
  // Local form state (not in context)
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState<RankingLevel>("");
  
  // Mutations
  const { mutateAsync: saveMembersAsync } = useRankingMembersMutation();
  
  // Handlers that manage local state + trigger mutations
  const handleAddMember = async (name: string, level: RankingLevel) => {
    const newMembers = [...members, { id: generateId(), name, level }];
    await saveMembersAsync(newMembers);
    setFormName("");
    setFormLevel("");
  };
  
  // Render presentational component with props
  return (
    <MembersPanel
      members={members}
      categories={categories}
      isLoading={isLoading}
      isEditing={isEditing}
      formName={formName}
      formLevel={formLevel}
      onAddMember={handleAddMember}
      onEditMember={...}
      onDeleteMember={...}
      onSetFormName={setFormName}
      onSetFormLevel={setFormLevel}
    />
  );
}
```

**Acceptance Criteria:**
- [ ] Container fetches members and categories via useQuery
- [ ] Form state is local (useState), not in context
- [ ] Mutations triggered by handlers
- [ ] Renders MembersPanel with props only (no context injection)
- [ ] All member operations work (add, edit, delete)

**Code changes:**
- Create new file: `src/features/ranking/containers/RankingMembersContainer.tsx`
- Update `src/components/ranking/MembersPanel.tsx` to accept props (not context)
- Do NOT remove RankingMembersContext yet

#### 2b: RankingMatchesContainer

**File:** `src/features/ranking/containers/RankingMatchesContainer.tsx`

**Similar structure:**
- Fetch matches via useRankingMatchesQuery
- Manage match form state (reuse useMatchForm if possible, or local useState)
- Render MatchFormPanel and RankingPanel with props

**Acceptance Criteria:**
- [ ] Container fetches matches and calculates rankings
- [ ] Match form state managed locally
- [ ] Match mutations (add, delete, clear history) work
- [ ] Renders child components with props only

---

### Phase 3: Migrate RankingPage to Use Containers (Week 2)
**Goal:** Replace RankingMembersProvider with RankingMembersContainer.
**Keep RankingMatchesProvider for now (nested transition).**

**Current:**
```typescript
<RankingUIProvider>
  <RankingMembersProvider>
    <RankingMatchesBridge>
      <RankingMatchesProvider>
        <RankingPageInner />
      </RankingMatchesProvider>
    </RankingMatchesBridge>
  </RankingMembersProvider>
</RankingUIProvider>
```

**Target (intermediate):**
```typescript
<RankingUIProvider>
  <RankingMembersContainer />
  <RankingMatchesProvider>
    <RankingPageInner />
  </RankingMatchesProvider>
</RankingUIProvider>
```

**Code changes:**
- `src/components/RankingPage.tsx`: Replace `RankingMembersProvider` with `RankingMembersContainer`
- Move `usernamesById` mapping into RankingMatchesContainer (no longer passed as prop)
- Remove RankingMatchesBridge

**Acceptance Criteria:**
- [ ] Member management still works
- [ ] No regressions in member form or table
- [ ] RankingMatchesBridge is removed
- [ ] RankingPageInner still renders without changes (for now)

---

### Phase 4: Migrate RankingMatches and Flatten Nesting (Week 2-3)
**Goal:** Replace RankingMatchesProvider with RankingMatchesContainer.
**Remove all provider nesting except RankingUIContext.**

**Code changes:**
- Create RankingMatchesContainer (if not already done in Phase 2b)
- Update RankingPageInner to not expect RankingMatchesProvider
- Pass match data as props to RankingViewContent

**Target structure:**
```typescript
<RankingUIProvider>
  <RankingPageHeader />
  <RankingSidebar />
  <RankingMembersContainer />
  <RankingMatchesContainer />
</RankingUIProvider>
```

**Acceptance Criteria:**
- [ ] All match operations work (add, delete, clear history, pagination)
- [ ] Rankings are calculated and displayed
- [ ] Match form validation works
- [ ] History pagination works
- [ ] No RankingMatchesProvider or RankingMembersProvider in tree

---

### Phase 5: Deprecate and Remove Old Custom Hooks (Week 3)
**Goal:** Delete old custom hooks, verify nothing breaks.**

**Code deletions:**
- `src/features/ranking/hooks/useRankingMembers.ts` (DEPRECATED)
- `src/features/ranking/hooks/useRankingMatches.ts` (DEPRECATED)
- `src/features/ranking/hooks/useRankingCategories.ts` (DEPRECATED)
- `src/features/ranking/context/RankingMembersContext.tsx` (DEPRECATED)
- `src/features/ranking/context/RankingMatchesContext.tsx` (DEPRECATED)
- Remove RankingMatchesBridge

**Update exports:**
- `src/features/ranking/hooks/index.ts`: Remove old hook exports
- `src/features/ranking/context/index.ts`: Keep only RankingUIContext

**Acceptance Criteria:**
- [ ] TypeScript compilation succeeds
- [ ] No unused imports or exports
- [ ] All tests pass
- [ ] App runs without errors
- [ ] Feature parity: all member/match operations still work

---

## Part 4: Decision Rules (Going Forward)

### Rule 1: Where to Fetch Data

**Decision tree:**
```
Is this server data (from Supabase)?
  ├─ YES: Use React Query hook (useQuery in container)
  │       ├─ Data is shared across components?
  │       │  └─ Fetch in closest common parent container
  │       └─ Data is feature-specific?
  │          └─ Fetch in feature container
  └─ NO: Manage with useState/useReducer in component or hook
```

**Examples:**
- Members list: fetch in RankingMembersContainer (shared by MembersPanel + RankingPanel)
- Matches list: fetch in RankingMatchesContainer (shared by MatchFormPanel + RankingPanel)
- Member form state: local useState in RankingMembersContainer
- Match form state: local useState or useMatchForm in RankingMatchesContainer
- Modal open/close: RankingUIContext (global UI state)

---

### Rule 2: How to Reduce Prop Drilling

**Option A: Prop Drilling (Preferred for <5 levels)**
```typescript
// Container passes data via props
<MembersPanel members={members} onAdd={handleAdd} ... />
```
**When:** < 5 props, clear logical flow, easy to reason about.

**Option B: Render Props / Composition**
```typescript
// Container provides "render" prop that receives data
<MembersSection render={(data) => <MembersPanel {...data} />} />
```
**When:** Many conditional branches or complex layouts.

**Option C: Context (ONLY for Global State)**
```typescript
// Auth context, theme context, i18n context
const { currentUser } = useAuth();
```
**When:** Used by >10 components, genuinely global, doesn't change frequently.

**DO NOT:**
- Use context for server data (use containers + props)
- Create context per feature (use containers instead)
- Pass function closures in context (prefer callbacks via props)

---

### Rule 3: When to Pass Props vs Use Hooks

| Scenario | Use Props | Use Hook |
|----------|-----------|----------|
| Data fetched in parent | ✓ | ✗ |
| Local form state | ✓ | ✗ |
| Shared server data (React Query) | ✗ | ✓ (in container only) |
| Auth / theme / i18n | ✗ | ✓ (global context) |
| Reusable form logic | ✗ | ✓ (custom hook) |
| Passing callbacks | ✓ | ✗ |
| Feature-specific mutations | ✓ (via callback) | ✗ (in container) |

---

### Rule 4: Container Responsibilities

A container should:
1. Fetch server data via React Query hooks
2. Manage local form/UI state (useState/useReducer)
3. Define mutation handlers
4. Call mutations on user actions
5. Pass data + handlers to presentational components via props
6. NOT render deeply nested children (max 2-3 levels)

A container should NOT:
- Call Supabase directly (use API layer in hooks)
- Store server data in context
- Render multiple unrelated features
- Use other containers as children

---

### Rule 5: Context Usage (Restricted)

**Allowed contexts:**
- AuthContext (user, role, login/logout)
- RankingUIContext (modal state, sidebar toggle, view selection)
- ThemeContext (if needed in future)
- i18nContext (language preference)

**NOT allowed as context:**
- Server data (members, matches, categories)
- Feature-specific state (form state)
- Derived data (rankings, statistics)

---

## Part 5: Implementation Order (Dependency Graph)

```
Phase 1: React Query Hooks
  ├─ No dependencies
  └─ Enables: Phase 2a, 2b

Phase 2a: RankingMembersContainer
  ├─ Depends on: Phase 1
  └─ Enables: Phase 3

Phase 2b: RankingMatchesContainer
  ├─ Depends on: Phase 1
  └─ Enables: Phase 4

Phase 3: Migrate RankingPage (Members)
  ├─ Depends on: Phase 2a
  └─ Enables: Phase 4

Phase 4: Migrate RankingPage (Matches) + Flatten
  ├─ Depends on: Phase 2b, Phase 3
  └─ Enables: Phase 5

Phase 5: Deprecate Old Code
  ├─ Depends on: Phase 4
  └─ Final state reached
```

**Can parallelize:** Phase 2a and 2b (start simultaneously after Phase 1)

---

## Part 6: Testing Strategy

### Unit Tests (per phase)

**Phase 1:**
- Test query hooks return data in expected shape
- Test query keys are stable (no new instances)
- Test mutations invalidate correct cache keys

**Phase 2a/2b:**
- Test containers fetch on mount
- Test mutation handlers call mutations
- Test form state updates locally
- Test callbacks are passed to presentational components

**Phase 3/4:**
- Integration: RankingPage + containers + presentational components
- Verify data flows correctly
- Verify mutations and form state work together

**Phase 5:**
- Smoke test: entire app works
- No console errors
- All feature functionality (CRUD, forms, display)

### E2E Tests (after Phase 5)

- User creates member
- User records match
- Rankings update
- User deletes match
- History pagination works

---

## Part 7: Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| RankingMatchesBridge breaking when removed | Test member fetch + match container independently before Phase 3 |
| Missed cache invalidation | Audit mutations in Phase 1, add tests |
| Form state lost during refactor | Keep local useState during transition, don't move to context |
| Data race (members not loaded before RankingMatches uses them) | RankingMatchesContainer fetches independently; no prop dependency |
| Components still referencing old context | Search codebase for `useRankingMembersContext`, `useRankingMatchesContext` before deletions |

---

## Part 8: Success Criteria (Overall)

- [x] All server data flows through React Query
- [x] No direct Supabase calls outside `src/lib/api.ts` and React Query hooks
- [x] No context bloat (contexts store only global/UI state)
- [x] Props are the contract between containers and presentational components
- [x] Provider nesting is flat (only RankingUIContext)
- [x] Prop drilling is minimal (most components receive < 8 props)
- [x] Form state is colocated with containers
- [x] All old custom hooks are deleted
- [x] All tests pass
- [x] App runs without warnings or errors
- [x] Feature parity maintained (no lost functionality)

---

## Appendix: File Map (Before → After)

| File | Current | Phase | Status |
|------|---------|-------|--------|
| `src/hooks/queries/useRankingMembers.ts` | Used | 1 | Update to standard |
| `src/hooks/queries/useRankingMatches.ts` | Missing | 1 | Create |
| `src/hooks/queries/useRankingCategories.ts` | Missing | 1 | Create |
| `src/features/ranking/hooks/useRankingMembers.ts` | Used | 5 | Delete (deprecated) |
| `src/features/ranking/hooks/useRankingMatches.ts` | Used | 5 | Delete (deprecated) |
| `src/features/ranking/hooks/useRankingCategories.ts` | Used | 5 | Delete (deprecated) |
| `src/features/ranking/context/RankingMembersContext.tsx` | Used | 3 | Delete (deprecated) |
| `src/features/ranking/context/RankingMatchesContext.tsx` | Used | 4 | Delete (deprecated) |
| `src/features/ranking/containers/RankingMembersContainer.tsx` | Missing | 2a | Create |
| `src/features/ranking/containers/RankingMatchesContainer.tsx` | Missing | 2b | Create |
| `src/components/RankingPage.tsx` | Current | 3-4 | Update (remove providers) |
| `src/components/ranking/MembersPanel.tsx` | Context-dependent | 2a | Update to props-only |
| `src/components/ranking/MatchFormPanel.tsx` | Context-dependent | 2b | Update to props-only |
| `src/components/ranking/RankingPanel.tsx` | Context-dependent | 2b | Update to props-only |

---

## Appendix: Decision Log

### Decision 1: Why React Query over Custom Hooks?

**Criteria:**
- Cache management ✓
- Deduplication ✓
- Automatic retries ✓
- Background refetch ✓
- DevTools support ✓

**Result:** React Query wins. Custom hooks provide none of these.

---

### Decision 2: Why Containers Instead of Just Props?

**Options:**
1. Fetch in RankingPage, pass to MembersPanel (prop drilling at top level)
2. Create RankingMembersContainer, fetch and render MembersPanel (current proposal)

**Rationale for option 2:**
- Clear separation: fetch logic is colocated with the feature
- Easier to test: mock props to components, test container separately
- Easier to refactor: move entire container if needed
- Scales: if feature grows (e.g., nested components), container absorbs complexity

---

### Decision 3: Why Not Use Jotai/Zustand for Server Data?

**Answer:** React Query is purpose-built for server data (caching, sync, deduplication). General state managers muddy concerns.

---

## Next Steps

1. **Review this plan** with the team
2. **Approve phasing and timeline** (adjust if needed)
3. **Kick off Phase 1** (React Query hooks—parallelizable, low risk)
4. **Check in after Phase 1** before proceeding to containers
5. **Run full test suite** after Phase 5 before shipping
