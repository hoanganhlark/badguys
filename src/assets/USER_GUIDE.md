Hướng dẫn cho người chơi — Cách hệ thống tính điểm và xếp hạng hoạt động

---

## Ba chỉ số của bạn

Mỗi người chơi có 3 con số xác định vị trí xếp hạng. Hệ thống dùng thuật toán Glicko-2 — chuẩn quốc tế cho các giải thể thao xếp hạng.

**Rating** — Trình độ hiện tại. Mặc định khi mới tham gia: 1500 điểm. Thắng → tăng. Thua → giảm.

**RD** — Độ tin cậy của rating. RD thấp = đã chơi nhiều, rating đáng tin. RD cao = mới chơi, còn bấp bênh. Tự giảm khi bạn chơi nhiều hơn.

**Volatility** — Mức ổn định trình độ. Thấp = thắng/thua nhất quán. Cao = kết quả thất thường. Ảnh hưởng đến tốc độ thay đổi rating.

---

## Trận đôi — Cơ chế "đối thủ ảo"

Glicko-2 gốc chỉ tính 1v1. Với trận đôi (2v2), hệ thống tạo ra một "đối thủ ảo" đại diện cho cả đội đối phương.

Rating đối thủ ảo = trung bình rating của 2 người bên kia. Độ không chắc chắn = tổng sai số của cả hai (không triệt tiêu nhau, mà cộng lại). Từ đó, từng thành viên trong đội được cập nhật rating so với đối thủ ảo này.

> **Ví dụ:** Bạn và đồng đội gặp đối thủ C (1600đ) + D (1400đ) → Đối thủ ảo: 1500đ. Rating của bạn được tính so với mức 1500 đó.

---

## Hệ số căng thẳng (multiplier)

Mỗi set có một hệ số riêng, phụ thuộc vào độ sít sao và thời gian thi đấu. Set căng thẳng hơn → rating thay đổi nhiều hơn.

| Tình huống                           | Hệ số |
| ------------------------------------ | ----- |
| Cách biệt lớn, set nhanh (< 10 phút) | 1.0   |
| Sít sao hoặc kéo dài                 | ~1.15 |
| Sít sao VÀ kéo dài (> 14 phút)       | 1.3   |

---

## Chu kỳ tính điểm — mỗi ngày

Rating được cập nhật chính thức một lần vào cuối ngày, sau khoảng 10 set. Glicko-2 hoạt động tốt nhất theo từng kỳ — cập nhật liên tục từng trận sẽ làm rating biến động không ổn định.

**Sáng**

- Tải rating chính thức hôm qua
- Reset bộ đếm set mới

**Trong ngày**

- Ghi nhận kết quả từng set
- Tính hệ số căng thẳng
- Hiển thị rating tạm (chỉ để tham khảo)

**Tối**

- Tổng hợp toàn bộ set hôm nay
- Cập nhật rating chính thức
- Lưu vào hệ thống

Rating tạm thời hiển thị sau mỗi set không được lưu vào database — đây là dự báo nếu ngày kết thúc ngay lúc đó.

---

## Câu hỏi thường gặp

**Rating tăng 50 điểm dù chỉ thắng 1 set — tại sao?**
Hệ số căng thẳng của set đó cao (sít sao + kéo dài lâu → nhân 1.3). Set căng thẳng hơn, thay đổi nhiều hơn.

**Tôi thắng nhưng rating giảm?**
Thường xảy ra khi bạn thắng đối thủ yếu hơn đáng kể (hệ thống đã kỳ vọng bạn thắng). Hoặc RD còn cao — rating đang được hiệu chỉnh từ sai số quá khứ.

**RD của tôi sao cao vậy?**
RD cao khi bạn mới tham gia (dưới 30–50 trận), hoặc đã không chơi lâu — RD tự tăng theo thời gian vắng mặt để phản ánh sự không chắc chắn.

**Volatility là gì?**
Nếu kết quả của bạn thất thường — thắng vài trận rồi thua liên tiếp — volatility tăng. Nó báo hiệu rating của bạn có thể dao động nhiều hơn trong tương lai.

---

## Tóm tắt nhanh

| Khái niệm    | Ý nghĩa                                 |
| ------------ | --------------------------------------- |
| Rating       | Trình độ của bạn — cao hơn = mạnh hơn   |
| RD           | Độ tin cậy — thấp hơn = chắc chắn hơn   |
| Volatility   | Độ ổn định — thấp hơn = nhất quán hơn   |
| Đối thủ ảo   | Đại diện đội đối phương trong trận 2v2  |
| Multiplier   | Hệ số set: 1.0 → 1.3 theo độ căng thẳng |
| Kỳ tính điểm | 1 ngày = 1 kỳ, cập nhật cuối ngày       |
