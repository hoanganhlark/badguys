import { useTranslation } from "react-i18next";
import { HelpCircle } from "react-feather";

const RANKING_GUIDE = `# Hệ Thống Xếp Hạng Badminton — Hướng Dẫn Cho Người Chơi

## 🎯 Giới Thiệu

Hệ thống xếp hạng của chúng tôi sử dụng thuật toán **Glicko-2**, một phương pháp xếp hạng được sử dụng rộng rãi trong các môn thể thao để đánh giá trình độ của mỗi người chơi.

**Điểm khác biệt:** Ngoài các trận đấu đơn (1v1), chúng tôi còn hỗ trợ **trận đấu đôi (2v2)**, vì vậy hệ thống đã được điều chỉnh đặc biệt cho phù hợp.

---

## 📊 Ba Chỉ Số Chính Của Mỗi Người Chơi

Mỗi người chơi có 3 chỉ số xác định vị trí xếp hạng của họ:

### 1. **Rating (Điểm Xếp Hạng)**
- **Ý nghĩa:** Trình độ hiện tại của bạn
- **Mặc định khi tham gia lần đầu:** 1500 điểm
- **Thay đổi:** Tăng khi bạn thắng, giảm khi thua
- **Ảnh hưởng:** Rating cao hơn = xếp hạng cao hơn

### 2. **RD (Rating Deviation) — Độ Chắc Chắn**
- **Ý nghĩa:** Độ chính xác của rating của bạn
- **Giá trị thấp = Rating bạn đáng tin cậy hơn** (bạn đã chơi nhiều trận)
- **Giá trị cao = Rating bạn không chắc chắn** (bạn mới chơi vài trận)
- **Thay đổi:** RD tự động giảm dần khi bạn chơi nhiều trận
- **Ảnh hưởng:** Người mới chơi có RD cao, nên rating dễ thay đổi hơn

### 3. **Volatility (Mức Độ Thất Thường)**
- **Ý nghĩa:** Mức độ ổn định của trình độ bạn
- **Giá trị thấp = Trình độ ổn định** (thắng/thua nhất quán)
- **Giá trị cao = Trình độ bất ổn định** (kết quả thất thường)
- **Thay đổi:** Tự động điều chỉnh dựa trên kết quả gần đây
- **Ảnh hưởng:** Ảnh hưởng đến tốc độ thay đổi rating

---

## ⚖️ Trận Đấu Đôi (2v2) — Sử Dụng "Đối Thủ Ảo"

Glicko-2 gốc được thiết kế cho trận 1v1, nhưng chúng tôi chơi đôi (2v2). Giải pháp của chúng tôi:

### Khái Niệm "Đối Thủ Ảo"

**Khi bạn chơi với người bạn A và gặp đối thủ là B+C:**

\`\`\`
Đội bạn (A + B)  vs  Đối thủ ảo (C+D)
\`\`\`

- **Rating của đối thủ ảo** = Trung bình rating của C và D
- **Chắc chắn của đối thủ ảo** = Tổng sai số của C và D (phóng đại lên, không triệt tiêu)

**Kết quả:** Mỗi người trong đội được tính rating so với "đối thủ ảo" của đội kia.

**Tại sao?** Vì rating của bạn phải so sánh với một "đối thủ duy nhất", chúng tôi tạo ra một đối thủ ảo đại diện cho cả đội đối phương.

---

## 🎚️ Multiplier (Hệ Số Căng Thẳng) — Mỗi Set Có Hệ Số Riêng

Mỗi set (trận gồm các set nhỏ) có một **hệ số căng thẳng** riêng, phụ thuộc vào:

1. **Độ cách biệt điểm (margin):** Bạn thắng/thua chênh lệch bao nhiêu?
   - Set sít sao (chênh lệch nhỏ) → Căng thẳng cao
   - Set cách biệt lớn → Căng thẳng thấp

2. **Thời gian set (minutes):** Set kéo dài bao lâu?
   - Set lâu (>14 phút) → Căng thẳng cao
   - Set nhanh (<10 phút) → Căng thẳng thấp

### Công Thức Hệ Số

\`\`\`
Multiplier = 1.0 đến 1.3
\`\`\`

- **1.0** = Không căng thẳng (cách biệt lớn hoặc set nhanh)
- **1.3** = Rất căng thẳng (sít sao AND kéo dài lâu)

**Ảnh hưởng:** Set căng thẳng hơn → Rating thay đổi nhiều hơn

---

## ⏰ Kỳ Tính Điểm

### Chu Kỳ: 1 Ngày

- **Mỗi ngày** bạn có thể chơi ~10 set
- **Mỗi set** có 1 hệ số căng thẳng riêng
- **Cuối ngày** → Hệ thống cập nhật rating chính thức cho tất cả người chơi

### Tại Sao Cuối Ngày Mới Cập Nhật?

Glicko-2 khuyến nghị **10-15 trận mỗi kỳ**, để rating ổn định hơn. Nếu cập nhật mỗi trận, rating sẽ biến động quá dễ.

### Giữa Ngày — Rating Tạm Thời

- Bạn có thể xem **rating tạm thời** (hiển thị ngay sau mỗi set)
- Rating tạm = Mô phỏng kết quả nếu ngày kết thúc bây giờ
- **Không lưu vào DB**, chỉ để tham khảo

---

## 🔄 Quy Trình Từng Ngày

### Sáng
1. Load rating chính thức của hôm qua
2. Reset bộ đếm set hôm nay

### Khi Kết Thúc Mỗi Set
1. Ghi nhận kết quả (ai thắng, điểm, thời gian)
2. Tính hệ số căng thẳng của set đó
3. Hiển thị rating tạm thời (dự báo)

### Tối (Cuối Ngày)
1. Gom tất cả ~10 set hôm nay
2. Cập nhật rating chính thức cho tất cả
3. Lưu rating mới vào hệ thống

---

## 💡 Hiểu Rõ Rating Của Bạn

### Ví Dụ

**Bạn (rating 1500) vs Đối thủ (rating 1600):**
- Bạn thắng → Rating tăng nhiều (vì thắng đối thủ mạnh hơn)
- Bạn thua → Rating giảm ít (vì là đối thủ mạnh hơn)

**Bạn (rating 1500, RD 350) vs Đối thủ (rating 1500, RD 50):**
- Nếu bạn thắng → Rating thay đổi nhiều (RD của bạn cao = chưa chắc chắn)
- Người kia thua → Rating thay đổi ít (RD của anh/chị ấy thấp = đã chắc chắn)

---

## 🏆 Xếp Hạng Là Gì?

Xếp hạng = **Sắp xếp tất cả người chơi theo rating từ cao đến thấp**

### Ví Dụ Bảng Xếp Hạng

| Hạng | Tên    | Rating | RD  | Matches |
|------|--------|--------|-----|---------|
| 1    | Anh A  | 1700   | 120 | 45      |
| 2    | Chị B  | 1650   | 150 | 42      |
| 3    | Em C   | 1500   | 200 | 30      |
| 4    | Cậu D  | 1450   | 300 | 8       |

- **Anh A** có rating cao nhất → Xếp hạng 1 (mạnh nhất)
- **Cậu D** mới chơi (8 trận, RD 300 cao) → Rating chưa chắc chắn

---

## ❓ Các Câu Hỏi Thường Gặp

### "Rating của tôi vừa tăng 50, nhưng tôi chỉ thắng 1 set, tại sao?"
Hệ số căng thẳng của set đó rất cao (sít sao + kéo dài lâu) → Hệ số 1.3 → Rating thay đổi nhiều.

### "Tôi thắng nhưng rating giảm?"
Rating giảm thường xảy ra vì:
- Bạn thắng người yếu hơn (kỳ vọng sẵn)
- Hoặc RD của bạn còn cao → Hiệu chỉnh từ sai số quá khứ

### "RD của tôi sao cao thế?"
RD cao khi bạn:
- Mới tham gia (chưa đủ 30-50 trận)
- Không chơi lâu (RD tự động tăng nếu bạn vắng mặt)

### "Volatility là gì mà kỳ kỳ?"
Nếu bạn thắng/thua không nhất quán (ví dụ thắng 3 trận, rồi thua 4 trận liên tiếp), volatility sẽ tăng. Nó cho biết rating của bạn có thể sẽ thay đổi nhiều trong tương lai.

---

## 🎯 Tóm Tắt

| Khái Niệm | Ý Nghĩa |
|-----------|---------|
| **Rating** | Trình độ của bạn (cao = mạnh) |
| **RD** | Chắc chắn của rating (thấp = chắc chắn) |
| **Volatility** | Ổn định trình độ (thấp = ổn định) |
| **Đối Thủ Ảo** | Đại diện đối thủ trong trận 2v2 |
| **Multiplier** | Hệ số căng thẳng của mỗi set (1.0 - 1.3) |
| **Kỳ** | 1 ngày = 1 kỳ tính điểm |
| **Xếp Hạng** | Sắp xếp người chơi theo rating |
`;

export default function HowItWorksPanel() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start gap-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <HelpCircle className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Hệ Thống Xếp Hạng Badminton
          </h1>
          <p className="text-gray-600 mt-2">
            Tìm hiểu cách hoạt động của hệ thống Glicko-2 được điều chỉnh cho trận đấu đôi badminton
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm p-8 prose prose-sm max-w-none">
        <div className="space-y-6 text-gray-700">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🎯 Giới Thiệu
            </h2>
            <p>
              Hệ thống xếp hạng của chúng tôi sử dụng thuật toán <strong>Glicko-2</strong>, một
              phương pháp xếp hạng được sử dụng rộng rãi trong các môn thể thao để đánh giá trình độ
              của mỗi người chơi.
            </p>
            <p>
              <strong>Điểm khác biệt:</strong> Ngoài các trận đấu đơn (1v1), chúng tôi còn hỗ trợ{" "}
              <strong>trận đấu đôi (2v2)</strong>, vì vậy hệ thống đã được điều chỉnh đặc biệt cho
              phù hợp.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              📊 Ba Chỉ Số Chính Của Mỗi Người Chơi
            </h2>
            <p>Mỗi người chơi có 3 chỉ số xác định vị trí xếp hạng của họ:</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h3 className="font-bold text-amber-900 mb-2">1. Rating</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>
                    <strong>Ý nghĩa:</strong> Trình độ hiện tại
                  </li>
                  <li>
                    <strong>Mặc định:</strong> 1500 điểm
                  </li>
                  <li>
                    <strong>Thay đổi:</strong> Tăng khi thắng, giảm khi thua
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2">2. RD (Rating Deviation)</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    <strong>Ý nghĩa:</strong> Độ chắc chắn
                  </li>
                  <li>
                    <strong>Thấp =</strong> Rating đáng tin cậy
                  </li>
                  <li>
                    <strong>Cao =</strong> Rating không chắc chắn
                  </li>
                </ul>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-bold text-purple-900 mb-2">3. Volatility</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>
                    <strong>Ý nghĩa:</strong> Mức độ ổn định
                  </li>
                  <li>
                    <strong>Thấp =</strong> Trình độ ổn định
                  </li>
                  <li>
                    <strong>Cao =</strong> Trình độ bất ổn định
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              ⚖️ Trận Đấu Đôi (2v2)
            </h2>
            <p>
              Glicko-2 gốc được thiết kế cho trận 1v1, nhưng chúng tôi chơi đôi (2v2). Giải pháp của
              chúng tôi sử dụng <strong>"đối thủ ảo"</strong>.
            </p>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 my-4">
              <p className="text-sm font-mono text-green-900">
                Đội bạn (A + B) vs Đối thủ ảo (C+D)
              </p>
            </div>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>Rating của đối thủ ảo</strong> = Trung bình rating của C và D
              </li>
              <li>
                <strong>Chắc chắn của đối thủ ảo</strong> = Tổng sai số của C và D (phóng đại lên)
              </li>
              <li>
                <strong>Kết quả:</strong> Mỗi người trong đội được tính rating so với "đối thủ ảo"
                của đội kia
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🎚️ Multiplier (Hệ Số Căng Thẳng)
            </h2>
            <p>
              Mỗi set có một <strong>hệ số căng thẳng</strong> riêng, phụ thuộc vào:
            </p>
            <ol className="list-decimal list-inside space-y-2 mt-3 text-sm">
              <li>
                <strong>Độ cách biệt điểm:</strong> Bạn thắng/thua chênh lệch bao nhiêu?
              </li>
              <li>
                <strong>Thời gian set:</strong> Set kéo dài bao lâu?
              </li>
            </ol>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 my-4">
              <p className="text-sm font-bold text-red-900">Multiplier = 1.0 đến 1.3</p>
              <ul className="text-sm text-red-800 mt-2 space-y-1">
                <li>
                  <strong>1.0</strong> = Không căng thẳng
                </li>
                <li>
                  <strong>1.3</strong> = Rất căng thẳng
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              ⏰ Kỳ Tính Điểm
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>Chu Kỳ:</strong> 1 ngày = 1 kỳ tính điểm
              </li>
              <li>
                <strong>Mỗi ngày:</strong> Bạn có thể chơi ~10 set
              </li>
              <li>
                <strong>Cuối ngày:</strong> Hệ thống cập nhật rating chính thức
              </li>
              <li>
                <strong>Rating tạm thời:</strong> Hiển thị giữa ngày (không lưu)
              </li>
            </ul>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 my-4 text-sm text-yellow-900">
              <p>
                <strong>Tại sao cuối ngày mới cập nhật?</strong> Glicko-2 khuyến nghị 10-15 trận mỗi
                kỳ để rating ổn định hơn.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              ❓ Các Câu Hỏi Thường Gặp
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-bold text-gray-900 mb-2">
                  "Rating của tôi vừa tăng 50, nhưng tôi chỉ thắng 1 set, tại sao?"
                </p>
                <p className="text-sm text-gray-700">
                  Hệ số căng thẳng của set đó rất cao (sít sao + kéo dài lâu) → Hệ số 1.3 → Rating
                  thay đổi nhiều.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-bold text-gray-900 mb-2">
                  "Tôi thắng nhưng rating giảm?"
                </p>
                <p className="text-sm text-gray-700">
                  Rating giảm thường xảy ra vì bạn thắng người yếu hơn (kỳ vọng sẵn) hoặc RD của bạn
                  còn cao.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-bold text-gray-900 mb-2">
                  "RD của tôi sao cao thế?"
                </p>
                <p className="text-sm text-gray-700">
                  RD cao khi bạn mới tham gia hoặc không chơi lâu.
                </p>
              </div>
            </div>
          </section>

          {/* Summary Table */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🎯 Tóm Tắt
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left font-bold">Khái Niệm</th>
                    <th className="border border-gray-300 p-2 text-left font-bold">Ý Nghĩa</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2 font-bold">Rating</td>
                    <td className="border border-gray-300 p-2">Trình độ của bạn (cao = mạnh)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 p-2 font-bold">RD</td>
                    <td className="border border-gray-300 p-2">
                      Chắc chắn của rating (thấp = chắc chắn)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-bold">Volatility</td>
                    <td className="border border-gray-300 p-2">Ổn định trình độ (thấp = ổn định)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 p-2 font-bold">Đối Thủ Ảo</td>
                    <td className="border border-gray-300 p-2">Đại diện đối thủ trong trận 2v2</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-bold">Multiplier</td>
                    <td className="border border-gray-300 p-2">
                      Hệ số căng thẳng của mỗi set (1.0 - 1.3)
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 p-2 font-bold">Kỳ</td>
                    <td className="border border-gray-300 p-2">1 ngày = 1 kỳ tính điểm</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-bold">Xếp Hạng</td>
                    <td className="border border-gray-300 p-2">
                      Sắp xếp người chơi theo rating
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
