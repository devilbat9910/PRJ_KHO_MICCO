# [PRJ_KHO] Hệ Thống Quản Lý Tồn Kho - Đặc Tả Kỹ Thuật (Phiên Bản 1.0)

- **Ngày tạo:** 14/07/2025
- **Phiên bản:** 1.0

---

## 1. Tổng Quan

### 1.1. Ý Định & Mục Tiêu
Tài liệu này đặc tả toàn bộ hệ thống Quản lý Tồn kho được xây dựng trên nền tảng Google Sheets và Google Apps Script. Mục tiêu của hệ thống là cung cấp một công cụ linh hoạt, chính xác và dễ sử dụng để theo dõi chi tiết hàng tồn kho theo từng lô, quản lý các giao dịch nhập-xuất-điều chuyển, và cung cấp khả năng báo cáo, truy vết mạnh mẽ.

### 1.2. Giá Trị Cốt Lõi
- **Tính Toàn Vẹn Dữ Liệu:** Hệ thống được thiết kế để đảm bảo dữ liệu luôn chính xác thông qua các quy tắc nghiệp vụ, validation và một sổ cái giao dịch bất biến.
- **Tự Động Hóa & Hiệu Quả:** Giảm thiểu các thao tác thủ công, tự động hóa việc tính toán tồn kho, tạo báo cáo và gợi ý dữ liệu đầu vào.
- **Khả Năng Truy Vết:** Mọi giao dịch đều được ghi lại với đầy đủ thông tin, cho phép truy vết và kiểm toán dễ dàng.

---

## 2. Kiến Trúc và Thiết Kế

### 2.1. Mô Hình Kiến Trúc
Hệ thống tuân thủ nghiêm ngặt **kiến trúc 3 tầng (3-Layer Architecture)**:

1.  **UI/Bridge Layer (Lớp Giao Diện & Cầu Nối):**
    -   **Thành phần:** Các file `.html` (giao diện) và `logic.js` (cầu nối).
    -   **Trách nhiệm:** Hiển thị giao diện người dùng (Sidebar, Dialog), thu thập dữ liệu đầu vào, và gọi các hàm xử lý ở lớp Service. Lớp này không chứa logic nghiệp vụ.

2.  **Service Layer (Lớp Dịch Vụ):**
    -   **Thành phần:** `service.js`.
    -   **Trách nhiệm:** Chứa toàn bộ logic nghiệp vụ của ứng dụng (xử lý giao dịch, tính toán, tạo `INDEX`, kiểm tra quy tắc). Đây là "bộ não" xử lý của hệ thống.

3.  **Data Layer (Lớp Dữ Liệu):**
    -   **Thành phần:** `db.js`.
    -   **Trách nhiệm:** Chịu trách nhiệm duy nhất cho việc đọc và ghi dữ liệu thô trực tiếp vào Google Sheets.

### 2.2. Luồng Dữ Liệu Chính (Ví dụ: Giao dịch "Nhập")
1.  **UI:** Người dùng điền thông tin vào `FormNhapLieu.html` và nhấn "Ghi Lại".
2.  **Bridge:** Hàm `submitForm()` trong `FormNhapLieu.html` gọi `processFormData()` trong `logic.js`.
3.  **Logic:** `logic.js` gọi `service_processSingleTransaction()` trong `service.js`.
4.  **Service:** `service.js` thực hiện các bước:
    -   Kiểm tra dữ liệu đầu vào.
    -   Lấy thông tin bổ sung từ `DANH MUC` (qua `db.js`).
    -   Tạo `INDEX (SKU)` duy nhất cho lô hàng.
    -   Gọi `updateMasterInventory()` để cập nhật số lượng trong `TON_KHO_tonghop`.
    -   Gọi `addTransactionToLog()` để ghi lại giao dịch.
5.  **Data:** Hàm `addTransactionToLog()` trong `db.js` thực hiện ghi một hàng mới vào sheet `LOG_GIAO_DICH_tbl`.

---

## 3. Đặc Tả Cấu Trúc Google Sheets

Đây là đặc tả chi tiết về cấu trúc và vai trò của từng sheet trong hệ thống.

### 3.1. Sheet: `DANH MUC`
- **Mục đích:** Sheet cấu hình trung tâm, do người dùng quản lý. Nó định nghĩa các danh mục, quy tắc và lựa chọn cho toàn bộ hệ thống.
- **Cấu trúc cột:**
    -   **Cột A: `Tên Sản Phẩm Đầy Đủ`** (String, Bắt buộc): Tên chính thức của sản phẩm. Được dùng làm khóa chính để tra cứu thông tin.
    -   **Cột B: `Tên Viết Tắt`** (String): Tên ngắn gọn của sản phẩm, dùng để hiển thị trên báo cáo và các giao diện khác cho gọn.
    -   **Cột C: `Đơn Vị Sản Xuất`** (String): Danh sách các phân xưởng/nhà máy sản xuất. Dữ liệu từ cột này sẽ được dùng để tạo dropdown trên form nhập liệu.
    -   **Cột D: `Kho Hàng`** (String): Danh sách các kho vật lý. Dữ liệu này sẽ được dùng để tự động tạo các cột kho trong sheet `TON_KHO_tonghop`.
    -   **Cột E: `Mã Lô`** (String): Quy tắc để tạo mã lô gợi ý. Có thể chứa placeholder `{PX}` sẽ được thay thế bằng mã viết tắt của Đơn Vị Sản Xuất.

### 3.2. Sheet: `LOG_GIAO_DICH_tbl`
- **Mục đích:** Sổ cái giao dịch bất biến. Ghi lại toàn bộ lịch sử các giao dịch đã xảy ra. Dữ liệu chỉ được thêm vào (append-only).
- **Cấu trúc cột:**
    -   **Cột A: `Timestamp`** (DateTime): Dấu thời gian khi giao dịch được hệ thống ghi nhận.
    -   **Cột B: `INDEX (SKU)`** (String): Mã định danh duy nhất cho một lô hàng cụ thể (sản phẩm + lô + ngày SX +...).
    -   **Cột C: `Loại Giao Dịch`** (String): `Nhập`, `Xuất`, hoặc `Điều chuyển`.
    -   **Cột D: `Tên Sản Phẩm`** (String): Tên đầy đủ của sản phẩm.
    -   **Cột E: `Quy Cách`** (String): Quy cách của sản phẩm (ví dụ: D32, B25).
    -   **Cột F: `Lô Sản Xuất`** (String): Mã lô sản xuất của lô hàng.
    -   **Cột G: `Ngày Sản Xuất`** (Date): Ngày sản xuất của lô hàng.
    -   **Cột H: `Tình Trạng Chất Lượng`** (String): `Đạt`, `Chờ kết quả`, hoặc `Mẫu lưu`.
    -   **Cột I: `Số Lượng`** (Number): Số lượng của giao dịch.
    -   **Cột J: `Đơn Vị Sản Xuất`** (String): Phân xưởng sản xuất ra lô hàng.
    -   **Cột K: `Kho`** (String): Kho bị ảnh hưởng bởi giao dịch (Kho đến cho 'Nhập', Kho đi cho 'Xuất').
    -   **Cột L: `Ghi Chú`** (String): Ghi chú tự do cho giao dịch, hoặc ghi chú thay đổi do hệ thống tự tạo khi cập nhật.

### 3.3. Sheet: `TON_KHO_tonghop`
- **Mục đích:** "Ma trận Tồn kho". Đây là sheet dữ liệu quan trọng nhất, thể hiện trạng thái tồn kho tức thời của tất cả các lô hàng trên tất cả các kho.
- **Cấu trúc cột:**
    -   **Cột A: `INDEX`**: (String) Mã định danh duy nhất của lô hàng.
    -   **Cột B: `Tên_SP`**: (String) Tên viết tắt của sản phẩm.
    -   **Cột C: `Quy_Cách`**: (String)
    -   **Cột D: `Lô_SX`**: (String)
    -   **Cột E: `Ngày_SX`**: (Date)
    -   **Cột F: `QC_Status`**: (String, Data Validation: 'Đạt', 'Chờ kết quả', 'Mẫu lưu')
    -   **Cột G: `ĐV_SX`**: (String)
    -   **Các cột tiếp theo (Động)**: Các cột kho hàng được tạo tự động dựa trên danh sách trong sheet `DANH MUC`. Tên cột là tên kho (ví dụ: `Kho ĐT1`, `Kho CP2`).
    -   **Cột cuối cùng: `Tổng SL`**: (Formula) Chứa công thức mảng để tự động tính tổng số lượng của lô hàng trên tất cả các kho.

### 3.4. Các Sheet Giao Diện & Báo Cáo
- **`Dashboard`**: Hiển thị một bản sao của `TON_KHO_tonghop` với khả năng lọc dữ liệu theo khu vực kho thông qua một dropdown tại ô `B2`.
- **`BaoCaoTonKho`**: Chứa báo cáo tồn kho tổng hợp theo Tên Sản Phẩm và Quy Cách, được tạo bởi chức năng "Tạo Báo Cáo Tồn Kho Tháng".
- **`Trang Chính`**: Giao diện tương tác chính, chứa bảng "10 Giao dịch gần nhất" (đọc từ `LOG_GIAO_DICH_tbl`) và bảng "Nhập Thủ Công".

---

## 4. Yêu Cầu Chức Năng

| ID | Tên Chức Năng | Mô Tả | Tiêu Chí Thành Công |
| :--- | :--- | :--- | :--- |
| **REQ-001** | Nhập/Xuất/Điều chuyển | Người dùng có thể thực hiện giao dịch qua Sidebar. | Dữ liệu được ghi chính xác vào `LOG_GIAO_DICH_tbl` và `TON_KHO_tonghop` được cập nhật đúng trong vòng 2 giây. |
| **REQ-002** | Cập nhật Giao dịch | Người dùng có thể tra cứu và sửa một giao dịch đã có. | Hệ thống chỉ tính toán lại tồn kho khi các trường quan trọng thay đổi. Một ghi chú thay đổi được tự động tạo. |
| **REQ-003** | Tra cứu Giao dịch | Người dùng có thể tìm kiếm giao dịch theo nhiều tiêu chí. | Hệ thống trả về kết quả chính xác. Ưu tiên tìm theo `INDEX`. |
| **REQ-004** | Báo cáo Tháng | Tạo báo cáo tổng hợp tồn kho theo sản phẩm. | Sheet `BaoCaoTonKho` được tạo/cập nhật với dữ liệu chính xác. |
| **REQ-005** | Chốt sổ Tháng | Tạo một bản sao tĩnh của tồn kho cuối tháng. | Một sheet mới `Snapshot_MM-yyyy` được tạo và dữ liệu không chứa công thức. |

---

## 5. Change Log

- **14/07/2025 (v1.0):**
    -   Tạo bản đặc tả đầu tiên từ việc phân tích codebase hiện có.
    -   Ghi nhận chi tiết kiến trúc 3 tầng và cấu trúc của tất cả các sheet dữ liệu.
