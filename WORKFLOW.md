# QUY TRÌNH LÀM VIỆC CHUẨN

Tài liệu này định nghĩa các bước cần thực hiện khi bắt đầu và kết thúc một phiên làm việc để đảm bảo tính nhất quán và toàn vẹn của dự án.

---

## ✅ Checklist Khi Bắt Đầu Phiên Làm Việc Mới

- [ ] **Đọc `dialog.md`:** Đọc lại file nhật ký để nắm bắt bối cảnh và trạng thái công việc của phiên làm việc trước đó.
- [ ] **Xem lại Kế hoạch/Nhiệm vụ:** Kiểm tra các file kế hoạch (nếu có, ví dụ: `REFACTOR_PLAN.md`) hoặc các yêu cầu còn tồn đọng.
- [ ] **Kiểm tra `git status`:** Chạy lệnh `git status` để đảm bảo không có thay đổi nào chưa được commit từ phiên trước.
- [ ] **Xác nhận mục tiêu:** Thảo luận và thống nhất mục tiêu chính cần hoàn thành trong phiên làm việc hiện tại với người dùng.

---

## ✅ Checklist Khi Tổng Kết Phiên Làm Việc

- [ ] **Kiểm tra chức năng:** Đảm bảo các tính năng vừa phát triển hoặc sửa lỗi hoạt động đúng như yêu cầu cuối cùng.
- [ ] **Đẩy lên Apps Script (`clasp push`):** Chạy lệnh `clasp push` để triển khai phiên bản mã nguồn mới nhất lên máy chủ Google.
- [ ] **Đồng bộ lên GitHub (`git`):**
    - [ ] Chạy `git add .` để thêm tất cả các thay đổi.
    - [ ] Chạy `git commit -m "..."` với một tin nhắn mô tả rõ ràng các thay đổi.
    - [ ] Chạy `git push` để đồng bộ hóa với kho chứa trên GitHub.
- [ ] **Cập nhật Nhật ký (`dialog.md`):** Ghi lại tóm tắt chi tiết các công việc đã làm, các vấn đề đã gặp và các giải pháp đã thực hiện trong phiên.
- [ ] **Cập nhật Tài liệu Bàn giao (`doc.js`):** Nếu có thay đổi lớn về quy trình hoặc nghiệp vụ, cập nhật lại hàm `getDocumentationContent()` trong `doc.js` và thông báo cho người dùng.
