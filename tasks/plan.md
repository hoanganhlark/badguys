# Plan: Glicko-2 `rankingStats.ts` Refactor

## Context

The current `rankingStats.ts` does not implement two improvements defined in `docs/GLICKO2_RATING_IMPROVEMENT.md`:

1. **Virtual Opponent** — doubles players should compete against a virtual aggregate of the opposing team, not all cross-product pairings
2. **Multiplier** — each set should be weighted by intensity (margin + duration), range 1.0–1.3

The installed custom glicko2 library (`github:hoanganhlark/glicko2js`) already supports a 4th `multiplier` argument in `updateRatings()`. Daily period batching replaces monthly.

## Files to Modify

| File | Change |
|---|---|
| `src/lib/rankingStats.ts` | Primary refactor |
| `src/lib/rankingStats.test.ts` | Extend with 3 new tests |

## Files to Read (reference only)

- `docs/GLICKO2_RATING_IMPROVEMENT.md` — spec (source of truth)
- `src/components/ranking/types.ts` — `AdvancedStats`, `Match`, `Member` types
- `src/types.ts` — `RankingMatch` fields
- `src/features/ranking/context/RankingMatchesContext.tsx` — call site
- `src/features/ranking/containers/RankingMatchesContainer.tsx` — call site

## Key Discoveries

- Library `glicko2` from `github:hoanganhlark/glicko2js` supports `updateRatings([[p1, p2, outcome, multiplier], ...])` natively
- `DEFAULT_TAU` changes from 0.5 → 0.6 (per spec section 2)
- Public API of `calculateRankingStats()` is unchanged — same signature, same `AdvancedStats` output shape
- `rankScore` formula is preserved exactly

## Dependency Order

```
Task 1: Constants              (no deps)
Task 2: Multiplier functions   → Task 1
Task 3: Virtual opponent       → Task 1
Task 4: Daily period batching  → Task 1
Task 5: Rating match builder   → Tasks 2, 3, 4
Task 6: Wire into main fn      → Task 5
Task 7: Tests                  → Task 6
```

## Refactored File Layout

```
// Constants
// Types
// Utility: clamp, toDayKey, parsePlayedAt, parseSet
// Multiplier: computePercentile, collectRecentSetMinutes, computeTimePercentiles, computeMultiplier
// Virtual Opponent: createVirtualOpponent
// Match Processing: buildRatingEntriesForSet, buildDailyPeriods, accumulateMatchStats
// Main Export: calculateRankingStats
```

All functions ≤15 lines, pure where possible.

## Validation

```bash
npm test -- --run src/lib/rankingStats.test.ts   # all 5 tests pass
npm test -- --run                                 # no regressions
npm run build                                     # no TypeScript errors
```

Then manually verify `/dashboard/ranking` still renders correctly.
