# BadGuys Architecture Migration - Task Breakdown

**Timeline:** 3 weeks | **Complexity:** High | **Risk:** Medium

---

## Phase 1: Establish React Query as Standard (3-4 days)

### Task 1.1: Create useRankingMatchesQuery Hook

**Goal:** Extract match fetching logic into standardized React Query hook.

**Files:**
- Create: `src/hooks/queries/useRankingMatchesQuery.ts`

**Implementation checklist:**
- [ ] Define `rankingMatchesKeys` factory (queryKey)
- [ ] Implement `useRankingMatchesQuery()` (fetch only)
- [ ] Implement `useRankingMatchesMutation()` (create/update)
- [ ] Mutation onSuccess invalidates `rankingMatchesKeys.all`
- [ ] Add to `src/hooks/queries/index.ts`

**Acceptance:** Hook compiles, no component changes yet.

**Verification:**
```bash
npm run build  # Should not error
```

---

### Task 1.2: Create useRankingCategoriesQuery Hook

**Goal:** Extract category fetching logic into standardized React Query hook.

**Files:**
- Create: `src/hooks/queries/useRankingCategoriesQuery.ts`

**Implementation checklist:**
- [ ] Define `rankingCategoriesKeys` factory
- [ ] Implement `useRankingCategoriesQuery()` (fetch only)
- [ ] Add to `src/hooks/queries/index.ts`

**Acceptance:** Hook compiles, caching strategy documented.

---

### Task 1.3: Update useRankingMembersQuery and Config

**Goal:** Ensure existing query hook is complete and follows the pattern.

**Files:**
- Update: `src/hooks/queries/useRankingMembersQuery.ts`
- Update: `src/hooks/queries/config.ts`

**Implementation checklist:**
- [ ] Verify `useRankingMembersQuery()` and `useRankingMembersMutation()` exist
- [ ] Review query defaults (staleTime, refetchInterval, etc.)
- [ ] Document cache strategy in `config.ts`
- [ ] Ensure all mutations invalidate correctly

**Acceptance:** All three query hooks follow same pattern, documented.

---

## Phase 2a: Create RankingMembersContainer (4-5 days)

### Task 2a.1: Create RankingMembersContainer Component

**Goal:** Build container that owns member data fetching + form state.

**Files:**
- Create: `src/features/ranking/containers/RankingMembersContainer.tsx`
- Create: `src/features/ranking/containers/index.ts`

**Implementation checklist:**
- [ ] Fetch members via `useRankingMembersQuery()`
- [ ] Fetch categories via `useRankingCategoriesQuery()`
- [ ] Manage member form state (local useState): isEditing, formName, formLevel
- [ ] Define mutation handlers: handleAddMember, handleEditMember, handleDeleteMember
- [ ] Call mutations on user action (not immediate)
- [ ] Render `<MembersPanel>` with props (data + callbacks)
- [ ] No context injection (no useRankingMembersContext)

**Props passed to MembersPanel:**
```typescript
<MembersPanel
  members={members}
  categories={categories}
  isLoading={isLoading}
  isEditing={isEditing}
  formName={formName}
  formLevel={formLevel}
  canManage={isAdmin}
  onAddMember={handleAddMember}
  onEditMember={handleEditMember}
  onDeleteMember={handleDeleteMember}
  onStartEditMember={(member) => { setIsEditing(member.id); ... }}
  onSetFormName={setFormName}
  onSetFormLevel={setFormLevel}
/>
```

**Acceptance:** Container compiles, no prop drilling, fetches + renders correctly.

---

### Task 2a.2: Refactor MembersPanel to Accept Props Only

**Goal:** Convert MembersPanel from context-dependent to props-only.

**Files:**
- Update: `src/components/ranking/MembersPanel.tsx`

**Changes:**
- [ ] Remove `useRankingMembersContext()` call
- [ ] Accept all data + callbacks via props
- [ ] No mutations in component (only call handlers)
- [ ] TypeScript types: define interface for props

**Before:**
```typescript
const { members, isLoading, handleAddOrEditMember, ... } = useRankingMembersContext();
```

**After:**
```typescript
function MembersPanel({
  members, 
  categories, 
  isLoading, 
  isEditing, 
  formName, 
  formLevel,
  canManage,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onStartEditMember,
  onSetFormName,
  onSetFormLevel,
}: MembersPanelProps) {
  // No context hooks
}
```

**Acceptance:** Component renders with props, all member operations work.

**Tests:**
- [ ] Add member works
- [ ] Edit member works
- [ ] Delete member works
- [ ] Form state updates

---

## Phase 2b: Create RankingMatchesContainer (5-6 days)

### Task 2b.1: Create RankingMatchesContainer Component

**Goal:** Build container that owns match data fetching + form state.

**Files:**
- Create: `src/features/ranking/containers/RankingMatchesContainer.tsx`

**Implementation checklist:**
- [ ] Fetch matches via `useRankingMatchesQuery()`
- [ ] Fetch members + categories (from parent or re-fetch)
- [ ] Manage match form state (local useState OR reuse useMatchForm)
- [ ] Define mutation handlers: handleSaveMatch, handleDeleteMatch, handleClearHistory
- [ ] Calculate rankings (from matches + members)
- [ ] Render `<MatchFormPanel>` + `<RankingPanel>` with props
- [ ] No RankingMatchesContext or RankingMembersContext

**Props to children:**
```typescript
<MatchFormPanel
  members={members}
  categories={categories}
  matches={matches}
  matchType={matchType}
  team1={team1}
  team2={team2}
  sets={sets}
  playedAt={playedAt}
  onSetMatchType={setMatchType}
  onSetTeam1={setTeam1}
  onSetTeam2={setTeam2}
  onSetSets={setSets}
  onSetPlayedAt={setPlayedAt}
  onSaveMatch={handleSaveMatch}
/>

<RankingPanel
  rankings={rankings}
  members={members}
  matches={matches}
  onDeleteMatch={handleDeleteMatch}
  onClearHistory={handleClearHistory}
/>
```

**Acceptance:** Container compiles, fetches + renders, matches display and save correctly.

---

### Task 2b.2: Refactor MatchFormPanel and RankingPanel to Props-Only

**Goal:** Convert both components from context-dependent to props-only.

**Files:**
- Update: `src/components/ranking/MatchFormPanel.tsx`
- Update: `src/components/ranking/RankingPanel.tsx`

**Changes for MatchFormPanel:**
- [ ] Remove `useRankingMatchesContext()` + `useRankingMembersContext()` calls
- [ ] Accept all data + callbacks via props
- [ ] No mutations in component

**Changes for RankingPanel:**
- [ ] Remove context calls
- [ ] Accept all data via props
- [ ] Render rankings, allow delete match

**Acceptance:** Both components render with props, match operations work.

---

## Phase 3: Migrate RankingPage (Members) (2-3 days)

### Task 3.1: Update RankingPage to Use RankingMembersContainer

**Goal:** Replace RankingMembersProvider with RankingMembersContainer.

**Files:**
- Update: `src/components/RankingPage.tsx`

**Changes:**
- [ ] Import `RankingMembersContainer` from features
- [ ] Remove `RankingMembersProvider`
- [ ] Replace with `<RankingMembersContainer />`
- [ ] Keep RankingUIProvider (global UI state)
- [ ] Keep RankingMatchesBridge for now (will remove in Phase 4)

**Before:**
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

**After:**
```typescript
<RankingUIProvider>
  <RankingMembersContainer />
  <RankingMatchesBridge>
    <RankingMatchesProvider>
      <RankingPageInner />
    </RankingMatchesProvider>
  </RankingMatchesBridge>
</RankingUIProvider>
```

**Acceptance:** Member management works, no regressions.

**Tests:**
- [ ] Members display
- [ ] Add/edit/delete member works
- [ ] No console errors

---

## Phase 4: Flatten Nesting + Migrate RankingMatches (3-4 days)

### Task 4.1: Integrate RankingMatchesContainer into RankingPage

**Goal:** Replace RankingMatchesProvider with RankingMatchesContainer, remove RankingMatchesBridge.

**Files:**
- Update: `src/components/RankingPage.tsx`
- Update: `src/components/ranking/RankingViewContent.tsx` (likely removed)
- Delete: `RankingMatchesBridge` component

**Changes:**
- [ ] Import `RankingMatchesContainer`
- [ ] Remove `RankingMatchesBridge`
- [ ] Remove `RankingMatchesProvider`
- [ ] Replace with `<RankingMatchesContainer />`
- [ ] Pass required props (members, currentUserId, usernamesById) to RankingMatchesContainer
- [ ] Update RankingPageInner to not expect RankingMatchesContext

**Before:**
```typescript
<RankingUIProvider>
  <RankingMembersContainer />
  <RankingMatchesBridge>
    <RankingMatchesProvider>
      <RankingPageInner />
    </RankingMatchesProvider>
  </RankingMatchesBridge>
</RankingUIProvider>
```

**After:**
```typescript
<RankingUIProvider>
  <RankingPageHeader />
  <RankingSidebar />
  <RankingMembersContainer />
  <RankingMatchesContainer
    currentUserId={currentUser?.userId}
    currentUsername={currentUser?.username}
    usernamesById={usernamesById}
    isAdmin={isAdmin}
  />
</RankingUIProvider>
```

**Acceptance:** All match operations work, flattened provider tree.

**Tests:**
- [ ] Record match works
- [ ] Delete match works
- [ ] Match history pagination works
- [ ] Rankings display
- [ ] No RankingMatchesProvider or RankingMembersProvider in component tree

---

### Task 4.2: Verify Data Flow and Integration

**Goal:** Smoke test entire ranking feature, no regressions.

**Checklist:**
- [ ] Load ranking page
- [ ] Add member
- [ ] Edit member
- [ ] Delete member
- [ ] Record match (singles)
- [ ] Record match (doubles)
- [ ] View match history
- [ ] Pagination works
- [ ] Delete match works
- [ ] Rankings calculated correctly
- [ ] No console errors or warnings

**Acceptance:** All operations work, no regressions.

---

## Phase 5: Deprecate and Delete Old Code (2-3 days)

### Task 5.1: Delete Old Custom Hooks

**Goal:** Remove now-unused custom hooks.

**Files to delete:**
- [ ] `src/features/ranking/hooks/useRankingMembers.ts`
- [ ] `src/features/ranking/hooks/useRankingMatches.ts`
- [ ] `src/features/ranking/hooks/useRankingCategories.ts`

**Before deletion checklist:**
- [ ] Search codebase: `grep -r "useRankingMembers[^Q]" src/`
  - Should find only exports in `src/features/ranking/hooks/index.ts`, nowhere else
- [ ] Search codebase: `grep -r "useRankingMatches" src/`
  - Should find only in RankingMatchesContext (which will be deleted next)
- [ ] Search codebase: `grep -r "useRankingCategories[^Q]" src/`
  - Should find only in RankingMembersContext (which will be deleted next)

**Acceptance:** No references to old hooks in codebase.

---

### Task 5.2: Delete Old Context Providers

**Goal:** Remove now-unused context providers.

**Files to delete:**
- [ ] `src/features/ranking/context/RankingMembersContext.tsx`
- [ ] `src/features/ranking/context/RankingMatchesContext.tsx`
- [ ] Keep: `src/features/ranking/context/RankingUIContext.tsx` (global UI state)

**Before deletion checklist:**
- [ ] Search codebase: `grep -r "RankingMembersProvider\|useRankingMembersContext" src/`
  - Should find zero matches
- [ ] Search codebase: `grep -r "RankingMatchesProvider\|useRankingMatchesContext" src/`
  - Should find zero matches
- [ ] Search codebase: `grep -r "RankingMatchesBridge" src/`
  - Should find zero matches

**Update exports:**
- [ ] Update `src/features/ranking/context/index.ts` to only export `RankingUIContext`

**Acceptance:** No references to old contexts in codebase.

---

### Task 5.3: Final Verification

**Goal:** Ensure app runs without warnings or errors.

**Checklist:**
- [ ] TypeScript compilation: `npm run build` (no errors)
- [ ] Run tests: `npm test -- --run` (all pass)
- [ ] Visual regression: start dev server, test all pages
  - [ ] Main calculator page
  - [ ] Ranking dashboard
  - [ ] User management (admin)
  - [ ] Audit log (admin)
- [ ] Feature completeness: test all CRUD operations
  - [ ] Members: create, read, edit, delete
  - [ ] Matches: create, read, delete, history pagination
  - [ ] Categories: view, display correctly
- [ ] No console errors or warnings

**Acceptance:** App runs cleanly, feature parity maintained.

---

## Checkpoints & Reviews

| After Phase | Review Points |
|------------|---|
| Phase 1 | React Query hooks are complete, tested, and follow the standard pattern. No component changes yet. |
| Phase 2a | RankingMembersContainer works, MembersPanel renders with props, no context injection. |
| Phase 2b | RankingMatchesContainer works, both child components render with props. |
| Phase 3 | RankingPage uses RankingMembersContainer, member operations work. |
| Phase 4 | Provider tree is flat (only RankingUIContext), all match + member operations work. |
| Phase 5 | Old code deleted, app runs without errors, feature parity verified. |

---

## Success Criteria (Final)

- [x] Zero direct Supabase calls outside `src/lib/api.ts` and React Query hooks
- [x] Zero server data stored in context
- [x] RankingUIContext is only remaining context for ranking feature
- [x] All member + match operations work (CRUD, validation, pagination)
- [x] No prop drilling chains > 5 levels
- [x] TypeScript builds cleanly
- [x] All tests pass
- [x] App runs without console errors or warnings
- [x] Feature parity: no lost functionality

---

## Risk Mitigation Checklist

| Risk | Mitigation | Owner | Deadline |
|------|-----------|-------|----------|
| RankingMatchesBridge breaks when removed | Test in Phase 4.1 before deletion; have rollback plan | Dev | After Phase 4 |
| Missing cache invalidation | Audit mutations in Phase 1; add tests | Dev | After Phase 1 |
| Form state lost during refactor | Use local useState in containers, not context | Dev | Phase 2a/2b |
| Members not loaded when RankingMatches uses them | RankingMatchesContainer fetches independently; no dependency | Design | Verified in Phase 1 |
| Old hook/context still referenced after deletion | Run grep before deletion; lint output | Dev | Phase 5 |
| Regression in ranking calculations | Test rankings match in Phase 4.2; visual inspect | QA | Phase 4-5 |

---

## Developer Notes

### Helpful grep commands:

Check for stray context usage:
```bash
grep -r "useRankingMembersContext\|useRankingMatchesContext" src/
grep -r "RankingMembersProvider\|RankingMatchesProvider" src/
```

Check for direct Supabase calls:
```bash
grep -r "getRankingMembers\|getMatches\|saveRankingMembers" src/components src/features/ranking --exclude-dir=hooks
```

### Useful test commands:

```bash
# Build + type check
npm run build

# Run tests once
npm test -- --run

# Run specific test
npm test -- src/features/ranking/containers/RankingMembersContainer.test.tsx --run

# Dev server
npm run dev
```

---

## Timeline Summary

| Phase | Duration | Owner | Parallelizable |
|-------|----------|-------|---|
| 1 | 3-4 days | Dev | No (prerequisite) |
| 2a | 4-5 days | Dev | Yes (parallel with 2b) |
| 2b | 5-6 days | Dev | Yes (parallel with 2a) |
| 3 | 2-3 days | Dev | No (depends on 2a) |
| 4 | 3-4 days | Dev | No (depends on 2b, 3) |
| 5 | 2-3 days | Dev | No (final phase) |
| **Total** | **~3 weeks** | | |

**Optimized sequence:**
1. Week 1: Phase 1 (3-4 days) + Phase 2a/2b in parallel (5-6 days)
2. Week 2: Phase 3 (2-3 days) + Phase 4 (3-4 days)
3. Week 3: Phase 5 (2-3 days) + buffer for fixes

---

## Rollback Plan

If critical issues arise after a phase:

1. **Phase 1 rollback:** None needed (no component changes)
2. **Phase 2a rollback:** Keep RankingMembersProvider, don't use RankingMembersContainer yet
3. **Phase 2b rollback:** Keep RankingMatchesProvider, don't use RankingMatchesContainer yet
4. **Phase 3 rollback:** Revert RankingPage to use RankingMembersProvider
5. **Phase 4 rollback:** Revert RankingPage to use RankingMatchesProvider + RankingMatchesBridge
6. **Phase 5 rollback:** Restore deleted files from git

---
