# Glicko-2 Badminton Đôi — Technical Document

---

## 1. Tổng quan

Hệ thống xếp hạng dựa trên Glicko-2, điều chỉnh cho cầu lông đôi với 2 cải tiến:

- **Virtual Opponent** — giải quyết vấn đề 2v2
- **Multiplier** — phản ánh mức độ căng thẳng từng set (thời gian + tỉ số)

Mỗi người chơi có 3 chỉ số:

| Chỉ số   | Ý nghĩa                            | Mặc định |
| -------- | ---------------------------------- | -------- |
| `rating` | Trình độ ước tính                  | 1500     |
| `rd`     | Độ chắc chắn — thấp = đáng tin hơn | 350      |
| `vol`    | Mức độ thất thường                 | 0.06     |

---

## 2. Cấu hình hệ thống

```jsx
const ranking = new Glicko2({
  tau: 0.6, // tốc độ thay đổi volatility — cài 1 lần, không đổi
  rating: 1500, // rating mặc định người mới
  rd: 350, // rd mặc định người mới
  vol: 0.06, // vol mặc định người mới
});
```

---

## 3. Khởi tạo người chơi mới

```jsx
const player = ranking.makePlayer(); // { rating: 1500, rd: 350, vol: 0.06 }
```

- Chỉ khởi tạo 1 lần duy nhất
- Không reset `rd` về 350 sau khi đã đánh
- `rd` và `vol` tự giảm dần theo thời gian khi có thêm dữ liệu

---

## 4. Virtual Opponent

Glicko-2 thiết kế cho 1v1. Cầu lông đôi cần tạo "đối thủ ảo" đại diện cho cả đội địch.

```jsx
function createVirtualOpponent(p3, p4) {
  return {
    rating: (p3.rating + p4.rating) / 2,
    rd: Math.sqrt(p3.rd ** 2 + p4.rd ** 2),
  };
}
```

- `rating` = trung bình 2 người
- `rd` dùng `sqrt(sum of squares)` — sai số 2 người phóng đại, không triệt tiêu
- Virtual opponent chỉ tồn tại lúc tính toán, không lưu lại

---

## 5. Multiplier — chỉ số căng thẳng mỗi set

### Công thức

```
m = margin / MAX_POINTS_PER_SET
t = clamp((timeMinutes - P20) / (P80 - P20), 0, 1)
T = t × (1 - m)
Multiplier = 1 + 0.3 × T
```

### Giải thích

| Biến          | Ý nghĩa                                                                             |
| ------------- | ----------------------------------------------------------------------------------- |
| `margin`      | Điểm đội thắng set − điểm đội thua set (luôn dương, MAX_POINTS_PER_SET= default 21) |
| `timeMinutes` | Thời gian set đó (phút)                                                             |
| `P20`         | Phân vị 20 của 30–50 set gần nhất. Mặc định: `10 phút`                              |
| `P80`         | Phân vị 80 của 30–50 set gần nhất. Mặc định: `14 phút`                              |
| `m` cao       | Cách biệt lớn → set ít căng thẳng → multiplier thấp                                 |
| `t` cao       | Đánh lâu → set căng thẳng → multiplier cao                                          |
| `T` cao       | Vừa lâu vừa sít sao → multiplier cao nhất                                           |

Multiplier dao động `1.0 – 1.3`. Mỗi set có multiplier riêng, **không trung bình**.

```jsx
const BETA = 0.3;
// BETA quy định mức độ dao động của multiplier(dao động từ 1.0 đến 1.3)
function computeMultiplier(margin, timeMinutes, P20 = 10, P80 = 14) {
  const m = margin / MAX_POINTS_PER_SET;
  const t = Math.min(1, Math.max(0, (timeMinutes - P20) / (P80 - P20)));
  const T = t * (1 - m);
  return 1 + BETA * T;
}
```

---

## 6. Kỳ tính điểm

|                 | Giá trị                        |
| --------------- | ------------------------------ |
| Kỳ              | 1 ngày                         |
| Số set mỗi ngày | ~10 set                        |
| Mỗi set         | 1 outcome + 1 multiplier riêng |
| Update rating   | 1 lần cuối ngày                |

Mỗi ngày đánh ~10 set → gom tất cả outcomes → `updateRatings()` 1 lần cuối ngày. Đúng với khuyến nghị gốc Glicko-2 (10–15 outcomes/kỳ).

---

## 7. Luồng xử lý

### 7.1 Trong ngày — mỗi set kết thúc

```jsx
const dailySets = []; // reset mỗi ngày mới

// Sau mỗi set, push vào dailySets:
dailySets.push({
  teamA: [p1, p2], // object player thật
  teamB: [p3, p4],
  winner: "A", // 'A' hoặc 'B'
  margin: 5, // điểm đội thắng set - điểm đội thua set
  timeMinutes: 14,
  multiplier: computeMultiplier(margin, timeMinutes, P20, P80),
});
```

### 7.2 Cuối ngày — update rating chính thức

```jsx
function updateDailyRatings(players, dailySets) {
  const matches = [];

  dailySets.forEach((set) => {
    const vOppA = createVirtualOpponent(set.teamA[0], set.teamA[1]);
    const vOppB = createVirtualOpponent(set.teamB[0], set.teamB[1]);

    const scoreA = set.winner === "A" ? 1 : 0;
    const scoreB = set.winner === "A" ? 0 : 1;

    // Đội A đấu với virtual opponent của đội B
    matches.push([set.teamA[0], vOppB, scoreA, set.multiplier]);
    matches.push([set.teamA[1], vOppB, scoreA, set.multiplier]);

    // Đội B đấu với virtual opponent của đội A
    matches.push([set.teamB[0], vOppA, scoreB, set.multiplier]);
    matches.push([set.teamB[1], vOppA, scoreB, set.multiplier]);
  });

  ranking.updateRatings(matches);
}
```

### 7.3 Simulate rating lũy kế mỗi set

Chỉ để hiển thị realtime — **không lưu, không ảnh hưởng rating chính thức**.

```jsx
function simulateRatings(players, dailySets) {
  // Clone tất cả người chơi từ rating đầu ngày
  const tempRanking = new Glicko2({
    tau: 0.6,
    rating: 1500,
    rd: 350,
    vol: 0.06,
  });

  const clones = {};
  players.forEach((p) => {
    clones[p.id] = tempRanking.makePlayer(p.getRating(), p.getRd(), p.getVol());
  });

  // Build matches từ tất cả set đã đánh hôm nay
  const matches = [];
  dailySets.forEach((set) => {
    const vOppA = createVirtualOpponent(
      clones[set.teamA[0].id],
      clones[set.teamA[1].id],
    );
    const vOppB = createVirtualOpponent(
      clones[set.teamB[0].id],
      clones[set.teamB[1].id],
    );

    const scoreA = set.winner === "A" ? 1 : 0;
    const scoreB = set.winner === "A" ? 0 : 1;

    matches.push([clones[set.teamA[0].id], vOppB, scoreA, set.multiplier]);
    matches.push([clones[set.teamA[1].id], vOppB, scoreA, set.multiplier]);
    matches.push([clones[set.teamB[0].id], vOppA, scoreB, set.multiplier]);
    matches.push([clones[set.teamB[1].id], vOppA, scoreB, set.multiplier]);
  });

  tempRanking.updateRatings(matches);

  // Trả về rating tạm của từng người
  const result = {};
  players.forEach((p) => {
    result[p.id] = {
      rating: clones[p.id].getRating(),
      rd: clones[p.id].getRd(),
      delta: clones[p.id].getRating() - p.getRating(), // thay đổi so với rating thật
    };
  });

  return result;
}
```

Gọi `simulateRatings()` sau mỗi set để cập nhật hiển thị:

```jsx
// Sau set 1:
const tempRatings = simulateRatings(players, dailySets); // dailySets có 1 set
// Sau set 2:
const tempRatings = simulateRatings(players, dailySets); // dailySets có 2 set
// ...
```

Kết quả trả về:

```jsx
{
  "player1_id": { rating: 1523, rd: 312, delta: +23 },
  "player2_id": { rating: 1487, rd: 298, delta: -13 },
  // ...
}
```

---

## 8. Sửa `glicko2.js`

Chỉ sửa 4 chỗ, không thay đổi logic gốc.

### 8.1 `Player` constructor — thêm mảng `multipliers`

```jsx
// Thêm vào cuối constructor:
this.multipliers = [];
```

### 8.2 `addResult()` — nhận thêm multiplier per outcome

```jsx
Player.prototype.addResult = function (opponent, outcome, multiplier) {
  this.adv_ranks.push(opponent.__rating);
  this.adv_rds.push(opponent.__rd);
  this.outcomes.push(outcome);
  this.multipliers.push(multiplier || 1.0); // ← thêm dòng này
};
```

### 8.3 `_delta()` — nhân multiplier per outcome

```jsx
Player.prototype._delta = function (v) {
  var tempSum = 0;
  for (var i = 0, len = this.adv_ranks.length; i < len; i++) {
    tempSum +=
      this._g(this.adv_rds[i]) *
      (this.outcomes[i] - this._E(this.adv_ranks[i], this.adv_rds[i])) *
      this.multipliers[i]; // ← thêm dòng này
  }
  return v * tempSum;
};
```

### 8.4 `cleanPreviousMatches()` — reset `multipliers[]`

```jsx
Glicko2.prototype.cleanPreviousMatches = function () {
  for (var i = 0, len = this.players.length; i < len; i++) {
    this.players[i].adv_ranks = [];
    this.players[i].adv_rds = [];
    this.players[i].outcomes = [];
    this.players[i].multipliers = []; // ← thêm dòng này
  }
};
```

---

## 9. Tóm tắt luồng hoàn chỉnh

```
Đầu ngày:
  → Load rating thật của tất cả người chơi
  → dailySets = []

Mỗi set kết thúc:
  → Tính multiplier cho set đó
  → Push vào dailySets
  → Gọi simulateRatings(players, dailySets) → hiển thị rating tạm + delta

Cuối ngày:
  → Gọi updateDailyRatings(players, dailySets)
  → Lưu rating_mới, RD_mới, vol_mới cho tất cả người chơi
  → Reset dailySets = []
```

## Admin Configs

| Key                | Ý nghĩa                                        | Default |
| ------------------ | ---------------------------------------------- | ------- |
| `TAU`              | Tốc độ thay đổi volatility                     | `0.6`   |
| `DEFAULT_RATING`   | Rating người mới                               | `1500`  |
| `DEFAULT_RD`       | RD người mới                                   | `350`   |
| `DEFAULT_VOL`      | Volatility người mới                           | `0.06`  |
| `BETA`             | Biên độ multiplier (1.0 → 1+BETA)              | `0.3`   |
| `P_MIN_PERCENTILE` | Percentile thấp để tính ngưỡng thời gian nhanh | `20`    |
| `P_MAX_PERCENTILE` | Percentile cao để tính ngưỡng thời gian chậm   | `80`    |
| `P_MIN_DEFAULT`    | Phút fallback khi chưa đủ data (nhanh)         | `10`    |
| `P_MAX_DEFAULT`    | Phút fallback khi chưa đủ data (chậm)          | `14`    |
| `MAX_POINTS`       | Điểm tối đa mỗi set                            | `21`    |
| `MIN_SETS`         | Số set tối thiểu để tính percentile            | `30`    |
| `MAX_SETS`         | Số set tối đa trong window                     | `50`    |
| `PERIOD`           | Độ dài 1 kỳ tính điểm (ngày)                   | `1`     |
