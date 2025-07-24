# [PRJ_KHO] Hệ Thống Quản Lý Tồn Kho - Đặc Tả Kỹ Thuật (Phiên Bản 1.3)

- **Ngày tạo:** 14/07/2025
- **Phiên bản:** 2.0
- **Cập nhật gần nhất:** 21/07/2025

---

## 1. Tổng Quan

### 1.1. Ý Định & Mục Tiêu
Tài liệu này đặc tả toàn bộ hệ thống Quản lý Tồn kho được xây dựng trên nền tảng Google Sheets và Google Apps Script. Mục tiêu của hệ thống là cung cấp một công cụ linh hoạt, chính xác và dễ sử dụng để theo dõi chi tiết hàng tồn kho theo từng lô, quản lý các giao dịch nhập-xuất-điều chuyển, và cung cấp khả năng báo cáo, truy vết mạnh mẽ.

### 1.2. Giá Trị Cốt Lõi
- **Tính Toàn Vẹn Dữ Liệu:** Hệ thống được thiết kế để đảm bảo dữ liệu luôn chính xác thông qua các quy tắc nghiệp vụ, validation và một sổ cái giao dịch bất biến.
- **Tự Động Hóa & Hiệu Quả:** Giảm thiểu các thao tác thủ công, tự động hóa việc tính toán tồn kho, tạo báo cáo và gợi ý dữ liệu đầu vào.
- **Khả Năng Truy Vết:** Mọi giao dịch đều được ghi lại với đầy đủ thông tin, cho phép truy vết và kiểm toán dễ dàng.

### 1.3. Thư mục dự án
- **Đường dẫn:** `/Users/nhung/Documents/Tài liệu AI/PRJ_KHO/`

---

## 2. Kiến Trúc và Thiết Kế

### 2.1. Mô Hình Kiến Trúc
Hệ thống tuân thủ nghiêm ngặt **kiến trúc 3 tầng (3-Layer Architecture)**:

1.  **UI/Bridge Layer (Lớp Giao Diện & Cầu Nối):**
    -   **Thành phần:** `UI.gs`.
    -   **Trách nhiệm:** Là cầu nối duy nhất giữa giao diện người dùng (các menu, nút bấm trên sheet) và lớp dịch vụ. Nó đọc dữ liệu trực tiếp từ các vùng trên sheet (ví dụ: `INPUT_RANGE`) và gọi các hàm xử lý tương ứng. Lớp này không chứa logic nghiệp vụ.

2.  **Service Layer (Lớp Dịch Vụ):**
    -   **Thành phần:** `service.js`.
    -   **Trách nhiệm:** Chứa toàn bộ logic nghiệp vụ của ứng dụng (xử lý giao dịch, tính toán, tạo `INDEX`, kiểm tra quy tắc, logic tìm kiếm nâng cao). Đây là "bộ não" xử lý của hệ thống.

3.  **Data Layer (Lớp Dữ Liệu):**
    -   **Thành phần:** `db.js`.
    -   **Trách nhiệm:** Chịu trách nhiệm duy nhất cho việc đọc và ghi dữ liệu thô trực tiếp vào Google Sheets.

### 2.2. Luồng Dữ Liệu Chính
... (Nội dung không đổi) ...

---

## 3. Đặc Tả Cấu Trúc Google Sheets

... (Nội dung không đổi cho `DANH MUC` và `LOG`) ...

### 3.3. Các Sheet Giao Diện & Báo Cáo
- **`INPUT`**: Giao diện đa chức năng, phục vụ cả việc nhập liệu và tra cứu động.
    - **Vùng Nhập Liệu Giao Dịch (`INPUT_RANGE`):**
        - `Nhập/xuất` (Dropdown: Nhập, Xuất, Điều chuyển)
        - `Tên sản phẩm` (Dropdown từ `DANH MUC`)
        - `Ngày sản xuất`: Khi người dùng nhấp vào ô trong cột này, một công cụ chọn lịch (calendar picker) sẽ hiện ra để đảm bảo định dạng ngày tháng hợp lệ. Đây là chức năng gốc của Google Sheets được kích hoạt thông qua Data Validation.
        - ... (các cột khác) ...
    - **Vùng Tra Cứu Động:**
        - **`SEARCH_INPUT_RANGE` (`L5:N5`):** Khu vực người dùng nhập tiêu chí tìm kiếm.
            - `L5`: **Từ khóa đa năng** (tìm theo Mã index, Tên SP, Viết tắt, Mã lô, ĐV Sản xuất).
            - `M5`: **Ngày** (tìm theo Ngày sản xuất, Ngày nhập/xuất).
            - `N5`: **Tình trạng chất lượng** (Dropdown).
        - **`SEARCH_RESULTS_RANGE` (Bắt đầu từ `O3`):** Khu vực hiển thị kết quả.
            - `Cột O`: Checkbox để chọn các hàng cho các thao tác trong tương lai.
            - `Cột P-AF`: Dữ liệu chi tiết của các giao dịch được tìm thấy.
- **`Dashboard`**: Hiển thị một bản sao của `TON_KHO_tonghop` với khả năng lọc dữ liệu theo khu vực kho thông qua một dropdown tại ô `B2`.
- **`BaoCaoTonKho`**: Chứa báo cáo tồn kho tổng hợp theo Tên Sản Phẩm và Quy Cách, được tạo bởi chức năng "Tạo Báo Cáo Tồn Kho Tháng".
- **`Trang Chính`**: Giao diện điều hướng chung.

---

## 4. Yêu Cầu Chức Năng

| ID | Tên Chức Năng | Mô Tả | Tiêu Chí Thành Công |
| :--- | :--- | :--- | :--- |
| **REQ-001** | Nhập/Xuất/Điều chuyển | Người dùng nhập liệu trực tiếp vào các dòng trong vùng `INPUT_RANGE` trên sheet `INPUT` và thực thi thông qua menu. | - **Nhập:** `Mã index` và `Mã lô` được tự động tạo nếu bỏ trống. <br>- **Xuất/Điều chuyển:** Logic được xử lý dựa trên các quy tắc nghiệp vụ. <br>- Dữ liệu được làm giàu từ các bảng danh mục. <br>- Giao dịch thành công được ghi vào `LOG` và `DATABASE`, sau đó dòng nhập liệu được tự động xóa. |
| **REQ-002** | Cập nhật Giao dịch (Không còn dùng) | Chức năng sửa trực tiếp giao dịch cũ đã được loại bỏ để ủng hộ một kiến trúc dữ liệu vững chắc hơn (LOG + DATABASE). | Việc điều chỉnh được thực hiện bằng cách tạo một giao dịch mới để bù trừ hoặc thay thế. |
| **REQ-003** | Tra cứu Giao dịch (Thay thế) | Chức năng này được thay thế hoàn toàn bởi **Tra Cứu Động (REQ-006)**. | Người dùng tìm kiếm trực tiếp trên sheet `INPUT` để có kết quả tức thì. |
| **REQ-006** | **Tra Cứu Động** | Người dùng có thể tìm kiếm linh hoạt ngay trên sheet `INPUT` mà không cần form. | - Người dùng nhập tiêu chí vào vùng `L5:N5`. <br>- Nhấp vào nút tra cứu (ảnh). <br>- Hệ thống trả về danh sách kết quả phù hợp bên dưới, bắt đầu từ `O3`. <br>- Mỗi hàng kết quả có một checkbox ở cột `O`. |
| **REQ-007** | Thiết lập Công cụ Chọn ngày | Chạy hàm `setupDateFormINPUT()` từ trình chỉnh sửa Apps Script để áp dụng quy tắc xác thực ngày tháng cho vùng `E3:E23` trên sheet `INPUT`. | Khi nhấp vào các ô trong vùng `E3:E23` trên sheet `INPUT`, một công cụ chọn lịch sẽ hiện ra. |

---

## 5. Change Log

- **24/07/2025 (v2.3):**
    - **Sửa lỗi:** Khắc phục lỗi xác thực giao dịch 'Xuất'.
        - **Vấn đề:** Lỗi xác thực giao dịch 'Xuất' do đọc sai tên cột trong UI.
        - **Giải pháp:** Sửa logic trong `UI.js` để đọc đúng cột 'Mã kho' thay vì 'Tên kho', đảm bảo dữ liệu được truyền đến lớp dịch vụ một cách chính xác.
- **21/07/2025 (v2.2):**
    - **Tái cấu trúc:** Loại bỏ hoàn toàn hàm `setupInitialStructure` đã lỗi thời và gây ra lỗi.
    - **Thêm Chức năng Tiện ích:** Tạo hàm chuyên dụng `setupDateFormINPUT()` để chỉ áp dụng công cụ chọn ngày cho vùng `E3:E23` trên sheet `INPUT`, giúp việc thiết lập an toàn và chính xác hơn.
- **21/07/2025 (v2.1):**
    - **Cải tiến UX:** Triển khai công cụ chọn ngày (date picker) cho cột "Ngày sản xuất" trên sheet `INPUT` để cải thiện trải nghiệm người dùng và đảm bảo tính toàn vẹn của dữ liệu ngày tháng.
- **21/07/2025 (v2.0 - Cột mốc Ổn định):**
    -   Hệ thống được xác nhận hoạt động ổn định sau đợt tái cấu trúc lớn.
    -   Toàn bộ chức năng cốt lõi đã hoàn thiện và kiến trúc 3 tầng đã được triển khai thành công.
- **17/07/2025 (v2.0 - Tái Cấu Trúc Lớn):**
    -   **Kiến trúc:** Tái cấu trúc toàn diện, loại bỏ các giao diện HTML (`FormNhapLieu`, `TraCuu`) và các tệp logic thừa (`logic.js`, `macros.js`). Hệ thống giờ đây hoạt động 100% trên Google Sheets với kiến trúc 3 tầng (`UI.gs`, `service.js`, `db.js`) tinh gọn.
    -   **Sửa lỗi nghiêm trọng:** Khắc phục lỗi logic ghi đè trong sheet `DATABASE`, đảm bảo toàn vẹn dữ liệu bằng cách chuyển sang chiến lược append-only.
    -   **Hoàn thiện:** Sửa các lỗi hồi quy và lỗi hiển thị. Thêm hàm kiểm thử `test_createNhapInput`.
- **17/07/2025 (v1.3):**
    -   **Thêm Chức Năng:** Thiết kế và triển khai mã nguồn cho chức năng "Tra Cứu Động" trực tiếp trên trang tính.
    -   **Tài liệu:** Cập nhật `SPECIFICATION.md` và `WORKFLOW.md` để phản ánh chức năng mới.
- **14/07/2025 (v1.2):**
    -   **Làm rõ Quy Tắc Nghiệp Vụ:** Cập nhật đặc tả để định nghĩa chính xác và chi tiết quy tắc tạo `Lô Sản Xuất` và `INDEX`.
- **14/07/2025 (v1.1):**
    -   Tái cấu trúc luồng xử lý giao dịch để phân biệt rõ ràng giữa "Nhập" và "Xuất/Điều chuyển".
    -   Triển khai logic cho phép người dùng nhập `INDEX` khi xuất kho và tự động điền thông tin.
    -   Thêm quy tắc nghiệp vụ quan trọng: kiểm tra tồn kho trước khi thực hiện giao dịch Xuất/Điều chuyển.
- **14/07/2025 (v1.0):**
    -   Tạo bản đặc tả đầu tiên từ việc phân tích codebase hiện có.

---
## Cấu hình Dự án (Project Configuration)
**Thư mục làm việc (Working Directory):** `/Users/nhung/Documents/Tài liệu AI/PRJ_KHO/`
