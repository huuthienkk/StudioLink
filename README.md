# NexaSocial - Hệ Thống Tự Động Hóa Tiếp Thị Đa Nền Tảng

> Phần mềm tự động hóa tiếp thị mạng xã hội (Facebook & LinkedIn) chuyên nghiệp trên nền tảng Electron, tích hợp AI biến thể nội dung, cơ chế bảo vệ tài khoản đa tầng và quản lý proxy độc lập. Giao diện Dark Wine Crimson cao cấp theo mẫu thiết kế tùy chỉnh.

---

## 📊 BẢNG THEO DÕI TIẾN ĐỘ DỰ ÁN (PROGRESS TRACKER)

| Giai đoạn | Nội dung công việc | Trạng thái | Tiến độ |
| :--- | :--- | :---: | :---: |
| **Giai đoạn 0** | Khởi tạo cấu trúc dự án & Cấu hình môi trường | Hoàn thành | 100% |
| **Giai đoạn 1** | Hạ tầng CSDL SQLite (WebAssembly SQL.js) & Repositories | Hoàn thành | 100% |
| **Giai đoạn 2** | Lõi Trình duyệt (Proxy, Profile, Humanize) & AI Core | Hoàn thành | 100% |
| **Giai đoạn 3** | Driver tự động hóa nền tảng (Facebook & LinkedIn) | Hoàn thành | 100% |
| **Giai đoạn 4** | Động cơ điều phối & Bảo vệ (Scheduler, Runner, Guards) | Hoàn thành | 100% |
| **Giai đoạn 5** | Cầu nối IPC & Giao diện React UI (Quy trình Profile & Tự động đóng web) | Hoàn thành | 100% |
| **Giai đoạn 6** | Quản lý Bản quyền, Kiểm thử E2E & Sẵn sàng đóng gói Windows | Hoàn thành Backend & Test | 100% |

---

## 🛠 KHẮC PHỤC LỖI TƯƠNG THÍCH ELECTRON & SQLITE

* **Nguyên nhân:** Electron 34 sử dụng môi trường Node.js nhúng phiên bản **`20.19.1`**, trong khi module `node:sqlite` chỉ mới xuất hiện trên Node `22.5.0+`, dẫn đến lỗi `No such built-in module: node:sqlite` khi khởi động app.
* **Giải pháp dứt điểm:** Đã chuyển tầng CSDL sang **`sql.js` (WebAssembly SQLite)**:
  * Không phụ thuộc bất kỳ compiler C++ nào (không cần Visual Studio, không lỗi node-gyp).
  * Tương thích 100% với môi trường Node 20 của Electron và Node 24 của hệ điều hành.
  * Tự động đọc và ghi dữ liệu ra file `userData/nexasocial.sqlite` trên ổ cứng.
  * 17/17 bài test tự động đều đã vượt qua 100%.
