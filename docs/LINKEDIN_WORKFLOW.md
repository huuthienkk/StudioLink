# Quy Trình Chuẩn Hoạt Động Chiến Dịch LinkedIn (LinkedIn Automation Flow)

> Tài liệu ghi nhận toàn bộ luồng thực tế từ giao diện người dùng LinkedIn (10 hình ảnh thực tế) để cấu hình và phát triển bộ máy tự động hóa chính xác, mượt mà và an toàn nhất.

---

## 📌 Tổng Quan Toàn Bộ Luồng Tự Động Hóa (End-to-End Workflow)

```
[1. Trang chủ /feed/] 
       ↓ 
[2. Nhập từ khóa chức danh (CEO...)] 
       ↓ 
[3. Nhấn Enter tìm kiếm chung] 
       ↓ 
[4. Click tab "Người" / "People"] 
       ↓ 
[5. Mở bộ lọc "Vị trí" / "Locations" → Gõ địa điểm → Chọn gợi ý 1 → Bấm "Hiển thị kết quả"] 
       ↓ 
[6. Duyệt danh sách kết quả trực tiếp trên trang tìm kiếm (Trang 1... N)] 
       ↓ 
[7. Bấm nút "+ Connect" trên thẻ ứng viên] 
       ↓ 
[8. Modal "Add a note": Bấm "Add a note" → Nhập tin nhắn đã chuẩn bị → Bấm "Send"] 
       ↓ 
[9. Nghỉ ngẫu nhiên an toàn → Tiếp tục thẻ tiếp theo xuống hết trang] 
       ↓ 
[10. Đến cuối trang → Bấm nút "Next >" sang trang tiếp theo → Lặp lại đến khi đạt đủ số lượng]
```

---

## 🔍 Chi Tiết Từng Bước Thực Thi

### Bước 1: Truy cập trang chủ LinkedIn
- **URL mục tiêu:** `https://www.linkedin.com/feed/`
- **Trạng thái:** Tài khoản đã đăng nhập sẵn trong Profile riêng biệt.
- **Thao tác:** Định vị ô tìm kiếm ở góc trên bên trái header navigation.
- **Đặc điểm selector:** 
  - Input tìm kiếm có icon kính lúp.
  - Placeholder: `Tìm kiếm` (tiếng Việt) hoặc `Search` (tiếng Anh).

---

### Bước 2: Kích hoạt ô tìm kiếm & Nhập chức danh mục tiêu
- **Thao tác:** 
  - Click vào ô tìm kiếm.
  - Nhập từ khóa chức danh/vị trí tuyển dụng (ví dụ: `CEO`, `Founder`, `Marketing Director`...).
- **Phản hồi UI:** Xuất hiện dropdown gợi ý kết quả.

---

### Bước 3: Gửi lệnh tìm kiếm (Nhấn Enter)
- **Thao tác:** Nhấn phím `Enter`.
- **URL chuyển hướng:**
  `https://www.linkedin.com/search/results/all/?keywords={KEYWORD}&origin=GLOBAL_SEARCH_HEADER`
- **Giao diện:** Tải trang kết quả tổng hợp (All results).

---

### Bước 4: Nhận diện & Bấm tab bộ lọc "Người" (People Filter)
- **Đặc thù LinkedIn:** Vị trí các nút lọc danh mục (*Việc làm, Bài đăng, Người, Nhóm, Công ty...*) **thay đổi ngẫu nhiên** qua từng phiên (lúc ở đầu, lúc ở giữa, lúc ở cuối).
- **Quy tắc nhận diện chính xác:** 
  - Quét tìm theo văn bản hiển thị: `"Người"` (tiếng Việt) hoặc `"People"` (tiếng Anh).
  - Không cố định theo số thứ tự index (`nth-child`).
- **Kết quả:** Điều hướng sang trang tìm kiếm nhân sự:
  `https://www.linkedin.com/search/results/people/?keywords={KEYWORD}...`

---

### Bước 5: Áp dụng bộ lọc "Vị trí" (Locations Filter)
- **Thao tác chi tiết:**
  1. Click vào nút bộ lọc **`Vị trí`** (hoặc **`Locations`**) trên thanh công cụ phía trên danh sách.
  2. Xuất hiện hộp thoại popover dạng dropdown bên dưới.
  3. Định vị ô input có placeholder: `Thêm vị trí` (hoặc `Add a location`).
  4. Nhập tên địa điểm mà người dùng đã thiết lập trong chiến dịch (ví dụ: `Ho Chi Minh`, `Hanoi`, `Vietnam`...).
  5. Nhấn phím `Enter` hoặc click vào dòng kết quả gợi ý đầu tiên trong danh sách checkbox.
  6. Click nút màu xanh chính: **`Hiển thị kết quả`** (hoặc **`Show results`**).
- **Kết quả:** Trang tìm kiếm tự động tải lại với danh sách nhân sự đúng theo vị trí địa lý đã lọc.

---

### Bước 6: Duyệt danh sách trực tiếp trên trang kết quả (Không cần mở từng Profile)
- **Ưu điểm vượt trội:** 
  - Thay vì phải mở từng URL trang cá nhân làm tốn thời gian và dễ timeout/checkpoint, các thẻ ứng viên ngay trên trang tìm kiếm đã có sẵn nút `+ Connect`.
  - Tốc độ xử lý nhanh hơn gấp 5 - 10 lần và mô phỏng chính xác thao tác người dùng thật.
- **Thành phần mỗi thẻ ứng viên:**
  - Tên ứng viên & Cấp độ kết nối (2nd, 3rd...).
  - Chức danh hiện tại (Headline).
  - Địa điểm làm việc.
  - Nút **`+ Connect`** (hoặc **`Kết nối`**).

---

### Bước 7: Bấm nút "+ Connect" trên thẻ ứng viên
- **Thao tác:** Quét các nút có nhãn `Connect` hoặc `Kết nối` trên các thẻ từ trên xuống dưới.
- **Bỏ qua an toàn:** Nếu thẻ đó hiển thị `Pending` (đang chờ duyệt) hoặc `Follow` (chỉ theo dõi), bot sẽ tự động bỏ qua sang người tiếp theo.

---

### Bước 8: Thêm lời nhắn cá nhân hóa (Add a note) & Gửi
- **Khi click Connect:** LinkedIn hiển thị hộp thoại modal: *"Add a note to your invitation?"*.
- **Các tùy chọn:**
  - Nút **`Add a note`** (Thêm ghi chú).
  - Nút **`Send without a note`** (Gửi không có ghi chú).
- **Quy trình:**
  1. Click vào nút **`Add a note`**.
  2. Trình soạn thảo mở ra ô textarea với placeholder *"Ex: We know each other from..."* (giới hạn tối đa **200 ký tự**).
  3. Gõ nội dung lời mời đã được cá nhân hóa bằng Humanize typing (tốc độ gõ phím người thật).
  4. Click nút **`Send`** (Gửi).
- **Lưu ý về chính sách LinkedIn:** Tài khoản miễn phí (Free) có giới hạn số lượt gửi lời mời kèm note mỗi tháng (ví dụ *"X personalized invitations remaining for this month"*). Nếu phát hiện hết quota gửi note, hệ thống sẽ tự động chuyển sang bấm `Send without a note` để chiến dịch không bị nghẽn.
- **Giãn cách an toàn:** Sau mỗi lần gửi thành công, nghỉ ngẫu nhiên từ 15s - 45s để bảo vệ tài khoản chống checkpoint.

---

### Bước 9: Làm tuần tự từ trên xuống dưới
- Duyệt qua từng người trong danh sách của trang hiện tại.
- Tự động cuộn trang (smooth scroll) nhẹ nhàng để các thẻ bên dưới xuất hiện tự nhiên.
- Cập nhật tiến độ trực tiếp lên thanh trạng thái và Pet linh vật: *"Đã gửi kết nối: X / Tổng số lượng yêu cầu"*.

---

### Bước 10: Phân trang (Pagination) & Kết thúc chiến dịch
- **Chuyển trang:** Khi đã gửi hết các thẻ trên trang hiện tại, hệ thống cuộn xuống chân trang và click vào nút **`Next >`** (hoặc số trang tiếp theo: 2, 3, 4...).
- **Lặp lại quy trình:** Tiếp tục từ Bước 6 trên trang mới.
- **Dừng chiến dịch khi:**
  1. Đã đạt đủ **số lượng kết nối mục tiêu** mà người dùng đã thiết lập trong ô cấu hình chiến dịch.
  2. Hoặc người dùng bấm nút **Tạm dừng / Dừng hẳn**.
  3. Hoặc LinkedIn hiển thị cảnh báo giới hạn tuần (*"Weekly invitation limit reached"*).
