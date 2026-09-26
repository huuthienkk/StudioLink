# Kế Hoạch Triển Khai Tự Động Hóa LinkedIn (LinkedIn Campaign Automation Plan)

## Bối Cảnh Hiện Tại

### ✅ Những gì đã có sẵn
| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| `LinkedInAuth` | Đã có | Đăng nhập, kiểm tra phiên cookie, phát hiện checkpoint |
| `LinkedInPeopleSearch` | Đã có | Nhưng dùng direct URL với `geoUrn` thay vì flow UI thực tế |
| `LinkedInConnector` | Đã có | Nhưng mở từng profile URL, chưa connect từ trang kết quả |
| `LinkedInCampaignFlow` | Đã có | Lắp ráp các module trên, nhưng toàn bộ flow sai so với luồng thực tế |
| `LI_SELECTORS` | Đã có | Cần bổ sung nhiều selector mới |
| `CampaignsPage.tsx` (UI) | Đã có | Nhưng form chưa phân biệt Facebook / LinkedIn |

### ❌ Những gì sai / thiếu
1. **Flow sai hoàn toàn:** Code hiện tại đang làm: mở trang kết quả people → lấy danh sách URL → lần lượt `goto(profileUrl)` → click Connect trên profile. Thực tế phải: click trực tiếp **Connect ngay trên thẻ trong danh sách** → không cần mở profile → nhanh và an toàn hơn.
2. **Thiếu bộ lọc Vị trí (Locations Filter):** Hiện code dùng `geoUrn` trực tiếp trên URL (cần Premium/API). Thực tế phải click UI bộ lọc, gõ địa điểm, chọn gợi ý đầu tiên → click "Hiển thị kết quả".
3. **Thiếu phân trang (Pagination):** Chưa code xử lý click nút Next → sang trang tiếp theo.
4. **Thiếu giới hạn tổng số lượng gửi:** Hiện chỉ có `dailyLimit` từ `ScheduleConfig`, chưa có ô "Gửi tối đa X kết nối cho chiến dịch này".
5. **UI Form Modal chưa phân biệt platform:** Form tạo chiến dịch giống hệt nhau cho cả Facebook và LinkedIn, chưa có các ô riêng của LinkedIn (Từ khóa chức danh, Địa điểm, Lời nhắn, Tổng số kết nối mục tiêu).

---

## Phạm Vi Công Việc Cần Làm

### Layer 1: Automation Core (Backend)

| # | File | Thay đổi |
|---|---|---|
| 1 | `src/platforms/linkedin/selectors.ts` | Thêm selector cho Location filter, nút Connect trên card, pagination, modal Note |
| 2 | `src/platforms/linkedin/people-search.ts` | Viết lại hoàn toàn: Flow UI thực tế + Bộ lọc vị trí qua giao diện |
| 3 | `src/platforms/linkedin/connector.ts` | Viết lại: Connect trực tiếp từ search result card, không cần mở profile |
| 4 | `src/platforms/linkedin/campaign.ts` | Viết lại flow hoàn chỉnh: Search → Filter Location → Connect cards → Next page → Stop khi đạt target |

### Layer 2: Shared Types (Data)

| # | File | Thay đổi |
|---|---|---|
| 5 | `src/shared/types.ts` | Thêm `targetLocation?: string`, `maxConnections?: number` vào `Campaign` |

### Layer 3: UI (Frontend)

| # | File | Thay đổi |
|---|---|---|
| 6 | `src/renderer/features/campaigns/CampaignsPage.tsx` | Tách form riêng: Nếu `platform === 'linkedin'` hiển thị form LinkedIn-specific fields (không có quét nhóm, có Địa điểm, Lời nhắn, Số kết nối mục tiêu) |

---

## Các Phương Án Triển Khai

### 🅰️ Phương Án A: Tái Cấu Trúc Hoàn Toàn LinkedIn (Full Rewrite)

**Mô tả:** Xóa và viết lại hoàn toàn 4 file LinkedIn core theo đúng luồng thực tế bạn đã mô tả. Bao gồm UI form mới chuyên biệt cho LinkedIn.

**Ưu điểm:**
- Code sạch, đúng chuẩn từ đầu, dễ maintain sau này.
- Không bị "nợ kỹ thuật" (tech debt) từ code cũ không đúng.
- UI form LinkedIn trực quan, rõ ràng theo đúng nhu cầu thực tế.

**Nhược điểm:**
- Tốn thời gian nhất (ước tính ~3-4 giờ code + test).
- Rủi ro cao hơn nếu có nhiều thay đổi đồng thời.

**Phạm vi:** 6 file thay đổi, 3 file mới (test).

---

### 🅱️ Phương Án B: Cải Tiến Từng Bước (Incremental Improvement)

**Mô tả:** Không xóa code cũ, chỉ mở rộng và vá đúng chỗ thiếu:
1. Cập nhật `people-search.ts` để thêm bước click bộ lọc Vị trí qua UI.
2. Cập nhật `connector.ts` để hỗ trợ connect từ search card (không cần mở profile).
3. Cập nhật `campaign.ts` để dùng card-connect flow + pagination + max connections limit.
4. Thêm trường LinkedIn vào UI form.

**Ưu điểm:**
- Ít rủi ro phá vỡ code cũ.
- Nhanh hơn (~1.5-2 giờ).

**Nhược điểm:**
- Code cũ vẫn còn xen kẽ, hơi phức tạp khi đọc.
- Logic cũ (mở từng profile URL) vẫn còn đó, dễ gây nhầm lẫn.

---

### 🅲 Phương Án C: Kiến Trúc Strategy Pattern (Tách riêng hẳn)

**Mô tả:** Tạo class mới `LinkedInSearchConnectFlow` chuyên biệt cho luồng Search→Connect mà không sửa các class hiện tại. `LinkedInCampaignFlow` sẽ gọi class mới này. Đồng thời thêm UI form riêng biệt `LinkedInCampaignForm.tsx` thay vì sửa form chung.

**Ưu điểm:**
- Không động đến code cũ → ổn định nhất.
- Dễ test độc lập từng thành phần.
- Scalable nếu sau này LinkedIn thêm nhiều loại chiến dịch khác (InMail, message...).

**Nhược điểm:**
- Tốn thời gian setup ban đầu.
- Có nhiều file hơn → cần quản lý tốt.

---

## Phân Tích Chi Tiết Các Điểm Kỹ Thuật Khó Nhất

### 1. Bộ lọc Location qua UI (không dùng URL trực tiếp)
```
Thao tác UI thực tế:
1. Chờ trang tìm kiếm People load xong
2. Tìm nút "Vị trí" hoặc "Locations" trên thanh bộ lọc
3. Click để mở popover dropdown
4. Tìm input "Thêm vị trí" / "Add a location"
5. Gõ địa điểm (ví dụ: "Ho Chi Minh")
6. Nhấn Enter → chờ gợi ý load
7. Tick vào kết quả đầu tiên trong list checkbox
8. Click nút "Hiển thị kết quả" / "Show results"
9. Chờ trang reload với location filter

Lưu ý quan trọng:
- Giao diện LinkedIn thay đổi nhanh
- Button "Vị trí" có thể thành "Locations" tùy ngôn ngữ
- Kết quả gợi ý là checkbox list, không phải dropdown simple
```

### 2. Connect trực tiếp từ Search Card (không mở Profile)
```
Tại sao tốt hơn:
- Mở profile: 1 request goto() + 2-4s tải trang → mỗi người tốn 5-8s
- Click card: Không cần goto() → mỗi người chỉ tốn 1-2s (5x nhanh hơn)
- LinkedIn ít phát hiện bot hơn vì pattern giống người dùng thật

Điểm khó:
- Mỗi thẻ card có nút Connect ngay trên đó
- Khi click Connect trên card → xuất hiện modal giữa màn hình (Add a note / Send without a note)
- Flow xử lý modal này phải nhanh và chính xác
- Nếu hết note quota → tự động fallback "Send without a note"
```

### 3. Phân trang (Pagination)
```
Cấu trúc trang kết quả LinkedIn:
- Mỗi trang có khoảng 10 kết quả
- Pagination ở cuối trang: [1][2][3]...[N] [Next >]
- Sau khi scroll xuống cuối → bấm Next → trang mới load
- URL thay đổi: ?page=2, ?page=3...
- Cần detect khi nào là trang cuối cùng (nút Next bị disable)
```

### 4. Quản lý số lượng mục tiêu (Target Count)
```
Logic đếm:
- Người dùng nhập: "Muốn gửi tối đa 50 kết nối"
- Đếm cả bị skip (Pending, no Connect button) không tính vào quota
- Chỉ đếm những người đã gửi thành công
- Dừng ngay khi sentCount >= maxConnections
```

---

## Kế Hoạch Phát Triển Giai Đoạn (Roadmap Stages)

### Giai Đoạn 1: Hạ Tầng (Foundation) — Ưu tiên cao nhất
- [ ] Cập nhật `LI_SELECTORS` với đầy đủ selector mới
- [ ] Cập nhật `Campaign` type với `targetLocation` và `maxConnections`

### Giai Đoạn 2: Automation Engine — Lõi hệ thống
- [ ] Viết lại `LinkedInPeopleSearch` với Location filter UI flow
- [ ] Viết lại `LinkedInConnector` với card-based connect + note modal
- [ ] Viết lại `LinkedInCampaignFlow` với pagination + max count

### Giai Đoạn 3: UI/UX — Giao diện người dùng
- [ ] Cập nhật `CampaignsPage.tsx` với form riêng biệt cho LinkedIn

### Giai Đoạn 4: Test & Báo cáo
- [ ] Cập nhật unit tests
- [ ] Thử nghiệm thực tế và fix edge cases

---

## Phân Tích Rủi Ro

| Rủi ro | Mức độ | Cách xử lý |
|---|---|---|
| LinkedIn thay đổi DOM/selector | Cao | Tập trung tất cả selector vào 1 file, dễ cập nhật |
| Giao diện tiếng Anh vs Việt vs ngôn ngữ khác | Cao | Selector dùng cả 2 ngôn ngữ |
| Nút Connect không xuất hiện trên card | Trung bình | Fallback: bỏ qua, đếm là skipped |
| Hết quota note của tháng | Trung bình | Tự động fallback "Send without note" |
| LinkedIn phát hiện bot | Trung bình | Humanize delay, cuộn tự nhiên, profile riêng |
| Modal "Premium required" chặn | Thấp | Đóng modal, bỏ qua người đó |
