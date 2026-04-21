# Task List: Refactor Sessions & Standardize Loading States

## Phase 1: Sessions Loading Refactoring

- [ ] **Task 1**: Replace manual session state in App.tsx with useSessions hook
  - Remove sessionsLoading, sessionsError, sessions state
  - Import and use useSessions() hook
  - Update SessionsModal prop passing
  - Update openSessionsModal() to use hook.refetch()
  - Update handleRemoveSession() to use hook.removeSession()

- [ ] **Task 2**: Update error messages and remove Firebase references
  - Replace Firebase error message keys with neutral equivalents
  - Grep for firebase references and clean up
  - Review translation strings

## Phase 2: Loading States Standardization

- [ ] **Task 3**: Audit all async-data-loading components
  - List all components using useQuery or fetching data
  - Document which have loading spinners
  - Document which are missing spinners

- [ ] **Task 4**: Add missing loading spinners
  - Add Spin components to any data-fetching components without spinners
  - Ensure centered layout, no shift
  - Add i18n tips

- [ ] **Task 5**: Standardize loading state in Ranking contexts
  - Expose isLoading flags from RankingMembersContext
  - Expose isLoading flags from RankingMatchesContext
  - Verify consuming components can use these flags

## Phase 3: Final Verification

- [ ] **Task 6**: Type safety and build verification
  - Run npm run build
  - Run npm test -- --run
  - Grep for firebase references
  - Check for unused imports

- [ ] **Task 7**: Documentation and commit
  - Add comments explaining query hook usage
  - Create git commit with clear message
  - Verify alignment with CLAUDE.md

## Checkpoints

- [ ] **Checkpoint 1** (after Task 2): Sessions refactoring complete
  - Sessions modal works with React Query
  - No manual state in App.tsx
  - Error messages updated

- [ ] **Checkpoint 2** (after Task 5): Loading states standardized
  - All async components identified
  - All show loading spinners
  - Contexts expose loading flags

- [ ] **Checkpoint 3** (after Task 7): Final verification complete
  - Build succeeds
  - Tests pass
  - Ready for commit
