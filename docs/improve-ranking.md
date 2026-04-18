You are a senior backend engineer. Help me implement a badminton player ranking system based only on match scores.

## Input

Each match has:

- player_id
- opponent_id
- match_id
- sets: array of scores (example: ["21-18", "15-21", "21-10"])

## Goal

Compute ranking metrics for each player:

- Skill
- Stability
- Uncertainty
- Momentum
- Final RankScore

## Definitions

### 1. Performance per match

For each match:

- PointFor = total points scored across all sets
- PointAgainst = total points conceded

Performance_i = (PointFor - PointAgainst) / (PointFor + PointAgainst)

---

### 2. Skill

Skill = (TotalPointFor - TotalPointAgainst) / (TotalPointFor + TotalPointAgainst)

---

### 3. Stability

Stability = 1 - stddev(Performance_i)

---

### 4. Uncertainty

Uncertainty = stddev(Performance_i) + 1 / sqrt(NumberOfMatches)

---

### 5. Momentum

Momentum = avg(Performance_last_5_matches) - avg(Performance_all_matches)

If less than 5 matches, use all matches.

---

### 6. Final RankScore

RankScore = Skill

- 2 \* Uncertainty

* 0.5 \* Stability
* 0.3 \* Momentum

---

## Requirements

1. Implement clean, production-ready code

2. Use clear function separation:
   - parseScores()
   - computePerformance()
   - computeSkill()
   - computeStability()
   - computeUncertainty()
   - computeMomentum()
   - computeRankScore()

3. Handle edge cases:
   - division by zero
   - players with very few matches
   - invalid score format

4. Output format:
   Return a list:
   {
   player_id,
   skill,
   stability,
   uncertainty,
   momentum,
   rankScore
   }

5. Language: [PUT YOUR LANGUAGE HERE: e.g. TypeScript / Java / Python]

6. Optimize for readability and correctness, not premature optimization.

---

## Optional Improvements (if time permits)

- Add normalization (min-max scaling)
- Add decay factor for older matches
- Add opponent strength weighting

---

Generate full working code with example input and output.
