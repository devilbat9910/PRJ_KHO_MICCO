# Quy Trình Phát Triển Hướng Đặc Tả (Specification-Driven Workflow)

Tài liệu này định nghĩa quy trình làm việc chuẩn của dự án, kết hợp triết lý "Phát triển hướng Đặc tả" và các phương pháp làm việc hiệu quả với AI. Đây là tài liệu tham chiếu chính cho mọi phiên làm việc.

---

## Giai Đoạn 1: Xây Dựng và Hoàn Thiện Đặc Tả (Thực hiện một lần)

Mục tiêu của giai đoạn này là xây dựng một "bộ não" cho dự án - một tài liệu đặc tả toàn diện, là nguồn sự thật duy nhất.

1.  **Tạo Bản Nháp Đặc Tả (`SPECIFICATION.md`):** AI sẽ phân tích toàn bộ codebase và các tài liệu hiện có để tạo ra một bản nháp chi tiết của file `SPECIFICATION.md`.
2.  **Phê Duyệt và Tinh Chỉnh:** Người dùng (chủ dự án) sẽ xem xét, chỉnh sửa và bổ sung vào bản nháp để đảm bảo nó phản ánh chính xác 100% ý định và yêu cầu.
3.  **Đặt `SPECIFICATION.md` làm Nguồn Sự Thật:** Một khi đã được phê duyệt, file `SPECIFICATION.md` sẽ trở thành tài liệu tham chiếu cốt lõi. Mọi thay đổi, phát triển, hay kiểm thử sau này đều phải tuân thủ và đối chiếu với tài liệu này.

---

## Giai Đoạn 2: Quy Trình Phát Triển Tính Năng (Lặp lại)

Quy trình này được lặp lại cho mỗi tính năng mới hoặc thay đổi yêu cầu.

1.  **Cập Nhật Đặc Tả:** Bất kỳ yêu cầu mới nào cũng phải bắt đầu bằng việc **cập nhật file `SPECIFICATION.md` trước tiên**.
    -   **Hành động:** Cùng với AI, cập nhật các mục liên quan trong `SPECIFICATION.md` (ví dụ: thêm một yêu cầu mới vào bảng "Yêu Cầu Chức Năng", hoặc điều chỉnh "Cấu Trúc Sheet").

2.  **Lập Kế Hoạch (Plan Mode):** Với đặc tả đã được cập nhật, yêu cầu AI vào "Plan Mode" để lập kế hoạch triển khai.
    -   **Hành động:** AI sẽ phân tích yêu cầu trong đặc tả và trình bày một kế hoạch chi tiết: các file cần thay đổi, các hàm cần viết, và các rủi ro tiềm ẩn.

3.  **Thực Thi và Kiểm Thử:** Sau khi kế hoạch được phê duyệt, AI sẽ tiến hành viết code.
    -   **Hành động:** AI sẽ viết hoặc sửa đổi code, luôn đảm bảo tuân thủ các quy tắc trong `SPECIFICATION.md`. Sau khi hoàn tất, cần thực hiện kiểm thử (thủ công hoặc tự động) dựa trên "Tiêu Chí Thành Công" đã được định nghĩa.

4.  **Đồng Bộ Hóa:**
    -   **`clasp push`**: Đẩy các thay đổi mã nguồn lên Google Apps Script.
    -   **`git push`**: Đẩy toàn bộ các thay đổi (cả code và `SPECIFICATION.md`) lên kho chứa GitHub.
    -   **`dialog.md`**: Cập nhật nhật ký làm việc.

---

## Phụ Lục: Các Mẹo Tương Tác Hiệu Quả (Workflow Hacks)

-   **Plan Mode:** Yêu cầu AI lập kế hoạch trước cho các tác vụ phức tạp.
-   **Phạm vi (`@`):** Dùng `@` + tên file để AI tập trung vào các file cụ thể.
-   **Bộ nhớ (`#`):** Dùng `#` để thêm các quy tắc tạm thời vào bộ nhớ của AI.
-   **Extended Thinking:** Yêu cầu AI "suy nghĩ sâu hơn" khi gặp vấn đề khó.
-   **Cung cấp hình ảnh:** Kéo thả ảnh vào chat để mô tả các yêu cầu về giao diện.
