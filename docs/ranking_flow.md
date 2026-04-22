# Ranking System Data Flow

Complete flow from adding a match to displaying rankings in the ranking panel.

---

## Overview

The ranking system is **100% frontend-calculated**. All Glicko-2 computations, multiplier calculations, and stats aggregation happen in the browser. The database stores matches (source of truth) and snapshots (for rank trend comparisons), but does not compute or cache ratings.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INITIALIZATION: useRankingMatches hook                   │
├─────────────────────────────────────────────────────────────┤
│ • useEffect loads ALL matches from Supabase (getMatches())   │
│ • Stores in local state: matches[]                          │
│ • Triggered once on mount                                   │
│ • File: src/features/ranking/hooks/useRankingMatches.ts     │
│   Lines 254-275                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. USER ADDS MATCH: MatchFormPanel                           │
├─────────────────────────────────────────────────────────────┤
│ Form input:                                                  │
│ • matchType (singles/doubles)                               │
│ • team1, team2 (player names)                               │
│ • sets (scores, minutes)                                    │
│ • playedAt (timestamp)                                      │
│                                                              │
│ File: src/components/ranking/MatchFormPanel.tsx             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SAVE MATCH: handleSaveMatch()                            │
├─────────────────────────────────────────────────────────────┤
│ a) Call addMatch()                                          │
│    • Validates team composition (singles=1, doubles=2)      │
│    • Validates set scores (positive integers)               │
│    • Formats sets: "21-19@14" (score@minutes)               │
│    • Calls createMatch() → Supabase POST                    │
│    • Updates local state: setMatches([newMatch, ...prev])   │
│                                                              │
│ b) Component re-renders with new matches array              │
│                                                              │
│ File: src/features/ranking/containers/RankingMatchesContainer │
│   Lines 206-263                                             │
│ File: src/features/ranking/hooks/useRankingMatches.ts       │
│   Lines 116-183                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RANKINGS CALCULATION: useMemo                            │
├─────────────────────────────────────────────────────────────┤
│ FRONTEND CALCULATION (100% CLIENT-SIDE)                     │
│                                                              │
│ useMemo triggers when: members OR matches change             │
│                                                              │
│ rankings = calculateRankingStats(members, matches, config)  │
│                                                              │
│ ● File: src/lib/rankingStats.ts                             │
│ ● Lines: 267-467 (calculateRankingStats function)           │
│                                                              │
│ Algorithm:                                                   │
│ 1. Initialize Glicko2 engine with config:                   │
│    - tau: 0.6 (volatility change rate)                      │
│    - rating: 1500 (default skill)                           │
│    - rd: 350 (default uncertainty)                          │
│    - vol: 0.06 (default volatility)                         │
│                                                              │
│ 2. Create players for each member (line 290-306)            │
│    - Each player gets default rating/rd/vol                 │
│                                                              │
│ 3. Build daily periods from match dates (line 311)          │
│    - Group all matches by day                               │
│                                                              │
│ 4. Process each period in chronological order (line 334):   │
│                                                              │
│    a) Collect recent set times (line 338)                   │
│       - Last 50 sets from all matches                       │
│       - Extract minutes from each set                       │
│       - Sort numerically                                    │
│                                                              │
│    b) Compute time percentiles (line 339)                   │
│       - P_MIN (20th percentile, default 10 min)             │
│       - P_MAX (80th percentile, default 14 min)             │
│       - If <30 sets: use defaults                           │
│                                                              │
│    c) Process matches in this period (line 350)             │
│       - For each match:                                     │
│         - Parse team names and set scores                   │
│         - For each set:                                     │
│           i) Calculate margin = |score1 - score2|           │
│           ii) Calculate multiplier:                         │
│               m = margin / 21 (max points)                  │
│               t = clamp((minutes - P_MIN) / (P_MAX - P_MIN))│
│               T = t × (1 - m)                               │
│               multiplier = 1 + 0.3 × T                      │
│           iii) Create virtual opponent:                     │
│               rating = avg(team2[0].rating, team2[1].rating)│
│               rd = sqrt(rd1² + rd2²)                        │
│           iv) Build rating match tuples:                    │
│               [player, opponent, outcome, multiplier]       │
│                                                              │
│    d) Update ratings at period end (line 420)               │
│       - ranking.updateRatings(all match tuples)             │
│       - Glicko-2 recalculates rating/rd/vol for each player │
│                                                              │
│ 5. Aggregate stats for each member (line 426-464)           │
│    - rating: final Glicko-2 rating                          │
│    - rd: final rating deviation                             │
│    - vol: final volatility                                  │
│    - wins: count of winning sets                            │
│    - totalMatches: count of all sets participated in        │
│    - winRate: wins / totalMatches                           │
│                                                              │
│ 6. Return sorted by rating descending (line 466)            │
│                                                              │
│ Output: AdvancedStats[]                                     │
│   [{                                                         │
│     id: number,                                             │
│     name: string,                                           │
│     rating: number,        // Glicko-2 skill rating         │
│     rd: number,            // Rating deviation (uncertainty) │
│     vol: number,           // Volatility                     │
│     winRate: number,       // 0-1 scalar                     │
│     wins: number,          // Total winning sets             │
│     totalMatches: number   // Total sets participated        │
│   }, ...]                                                    │
│                                                              │
│ File: src/features/ranking/containers/RankingMatchesContainer │
│   Lines 131-135 (useMemo call)                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. RANK TRENDS: useMemo                                     │
├─────────────────────────────────────────────────────────────┤
│ Compare current rankings to latest database snapshot:        │
│                                                              │
│ Process:                                                     │
│ 1. Load latestSnapshot from DB (useEffect, line 109-128)    │
│    - Fetches most recent ranking_snapshots record           │
│    - Stores in state                                        │
│                                                              │
│ 2. Build rank maps from previous snapshot (line 160-166)    │
│    - previousRanksByMemberId: id → rank                     │
│    - previousRanksByMemberName: name → rank                 │
│                                                              │
│ 3. Compare current to previous (line 168-182)               │
│    - For each player in current rankings:                   │
│      - currentRank = index + 1                              │
│      - previousRank = snapshot lookup                       │
│      - trend = previousRank - currentRank                   │
│        * positive = improved up                             │
│        * negative = dropped down                            │
│        * "NEW" = not in previous snapshot                   │
│                                                              │
│ Output: rankTrends = { [playerId]: number | "NEW" }         │
│                                                              │
│ File: src/features/ranking/containers/RankingMatchesContainer │
│   Lines 155-183                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. SAVE SNAPSHOT: After calculation                         │
├─────────────────────────────────────────────────────────────┤
│ Persist current ranking order to database for trend display: │
│                                                              │
│ Data saved:                                                  │
│ saveRankingSnapshot([                                       │
│   {                                                          │
│     memberId: number,      // Player ID                      │
│     memberName: string,    // Player name                    │
│     rank: number,          // Current rank (1-indexed)       │
│     rankScore: number      // Player's rating                │
│   },                                                         │
│   ...                                                        │
│ ])                                                          │
│                                                              │
│ Storage:                                                     │
│ • Table: ranking_snapshots                                  │
│ • Column: ranks (JSONB) — stores array above                │
│ • Column: created_at (timestamp)                            │
│ • Used for: next snapshot comparison                        │
│                                                              │
│ File: src/features/ranking/containers/RankingMatchesContainer │
│   Lines 225-244 (snapshot save)                             │
│ File: src/lib/supabase.ts                                   │
│   Lines 495-525 (saveRankingSnapshot function)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. DISPLAY: RankingPanel                                    │
├─────────────────────────────────────────────────────────────┤
│ Render rankings table filtered by category:                 │
│                                                              │
│ Process:                                                     │
│ 1. Filter by selected category (line 122-127)               │
│    - rankings.filter(p => memberLevelById[p.id] === catName)│
│                                                              │
│ 2. Sort by rating descending (line 132-133)                 │
│    - Ensures rank 1 is highest rating                       │
│                                                              │
│ 3. Map to table rows (line 135-140)                         │
│    - { key: id, rank: index+1, player: stats }              │
│                                                              │
│ 4. Render columns:                                          │
│    - Rank: display number with trend (↑ ↓ NEW)              │
│    - Name: formatted as "FirstName LASTNAME"                │
│    - Rating: Math.round(rating)                             │
│                                                              │
│ 5. On player click:                                         │
│    - Open PlayerStatsModal                                  │
│    - Display skill, stability, uncertainty, winRate         │
│    - Computed from rating, rd, vol, wins/totalMatches       │
│                                                              │
│ File: src/components/ranking/RankingPanel.tsx               │
│   Lines 59-300+                                             │
│ File: src/components/ranking/PlayerStatsModal.tsx           │
│   Lines 20-122                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Storage

### Database Tables

| Table | Columns | Purpose | Updated |
|-------|---------|---------|---------|
| `ranking_matches` | id, playerA, playerB, score, matchType, playedAt, durationMinutes, createdBy, createdByUsername | Source of truth for all matches | On add/delete match |
| `ranking_members` | id, name, level, ... | Player metadata | Admin only |
| `ranking_snapshots` | id, ranks (JSONB), created_at, client_created_at | Historical rank ordering | After each match |

### What's NOT Stored

- ❌ `rating`, `rd`, `vol` — computed fresh every time
- ❌ `multipliers` — computed per-set during calculation
- ❌ Rating history — no time-series storage
- ❌ Intermediate Glicko-2 states

### JSONB Snapshot Structure

```json
{
  "ranks": [
    {
      "memberId": 1,
      "memberName": "Nguyễn Văn A",
      "rank": 1,
      "rankScore": 1523.45
    },
    {
      "memberId": 2,
      "memberName": "Trần Thị B",
      "rank": 2,
      "rankScore": 1487.32
    }
  ]
}
```

---

## Component Hierarchy

```
RankingPage
├── RankingMatchesContainer (owns all match/ranking logic)
│   ├── useRankingMatches hook
│   │   └── matches[] from Supabase
│   ├── useMatchForm hook
│   │   └── form state
│   ├── calculateRankingStats() useMemo
│   │   └── rankings[] ← FRONTEND CALCULATION
│   ├── rankTrends useMemo
│   │   └── snapshot comparison
│   ├── MatchFormPanel
│   │   └── inputs: matchType, team1, team2, sets, playedAt
│   └── RankingPanel
│       ├── filters rankings by category
│       ├── sorts by rating
│       └── displays table with trends
│           └── PlayerStatsModal (on click)
│               └── shows skill/stability/uncertainty/winRate
└── RankingUIContext
    └── selectedCategoryId, selectedPlayer state
```

---

## Performance Characteristics

### Calculation Complexity

| Factor | Impact |
|--------|--------|
| Number of matches | **High** — O(n) where n = total matches |
| Number of players | **Medium** — O(m) where m = total players |
| Number of periods (days) | **Medium** — O(p) where p = days of data |
| Time per calculation | ~5-50ms for 100-1000 matches |

### When Recalculation Happens

| Event | Trigger |
|-------|---------|
| Component mount | Load matches from Supabase |
| Add match | Match state changes → useMemo recalculates |
| Delete match | Match state changes → useMemo recalculates |
| Category filter | Rankings already calculated, just filtered |
| Player click | No recalculation |

### Optimization Strategy

- **useMemo** prevents recalc unless `members` or `matches` dependency changes
- **Frontend calc** avoids round-trip to backend
- **No caching** of intermediate states (full recalc each time)
- **Snapshot only** for trend display, not for ranking computation

---

## Configuration

Default ranking config (src/lib/rankingStats.ts, lines 24-36):

```typescript
const DEFAULT_RANKING_CONFIG: RankingConfig = {
  tau: 0.6,              // Volatility change rate (Glicko-2)
  rating: 1500,          // Default rating for new players
  rd: 350,               // Default rating deviation
  vol: 0.06,             // Default volatility
  scale: 173.7178,       // Normalization scale (unused)
  beta: 0.3,             // Multiplier amplitude (1.0 → 1.3)
  maxPoints: 21,         // Points per set
  pMinDefault: 10,       // Default P_MIN (min) in minutes
  pMaxDefault: 14,       // Default P_MAX (max) in minutes
  minSetsForPercentile: 30,  // Min sets to compute percentiles
  maxSetsInWindow: 50,       // Max sets in time window
};
```

### User-Adjustable

- `tau` — passed from `RankingComputationSettings` (if provided)
- All others are hardcoded in the function

---

## Example: Single Match Addition

```
User action: Add singles match
  A vs B, set 1: 21-19@14 minutes

Flow:
1. Form validation passes ✓
2. createMatch() → Supabase INSERT ranking_matches
3. matches state updates: [newMatch, ...oldMatches]
4. RankingMatchesContainer re-renders
5. rankings useMemo re-runs:
   • calculateRankingStats([A, B, ...], [newMatch, ...oldMatches])
   • Glicko2 engine processes all matches chronologically
   • A's rating increases (won)
   • B's rating decreases (lost)
   • Returns [A (1st), B (2nd), C (3rd), ...]
6. rankTrends useMemo compares to latestSnapshot
   • If C was 1st before → trend = -1 (dropped 1)
   • If A is new → trend = "NEW"
7. saveRankingSnapshot([{memberId:1,rank:1}, {memberId:2,rank:2}, ...])
8. RankingPanel re-renders
   • Displays new ranks and trends
```

---

## Key Insights

1. **Entirely Frontend-Calculated**
   - Backend has no ranking endpoints
   - All Glicko-2 math happens in `calculateRankingStats()`
   - Matches are source of truth; ratings are derived

2. **Stateless Calculation**
   - No stored rating history
   - Always recalculates from full match history
   - Consequence: deleting a match rewinds all ratings

3. **Daily Period Batching**
   - Glicko-2 standard: 10-15 outcomes per rating period
   - This system: ~10 sets per day (one period = one day)
   - All matches in a day → one Glicko-2 update

4. **Virtual Opponent for Doubles**
   - Glicko-2 designed for 1v1
   - Doubles converted: each player vs team opponent
   - Team opponent = avg rating, combined RD (sqrt of sum of squares)

5. **Multiplier for Match Intensity**
   - Set margin: wider margin → lower multiplier
   - Set duration: longer duration → higher multiplier
   - Combined: close, long matches have most rating impact

6. **Snapshot Purpose**
   - Not for ranking computation (always recalculated)
   - Only for displaying rank trends (rank changed up/down)
   - Historical record of rank ordering at each snapshot time

---

## Simulation: Intra-Day Rating Preview

The `simulateRatings()` function allows previewing rating changes without persisting them. Used to show players "what your rating will be if updated NOW" before the official end-of-day update.

### Function Signature

```typescript
export function simulateRatings(
  currentStats: AdvancedStats[],
  todaysMatches: Match[],
  config?: RankingConfig
): Record<number, SimulatedRating>
```

### Return Type

```typescript
type SimulatedRating = {
  rating: number;   // Simulated rating after today's matches
  rd: number;       // Simulated rating deviation
  delta: number;    // new rating - original rating (can be +/-)
}
```

### How It Works

1. **Clone current state** — Takes official ratings from `AdvancedStats`
2. **Create temp engine** — Separate Glicko-2 instance for simulation
3. **Process today's matches** — Applies only the matches added today
4. **Calculate deltas** — Returns change relative to official rating
5. **No persistence** — Simulation doesn't affect official ratings

### Example Usage

```typescript
// After calculating official rankings
const officialStats = calculateRankingStats(members, allMatches);

// User adds a match during the day
const todaysMatches = [
  {
    id: "m1",
    type: "singles",
    team1: ["An"],
    team2: ["Binh"],
    sets: ["21-19@14"],
    playedAt: "2026-04-22T14:30:00Z",
  },
];

// Show what would happen if updated now
const preview = simulateRatings(officialStats, todaysMatches);

// Result:
// {
//   1: { rating: 1512.45, rd: 325, delta: +12.45 },
//   2: { rating: 1487.55, rd: 330, delta: -12.45 },
// }

// Display to users:
// An: "Your rating will be 1512 (+12) if updated now"
// Binh: "Your rating will be 1488 (-12) if updated now"
```

### Use Case

Perfect for showing **realtime rating changes** as matches are added throughout the day, while keeping official ratings (updated at day end) as the source of truth.

---

## Related Files

- **rankingStats.ts** — Core Glicko-2 calculation engine + simulation
- **RankingMatchesContainer.tsx** — Orchestrates flow
- **useRankingMatches.ts** — Match CRUD and fetching
- **RankingPanel.tsx** — Display and filtering
- **PlayerStatsModal.tsx** — Detail view
- **GLICKO2_RATING_IMPROVEMENT.md** — Algorithm specification
