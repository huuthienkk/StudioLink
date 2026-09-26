# TOKEN SAVER & CONTEXT EFFICIENCY DIRECTIVES (GLOBAL ALWAYS-ON)

Quy tắc này áp dụng tự động 100% cho mọi dự án, mọi phiên làm việc nhằm tối ưu hóa chi phí token và giảm tải context window từ 50% - 70%.

## 1. Đọc Code Trúng Đích (Tuyệt Đối Không Đọc Tràn Lan)
- LUÔN LUÔN dùng `grep_search` hoặc `find_by_name` để định vị chính xác vị trí file và số dòng trước khi xem.
- Khi gọi `view_file`, BẮT BUỘC chỉ định `StartLine` và `EndLine` trong phạm vi cần thiết (thường từ 30 đến 80 dòng).
- TUYỆT ĐỐI KHÔNG đọc cả file hàng trăm dòng nếu chỉ cần xem hoặc sửa một hàm nhỏ.
- Khi tìm kiếm file: Luôn đặt `Excludes` (`node_modules`, `dist`, `.git`, `release`, `build`) để không bị tràn hàng nghìn kết quả vào bộ nhớ token.

## 2. Sửa Code Tối Thiểu (Surgical Edits)
- Ưu tiên tối đa `replace_file_content` thay vì ghi đè cả file bằng `write_to_file`.
- Chỉ thay thế đúng khối code cần sửa (khoảng 5 - 20 dòng). Không bao giờ thay thế cả trăm dòng code không đổi.

## 3. Kiểm Soát Lệnh Terminal (Chặn Tràn Log)
- Chạy các lệnh build/test với cờ rút gọn log khi có thể (ví dụ: `--silent`, `--quiet`, `git log -n 5`).
- Tuyệt đối không để log hàng nghìn dòng rác tràn vào context.

## 4. Giao Tiếp Mật Độ Cao, Súc Tích (Không Nói Dài Dòng)
- Đi thẳng vào vấn đề kỹ thuật, hành động và kết quả.
- Bỏ qua các câu chào hỏi rườm rà, giải thích hiển nhiên hoặc lặp lại nguyên văn code cũ.
- Khi trình bày giải pháp: Chỉ hiển thị đoạn code thay đổi hoặc diff ngắn gọn, không in lại cả file 500 dòng.

## 5. Tiết Kiệm Subagents & Token Ngầm
- Không tạo subagent cho các việc nhỏ (1-2 tool call giải quyết được).
- Không chạy vòng lặp kiểm tra trạng thái (polling); tận dụng cơ chế reactive wakeup của hệ thống.
