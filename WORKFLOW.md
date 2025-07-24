# Cấu hình Môi trường Làm việc

**QUAN TRỌNG:** Thư mục làm việc chính của dự án (`PRJ_KHO`) được đặt tại đường dẫn sau. Tất cả các tệp tài liệu cốt lõi (`SPECIFICATION.md`, `dialog.md`, `Task.md`) đều nằm trong thư mục này.

- **Đường dẫn Thư mục Dự án:** `/Users/nhung/Documents/Tài liệu AI/PRJ_KHO/`

Khi bắt đầu một phiên làm việc mới, hãy ưu tiên truy cập vào đường dẫn này để đọc các tệp cần thiết.

---

# Quy Trình Triển Khai Dự Án Với Context Engineering

Đây là quy trình chuẩn để áp dụng nền tảng Context Engineering cho bất kỳ dự án mới nào. Quy trình bao gồm hai giai đoạn chính: **Thiết Lập Dự Án** (thực hiện một lần) và **Phát Triển Tính Năng** (lặp lại cho mỗi yêu cầu mới).

---

## Giai Đoạn 1: Thiết Lập Dự Án (Một Lần)

Mục tiêu của giai đoạn này là tùy chỉnh template cho phù hợp với các quy tắc, kiến trúc và yêu cầu cụ thể của dự án mới.

### Bước 1: Tùy Chỉnh Quy Tắc Toàn Cục (`CLAUDE.md`)

File [`CLAUDE.md`](CLAUDE.md) là "hiến pháp" cho AI. Nó chứa các quy tắc mà AI phải tuân theo trong suốt dự án.

**Hành động:**
1.  Mở file [`CLAUDE.md`](CLAUDE.md).
2.  Chỉnh sửa các quy tắc hiện có cho phù hợp với dự án của bạn (ngôn ngữ lập trình, framework, tiêu chuẩn code, quy tắc đặt tên, v.v.).
3.  **Quan trọng:** Các quy tắc này ảnh hưởng đến mọi yêu cầu sau này, vì vậy hãy đảm bảo chúng rõ ràng và nhất quán.

### Bước 2: Tạo Tài Liệu Lập Kế Hoạch (`PLANNING.md`)

File này mô tả kiến trúc tổng thể, các thành phần chính, và định hướng kỹ thuật của dự án. AI sẽ đọc file này để hiểu bối cảnh.

**Hành động:**
1.  Tạo một file mới tên là `PLANNING.md` ở thư mục gốc.
2.  Điền các thông tin sau:
    *   **Project Architecture:** Sơ đồ kiến trúc, mô tả các lớp (presentation, business, data).
    *   **Core Components:** Danh sách các thư viện, framework chính và lý do lựa chọn.
    *   **Coding Conventions:** Các quy ước chi tiết chưa có trong `CLAUDE.md`.
    *   **File Structure:** Mô tả cấu trúc thư mục mong muốn.

### Bước 3: Tạo File Quản Lý Công Việc (`TASK.md`)

File này dùng để theo dõi các công việc cần làm. AI sẽ cập nhật file này khi hoàn thành nhiệm vụ.

**Hành động:**
1.  Tạo một file mới tên là `TASK.md` ở thư mục gốc.
2.  Tạo các đầu mục ban đầu, ví dụ:
    ```markdown
    # Project Tasks

    ## To Do
    - [ ] Setup initial project structure.

    ## In Progress
    -

    ## Done
    -
    ```

### Bước 4: Cung Cấp Mẫu Code (`examples/`)

Đây là bước **quan trọng nhất** để đảm bảo AI viết code theo đúng phong cách của bạn.

**Hành động:**
1.  Xóa các file mẫu không liên quan trong thư mục [`examples/`](examples/).
2.  Thêm vào các đoạn code mẫu từ các dự án trước hoặc viết mới các mẫu đại diện cho:
    *   **Cấu trúc file/module.**
    *   **Cách kết nối database.**
    *   **Cách gọi API.**
    *   **Mẫu unit test.**
    *   **Cách xử lý lỗi.**
    *   **Mẫu CLI (nếu có).**
3.  Tạo một file `examples/README.md` để giải thích mục đích của từng file mẫu.

---

## Giai Đoạn 2: Quy Trình Phát Triển Tính Năng (Lặp Lại)

Quy trình này được lặp lại cho mỗi tính năng mới bạn muốn AI phát triển.

### Bước 1: Đề Bài (`INITIAL.md`)

Mỗi yêu cầu mới bắt đầu bằng việc điền vào file [`INITIAL.md`](INITIAL.md). Đây là "đề bài" cho AI.

**Hành động:**
Sử dụng prompt template dưới đây để điền vào file [`INITIAL.md`](INITIAL.md).

### Prompt Template cho `INITIAL.md`

```markdown
## FEATURE:
(Mô tả chi tiết tính năng bạn muốn xây dựng. Càng cụ thể càng tốt.
Ví dụ: "Xây dựng một API endpoint bằng FastAPI để upload file CSV chứa dữ liệu người dùng và lưu vào bảng 'users' trong database PostgreSQL.")

## EXAMPLES:
(Liệt kê các file trong thư mục `examples/` mà AI nên tham khảo và giải thích rõ cần học hỏi điều gì từ mỗi file.
Ví dụ:
- "Tham khảo `examples/database_connection.py` để biết cách tạo và quản lý session khi kết nối PostgreSQL."
- "Sử dụng cấu trúc API trong `examples/fastapi_endpoint.py` làm mẫu cho endpoint mới.")

## DOCUMENTATION:
(Cung cấp các link tài liệu liên quan.
Ví dụ:
- "Tài liệu về FastAPI File Uploads: https://fastapi.tiangolo.com/features/#file-uploads"
- "Tài liệu thư viện Pydantic: https://pydantic-docs.helpmanual.io/")

## OTHER CONSIDERATIONS:
(Ghi chú các yêu cầu đặc biệt, các lỗi thường gặp hoặc những điều cần lưu ý.
Ví dụ:
- "Cần validate file upload phải là định dạng CSV."
- "Xử lý trường hợp file CSV có header không đúng định dạng."
- "Dữ liệu trong cột 'email' phải là duy nhất (unique).")
```

### Bước 2: Tạo Kế Hoạch Chi Tiết (PRP)

Sau khi có `INITIAL.md`, bạn yêu cầu AI tạo ra một bản kế hoạch chi tiết gọi là PRP (Product Requirements Prompt).

**Hành động:**
Chạy lệnh sau trong terminal của Claude Code:
```bash
/generate-prp INITIAL.md
```
AI sẽ phân tích yêu cầu, nghiên cứu codebase và các mẫu, sau đó tạo ra một file PRP mới trong thư mục [`PRPs/`](PRPs/). File này chứa kế hoạch triển khai từng bước, các đoạn code cần thiết, và các lệnh để kiểm thử.

### Bước 3: Thực Thi Kế Hoạch

Cuối cùng, bạn yêu cầu AI thực hiện kế hoạch đã được tạo ra.

**Hành động:**
Chạy lệnh sau (thay `your-feature-name.md` bằng tên file PRP do AI tạo ra):
```bash
/execute-prp PRPs/your-feature-name.md
```
AI sẽ bắt đầu viết code, tạo file, chạy test, và tự sửa lỗi cho đến khi hoàn thành tất cả các yêu cầu trong PRP.

### QUY TẮC BẮT BUỘC: ĐỒNG BỘ HÓA SAU MỖI NHIỆM VỤ

**Quan trọng:** Sau khi hoàn thành **MỌI** nhiệm vụ (sửa lỗi, thêm tính năng, tái cấu trúc), bạn **PHẢI** chạy lệnh `clasp push` để đảm bảo mã nguồn trên máy chủ Google Apps Script luôn được cập nhật.

Việc này ngăn ngừa các lỗi "Không tìm thấy hàm tập lệnh" và đảm bảo tính nhất quán của môi trường.

Bằng cách tuân thủ quy trình này, bạn có thể đảm bảo AI luôn có đủ bối cảnh cần thiết để hoàn thành công việc một cách hiệu quả và nhất quán.

---

### QUY TẮC VÀNG: KẾT THÚC PHIÊN LÀM VIỆC

Trước khi kết thúc một phiên làm việc, **LUÔN LUÔN** đảm bảo bạn đã thực hiện hai bước sau:

1.  **`clasp push`**: Đẩy tất cả các thay đổi mã nguồn lên máy chủ Google Apps Script để đồng bộ hóa.
2.  **Ghi `dialog.md`**: Cập nhật chi tiết nhật ký công việc, ghi lại tất cả các vấn đề đã gặp, các giải pháp đã thực hiện và trạng thái cuối cùng của dự án.

Việc này đảm bảo tính toàn vẹn của dự án và giúp cho việc tiếp tục công việc trong các phiên sau được liền mạch.

---
**Quy trình Gỡ lỗi `Mã kho` (24/07/2025):**
1.  **Sự cố:** Lỗi "Yêu cầu phải có Mã kho" lặp lại.
2.  **Phân tích:** Sau nhiều vòng lặp, xác định nguyên nhân là do sự không nhất quán về cách viết hoa và khoảng trắng trong key `'Mã kho'` từ sheet đầu vào.
3.  **Giải pháp:**
    - Tái cấu trúc hàm `db_findWarehouse` trong `db.js` để tăng tính mạnh mẽ.
    - Nâng cấp hàm `normalizeObjectKeys` trong `service.js` để xử lý key không phân biệt chữ hoa chữ thường và tự động loại bỏ khoảng trắng.
4.  **Tài liệu hóa:** Toàn bộ quá trình được ghi lại trong `REFACTOR_PLAN.md`. Tệp đặc tả `specification.md` được thêm vào dự án.

---
**Quy trình Gỡ lỗi Giao dịch 'Xuất' (24/07/2025):**
1.  **Sự cố:** Giao dịch 'Xuất' thất bại với lỗi xác thực không rõ ràng.
2.  **Phân tích:** Phát hiện ra rằng logic phía client trong `UI.js` đã đọc sai cột dữ liệu từ sheet. Cụ thể, nó đã lấy giá trị từ cột 'Tên kho' thay vì cột 'Mã kho' như yêu cầu của lớp dịch vụ.
3.  **Giải pháp:** Sửa đổi mã trong `UI.js` để đảm bảo nó tham chiếu chính xác đến cột 'Mã kho' khi thu thập dữ liệu giao dịch 'Xuất'. Điều này đảm bảo dữ liệu được truyền đi là chính xác, giải quyết triệt để lỗi xác thực.