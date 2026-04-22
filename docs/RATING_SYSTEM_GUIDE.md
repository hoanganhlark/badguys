# Comprehensive Badminton Rating System Guide

## Overview

This guide explains the complete rating system powering the BadGuys badminton ranking tracker. The system uses **Glicko-2**, a Bayesian rating algorithm that measures player skill while accounting for rating uncertainty and volatility.

### Key Concepts

- **Rating (R)** — Estimated skill level (default: 1500 for new players)
- **Rating Deviation (RD)** — Uncertainty in the rating (lower = more confident); starts at 350
- **Volatility (σ)** — How unpredictably a player's skill varies; starts at 0.06
- **Virtual Opponent** — Synthetic opponent representing a doubles team in 2v2 matches
- **Multiplier** — Intensity factor (1.0–1.3) reflecting how "competitive" a set was

---

## 1. System Architecture

### File Organization

```
src/lib/rankingStats.ts
├── Configuration (RankingConfig interface)
├── Parsing utilities (parsePlayedAt, parseSet)
├── Core calculations
│   ├── Multiplier computation
│   ├── Virtual opponent creation
│   └── Rating entries builder
├── calculateRankingStats() — Official daily update
└── simulateRatings() — Real-time preview

src/components/ranking/RankingPanel.tsx
├── Official rankings display
├── Real-time simulation toggle
└── Trend indicators (+/-/NEW)

src/components/ranking/RankingHistorySection.tsx
└── Match history and edit interface
```

### Data Flow

```
Match recorded
    ↓
parseSet() — Extract scores & duration
    ↓
buildRatingEntriesForSet() — Create rating tuples
    ├─ computeMultiplier() — Calculate intensity
    └─ createVirtualOpponent() — Aggregate doubles opponents
    ↓
[Option A] Daily Update: ranking.updateRatings() → Save to Supabase
[Option B] Realtime: simulateRatings() → Display in UI (not saved)
    ↓
Display results with delta indicators
```

---

## 2. Match Scoring & Parsing

### Input Format

Matches are recorded with:
- **Team 1 & Team 2** — Player names (1–2 players each)
- **Sets** — Format: `SCORE1-SCORE2[@MINUTES]`
  - Example: `21-15@12m` (team 1 scored 21, team 2 scored 15, duration 12 minutes)
  - If no time: uses percentile-based defaults (P20 and P80)

### Parsing Logic

```typescript
parseSet("21-15@12m")
→ { score1: 21, score2: 15, minutes: 12 }

parseSet("21-15")
→ { score1: 21, score2: 15, minutes: null }
```

**Edge cases handled:**
- Empty/malformed scores → skip
- Draws (21-21) → skip
- No minutes provided → use default time estimate

---

## 3. Multiplier System: Measuring Match Intensity

The multiplier adjusts rating gain/loss based on **how close and how long** a set was.

### Formula

```
m = margin / MAX_POINTS (where MAX_POINTS = 21)
  Example: 21-15 has margin=6, so m = 6/21 ≈ 0.286

t = clamp((timeMinutes - P_MIN) / (P_MAX - P_MIN), 0, 1)
  Normalized time between fast (P_MIN=10m) and slow (P_MAX=14m)

T = t × (1 - m)
  "Stress factor": high if long AND close, low if blowout

Multiplier = 1 + BETA × T
  (BETA = 0.3, so range is 1.0 to 1.3)
```

### Interpretation

| Margin | Time | Example | Multiplier | Meaning |
|--------|------|---------|------------|---------|
| 21-20  | 15m  | Very close, long | 1.30 | High intensity → bigger rating swing |
| 21-15  | 12m  | Moderate gap, normal | 1.15 | Normal intensity |
| 21-10  | 10m  | Blowout, fast | 1.00 | No bonus → baseline rating change |

**Key insight:** Close, competitive matches give larger rating adjustments because they're statistically more informative about skill differences.

### Time Percentiles (P_MIN & P_MAX)

Every period, we collect match durations from the recent set history:

```typescript
// From last 50 sets:
allMinutes = [8, 10, 11, 12, 12, 13, 14, 15, 18, ...]

P_MIN = 20th percentile = 10 minutes (fast baseline)
P_MAX = 80th percentile = 14 minutes (slow baseline)
```

If fewer than 30 sets recorded, fallback to defaults (P_MIN=10, P_MAX=14).

---

## 4. Virtual Opponent: Modeling Doubles Matches

Glicko-2 is designed for 1v1 matches. To handle 2v2 (or 1v2) doubles, we create a **virtual opponent** representing the opposing team.

### Single-Player Virtual Opponent

For a 2v2 match: Player A & B vs Players C & D

```typescript
function createVirtualOpponent(p1: Player, p2: Player): Player {
  return {
    rating: (p1.rating + p2.rating) / 2,
    rd: sqrt(p1.rd² + p2.rd²),  // Quadrature sum
  }
}

vOpponent_CD = {
  rating: (1520 + 1480) / 2 = 1500,
  rd: sqrt(320² + 380²) = 497,  // Higher uncertainty for aggregate
}
```

### Match Outcomes Recorded

For each set in a 2v2 match:

```
Set result: Team AB wins 21-15

Entries created:
1. Player A vs vOpponent_CD, outcome=WIN, multiplier=1.15
2. Player B vs vOpponent_CD, outcome=WIN, multiplier=1.15
3. Player C vs vOpponent_AB, outcome=LOSS, multiplier=1.15
4. Player D vs vOpponent_AB, outcome=LOSS, multiplier=1.15
```

Each player's rating updates individually, but they share the same virtual opponent. This ensures:
- Both winners gain equal rating
- Both losers lose equal rating
- The uncertainty combines (quadrature) for the aggregate

---

## 5. Rating Update Process: Daily vs Real-time

### Daily Official Update

**When:** End of day (triggered manually or scheduled)  
**How:** All sets from that day are processed in one batch

```typescript
calculateRankingStats(members, matches)
├─ Sorts matches chronologically
├─ Groups by day
├─ For each day:
│  ├─ Collects all set durations → computes P_MIN, P_MAX
│  ├─ Builds rating entries with multipliers
│  └─ Calls ranking.updateRatings(entries) once
└─ Returns final AdvancedStats[] with updated ratings
```

**Why batch daily?**
- Glicko-2 recommends 10–15 outcomes per rating period
- Daily batches align with tournament conventions
- RD decreases faster with more outcomes per period

### Real-time Simulation (Realtime Mode)

**When:** After each set is recorded  
**How:** Clone current ratings and simulate incrementally  
**Important:** Changes are **not saved** to database

```typescript
simulateRatings(currentStats, todaysMatches)
├─ Creates temp Glicko2 engine
├─ Clones each player's current rating state
├─ Builds ALL entries from today's matches
├─ Calls updateRatings() on clones
└─ Returns { playerId: { rating, rd, delta } }
```

**Use cases:**
- Show players their predicted rating change after each set
- Live leaderboard updates during tournaments
- Avoid race conditions (simulation doesn't persist)

---

## 6. Rating Deviation (RD): Measuring Confidence

RD represents how certain we are about a player's true skill.

### How RD Changes

```typescript
// Decreases when:
// - Player completes more matches (more data = higher confidence)
// - More outcomes in a single period = faster decrease

// Increases when:
// - Long time passes with no matches (skill may have drifted)
// - After rating update completes (pre-match uncertainty)
```

**Example trajectory for a new player:**

| Time | Matches | RD | Interpretation |
|------|---------|-----|---|
| Day 0 | 0 | 350 | Very uncertain |
| Day 5 | 40 sets | 200 | Moderately confident |
| Day 30 | 200 sets | 80 | Highly confident |

Lower RD means the rating is more "lock-in" for ranking purposes. Two players with the same rating but different RDs have different levels of certainty.

---

## 7. Volatility (σ): Tracking Consistency

Volatility measures whether a player's skill fluctuates unexpectedly.

### Interpretation

```
σ = 0.06 (default, stable) → Consistent performance
σ = 0.15 (high) → Erratic results, recent upsets against expectation
σ = 0.02 (low) → Very predictable, matches expected outcome
```

**Glicko-2 auto-adjusts σ** based on whether recent match outcomes were expected or surprising.

---

## 8. Configuration: Tuning the System

All parameters are in `DEFAULT_RANKING_CONFIG`:

```typescript
const DEFAULT_RANKING_CONFIG: RankingConfig = {
  // Glicko-2 core parameters
  tau: 0.6,          // Volatility change rate (0.3–1.2 recommended)
  rating: 1500,      // New player starting rating
  rd: 350,           // New player starting RD
  vol: 0.06,         // New player starting volatility
  
  // Multiplier intensity
  beta: 0.3,         // Multiplier range (1.0 to 1+beta)
  maxPoints: 21,     // Max points in a set
  pMinDefault: 10,   // Fast baseline (minutes)
  pMaxDefault: 14,   // Slow baseline (minutes)
  
  // Time percentile sampling
  minSetsForPercentile: 30,   // Min sets before using percentiles
  maxSetsInWindow: 50,        // Max sets in rolling window
};
```

### Tau (τ) Parameter

Controls how **volatile** (changeable) ratings are:

- **τ = 0.3** — Conservative, ratings change slowly (good for stable groups)
- **τ = 0.6** — Balanced (default)
- **τ = 1.2** — Aggressive, ratings change quickly (good for new players)

Higher τ allows volatility to grow more, making the rating system more adaptive but less stable.

---

## 9. Complete Match-to-Rating Flow

### Step 1: Match Recording

Admin/user records:
```
Date: 2026-04-23
Team 1: Alice, Bob
Team 2: Charlie, Diana
Sets: 21-15@12m, 18-21@14m
```

### Step 2: Parse & Validate

```typescript
const match: Match = {
  date: "2026-04-23",
  team1: ["Alice", "Bob"],
  team2: ["Charlie", "Diana"],
  sets: ["21-15@12m", "18-21@14m"],
}

parseSet("21-15@12m") → { score1: 21, score2: 15, minutes: 12 }
parseSet("18-21@14m") → { score1: 18, score2: 21, minutes: 14 }
```

### Step 3: Build Rating Entries

For Set 1 (Alice & Bob beat Charlie & Diana 21-15):

```typescript
margin = 21 - 15 = 6
multiplier = 1 + 0.3 × (normalized_time) × (1 - 6/21)
           = 1.147

vOpp_Charlie_Diana = {
  rating: (1520 + 1480) / 2 = 1500,
  rd: sqrt(320² + 380²) = 497,
}

Entries:
[Alice, vOpp, WIN(1), 1.147]
[Bob, vOpp, WIN(1), 1.147]
[Charlie, vOpp_Alice_Bob, LOSS(0), 1.147]
[Diana, vOpp_Alice_Bob, LOSS(0), 1.147]
```

### Step 4: Update Ratings

#### Option A: Daily Official Update

```typescript
calculateRankingStats(members, allMatches)

// At end of day, process all 2 sets in one batch:
ranking.updateRatings([
  [Alice, vOpp, 1, 1.147],
  [Bob, vOpp, 1, 1.147],
  [Charlie, vOpp, 0, 1.147],
  [Diana, vOpp, 0, 1.147],
  [Alice, vOpp, 0, 1.200],  // Set 2: Alice loses
  [Bob, vOpp, 0, 1.200],
  [Charlie, vOpp, 1, 1.200],
  [Diana, vOpp, 1, 1.200],
])

// Glicko-2 computes:
// - New rating for each player
// - New RD (lower after processing 8 outcomes)
// - New volatility
```

**Result:**
```
Alice:   1550 (↑50)
Bob:     1545 (↑45)
Charlie: 1470 (↓50)
Diana:   1465 (↓35)
```

#### Option B: Real-time Simulation

```typescript
// After Set 1 completes:
simulateRatings(currentStats, [set1Match])
→ { alice: {rating: 1525, delta: +25}, ... }

// Display preview: "Alice's rating will be ~1525 after today"

// After Set 2 completes:
simulateRatings(currentStats, [set1Match, set2Match])
→ { alice: {rating: 1510, delta: +10}, ... }

// Update preview: "Alice's rating will be ~1510 after today"
```

### Step 5: Display & Persist

**Official update persists to Supabase:**
```sql
UPDATE ranking_members
SET rating = 1550, rd = 310, vol = 0.065
WHERE id = alice_id;
```

**Real-time simulation shown in UI (not saved):**
```
Realtime Mode: ON
Official Rating: 1500
Simulated Rating: 1510 (+10)  ← Shows delta
```

---

## 10. UI Integration: RankingPanel

### Official vs Simulated Display

```typescript
// In RankingPanel.tsx
const displayRankings = 
  realtimeMode && todaysMatches.length > 0
    ? simulatedRankings  // Live preview
    : officialRankings;  // Official end-of-day
```

### Trend Indicators

```
Rank | Athlete        | Points
-----|----------------|-------
1    | Alice    +25   | 1550
2    | Bob      +45   | 1545
3    | NEW      -     | 1480
4    | Charlie  ↓50   | 1470
```

**Legend:**
- `+25` — Up 25 positions since last official update
- `↓50` — Down 50 positions
- `NEW` — Joined today or hasn't played yet
- `-` — No change in position

---

## 11. Common Scenarios

### Scenario 1: Upset Victory

**Match:** Lower-rated player beats higher-rated player  
**Expected:** Large rating swing

```
Alice (1600 rating) vs Bob (1400 rating)
Alice expected to win with ~75% probability

If Alice wins: +5 rating (expected)
If Bob wins:   +95 rating (upset!)
```

The Glicko-2 algorithm awards more points for wins against higher-rated opponents, and Bob's unexpected victory is doubly rewarded.

### Scenario 2: Close Match vs Blowout

**Match:** Same opponents, different margins

```
Scenario A: 21-20 in 18 minutes
multiplier = 1.30 (max intensity)
Rating change: ±20 points

Scenario B: 21-10 in 10 minutes
multiplier = 1.00 (no bonus)
Rating change: ±10 points
```

Close matches are more informative and carry larger swings.

### Scenario 3: New Player's First Match

**Setup:** Dave (RD=350) joins and plays

```
Before: rating=1500, rd=350, vol=0.06

Match: Dave loses to Alice (1520) in close match
Expected to lose, but loses anyway (expected outcome)
→ volatility may decrease slightly

After: rating=1480, rd=310, vol=0.06
→ RD drops from 350 to 310 (one match provided data)
```

### Scenario 4: Inactive Player Re-enters

**Setup:** Eve hasn't played in 30 days

```
Before: rating=1550, rd=120 (was confident)

[30 days pass, RD increases]
Now: rating=1550, rd=200 (less confident)

Next match: Eve plays
→ RD will decrease as new data arrives
→ Rating may shift if recent match contradicts old skill level
```

---

## 12. Testing & Validation

### Unit Tests for Rating Logic

```typescript
// Test: Multiplier calculation
test("multiplier increases with close matches", () => {
  const closeMatch = computeMultiplier(1, 14, 10, 14);   // 21-20, slow
  const blowout = computeMultiplier(10, 10, 10, 14);     // 21-10, fast
  expect(closeMatch).toBeGreaterThan(blowout);
});

// Test: Virtual opponent creation
test("virtual opponent averages team ratings", () => {
  const p1 = { rating: 1600 };
  const p2 = { rating: 1400 };
  const vOpp = createVirtualOpponent(p1, p2);
  expect(vOpp.rating).toBe(1500);
});

// Test: Parse set with time
test("parseSet extracts score and minutes", () => {
  const result = parseSet("21-15@12m");
  expect(result).toEqual({ score1: 21, score2: 15, minutes: 12 });
});
```

### Integration Testing

```typescript
// Test: Full daily update
test("calculateRankingStats updates all player ratings", () => {
  const stats = calculateRankingStats(members, matches);
  
  // All players should have updated ratings
  expect(stats.length).toBe(members.length);
  
  // Winner's rating should increase
  const winner = stats.find(s => s.name === "Alice");
  expect(winner.rating).toBeGreaterThan(1500);
  
  // Loser's rating should decrease
  const loser = stats.find(s => s.name === "Charlie");
  expect(loser.rating).toBeLessThan(1500);
});
```

---

## 13. Troubleshooting

### "My rating isn't updating"

**Possible causes:**
1. Match has no valid sets (parsed as null)
2. Player name doesn't match exactly (trim spaces, check capitalization)
3. Daily update hasn't run yet (check Supabase timestamp)
4. Set score is a draw (21-21) — draws are skipped

**Fix:** Check `src/lib/rankingStats.ts` parseSet() and calculateRankingStats() for debug logs.

### "Real-time simulation is different from daily update"

**Expected!** Reasons:
1. Simulation uses today's matches only; daily update uses all matches
2. Time percentiles (P_MIN, P_MAX) may differ
3. Simulation clones ratings, doesn't account for matches still in progress

**Verify:** Refresh after daily update runs; simulated and official should match.

### "RD keeps increasing"

**Possible causes:**
1. Player hasn't played in a long time (RD drifts up when inactive)
2. Too few matches per period (RD increases if outcomes < 5 per period)

**Expected behavior:** RD peaks at ~350, stabilizes around 50–100 for active players.

---

## 14. Future Enhancements

Potential improvements not yet implemented:

1. **Season-based resets** — Reset volatility at start of each season
2. **Rating caps** — Prevent unrealistic extremes (e.g., max 2500)
3. **Activity decay** — Penalize players with long inactive streaks
4. **Skill tiers** — Auto-assign categories based on rating ranges
5. **Prediction confidence** — Show match outcome probabilities
6. **Audit trail** — Log all rating changes with justification

---

## References

- **Original Glicko-2 Paper:** https://www.glicko.net/glicko/glicko2.pdf
- **Implementation:** `glicko2` npm package
- **Configuration:** `src/lib/rankingStats.ts` (lines 24–36)
- **Data Model:** `src/components/ranking/types.ts` (AdvancedStats interface)
