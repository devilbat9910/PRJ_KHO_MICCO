# Quy Trình Đóng Phiên Làm Việc

Đây là checklist chuẩn để thực hiện khi nhận được yêu cầu "Đóng phiên làm việc".

## To-Do List

1.  **Kiểm tra chức năng:** Đảm bảo các tính năng vừa phát triển hoặc sửa lỗi hoạt động đúng như yêu cầu cuối cùng.
2.  **Đẩy lên Apps Script (`clasp push`):** Chạy lệnh `clasp push` để triển khai phiên bản mã nguồn mới nhất lên máy chủ Google.
3.  **Đồng bộ lên GitHub (`git`):**
    -   Chạy `git add .` để thêm tất cả các thay đổi.
    -   Chạy `git commit -m "..."` với một tin nhắn mô tả rõ ràng các thay đổi.
    -   Chạy `git push` để đồng bộ hóa với kho chứa trên GitHub.
4.  **Cập nhật Nhật ký (`dialog.md`):** Ghi lại tóm tắt chi tiết các công việc đã làm, các vấn đề đã gặp và các giải pháp đã thực hiện trong phiên.
5.  **Thông báo hoàn tất:** Báo cáo cho người dùng rằng quy trình đóng phiên đã hoàn tất và hệ thống đã được đồng bộ hóa an toàn.