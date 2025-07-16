# [PRJ_KHO] Hệ Thống Quản Lý Tồn Kho - Đặc Tả Kỹ Thuật (Phiên Bản 1.0)

- **Ngày tạo:** 14/07/2025
- **Phiên bản:** 1.2

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
    -   **Thành phần:** Các file `.html` (giao diện) và `logic.js` (cầu nối).
    -   **Trách nhiệm:** Hiển thị giao diện người dùng (Sidebar, Dialog), thu thập dữ liệu đầu vào, và gọi các hàm xử lý ở lớp Service. Lớp này không chứa logic nghiệp vụ.

2.  **Service Layer (Lớp Dịch Vụ):**
    -   **Thành phần:** `service.js`.
    -   **Trách nhiệm:** Chứa toàn bộ logic nghiệp vụ của ứng dụng (xử lý giao dịch, tính toán, tạo `INDEX`, kiểm tra quy tắc). Đây là "bộ não" xử lý của hệ thống.

3.  **Data Layer (Lớp Dữ Liệu):**
    -   **Thành phần:** `db.js`.
    -   **Trách nhiệm:** Chịu trách nhiệm duy nhất cho việc đọc và ghi dữ liệu thô trực tiếp vào Google Sheets.

### 2.2. Luồng Dữ Liệu Chính

#### Luồng Dữ Liệu Chính (Kiến trúc LOG)
1.  **UI (`INPUT` sheet):** Người dùng điền các thông tin cơ bản của một giao dịch (Nhập/Xuất/Điều chuyển) vào một dòng trên sheet `INPUT`.
2.  **UI (Menu):** Người dùng kích hoạt menu "Xử lý dữ liệu từ sheet INPUT".
3.  **Bridge (`UI.gs`):** Hàm `processManualInputTable()` được gọi. Hàm này sẽ:
    -   Đọc từng dòng dữ liệu từ `INPUT`.
    -   Tạo một đối tượng `formObject` thô.
    -   Gọi `service_processSingleTransaction(formObject)` để xử lý.
4.  **Service (`service.js`):** Hàm `service_processSingleTransaction()` là trung tâm xử lý:
    -   **Làm giàu dữ liệu:** Hàm sẽ gọi các hàm tra cứu riêng biệt trong `db.js` để lấy thông tin từ các vùng được đặt tên (`Named Range`) tương ứng:
        -   `db_findProduct()`: Tìm thông tin sản phẩm trong `Bảng_Sản phẩm`.
        -   `db_findWarehouse()`: Tìm thông tin kho trong `Bảng_Danh sách kho`.
        -   `db_findFactory()`: Tìm thông tin phân xưởng trong `Bảng_Mã phân xưởng`.
    -   **Tính toán:** Tính toán các giá trị phát sinh như `Hạn sử dụng` (dựa trên `Ngày sản xuất` và `HSD (tháng)`).
    -   **Tạo `Mã index`:** Gọi hàm `generateSku()` để tạo mã định danh duy nhất.
    -   **Tập hợp:** Tạo một đối tượng `logObject` hoàn chỉnh chứa tất cả 18 trường dữ liệu cho sheet `LOG`.
5.  **Data (`db.js`):**
    -   `service.js` gọi `addTransactionToLog(logObject)`.
    -   Hàm `addTransactionToLog` ghi đối tượng `logObject` thành một dòng mới trong sheet `LOG`.
6.  **Phản hồi (`UI.gs`):** Dựa trên kết quả trả về từ `service.js`, `processManualInputTable` sẽ xóa dòng trên sheet `INPUT` nếu thành công, hoặc tô màu và ghi lỗi nếu thất bại. Luồng xử lý **kết thúc** tại đây.

---

## 3. Đặc Tả Cấu Trúc Google Sheets

Đây là đặc tả chi tiết về cấu trúc và vai trò của từng sheet trong hệ thống.

### 3.1. Sheet: `DANH MUC` (Kiến trúc Named Range)
- **Mục đích:** Sheet này đóng vai trò là một không gian để định nghĩa nhiều bảng dữ liệu danh mục riêng biệt. Mỗi bảng được xác định bởi một **Vùng được đặt tên (Named Range)**.
- **Kiến trúc:**
    -   **`Bảng_Sản phẩm`**: Chứa danh sách các sản phẩm và thông tin liên quan (Tên, Viết tắt, Mã lô, HSD).
    -   **`Bảng_Danh sách kho`**: Chứa danh sách các kho và thông tin liên quan (Mã kho, Tên kho, Khu vực).
    -   **`Bảng_Mã phân xưởng`**: Chứa danh sách các phân xưởng (Tên phân xưởng, Mã phân xưởng).
    -   *... và các bảng danh mục khác nếu cần.*
- **Truy cập:** Mã nguồn sẽ **không** đọc toàn bộ sheet `DANH MUC`. Thay vào đó, nó sẽ sử dụng các hàm như `SpreadsheetApp.getRangeByName('Bảng_Sản phẩm')` để truy cập trực tiếp vào từng bảng dữ liệu một cách hiệu quả.

### 3.2. Sheet: `LOG`
- **Mục đích:** Sổ cái giao dịch bất biến, là đích ghi duy nhất cho mọi hoạt động nhập/xuất/điều chuyển. Sheet này chứa dữ liệu đã được làm giàu đầy đủ thông tin từ `DANH MUC`.
- **Cấu trúc cột:**
    -   **Cột A: `Mã index`**: Mã định danh duy nhất của giao dịch/lô hàng.
    -   **Cột B: `Timestamp`**: Dấu thời gian khi giao dịch được hệ thống ghi nhận.
    -   **Cột C: `Tên sản phẩm`**: Tên đầy đủ của sản phẩm.
    -   **Cột D: `Viết tắt`**: Tên viết tắt của sản phẩm.
    -   **Cột E: `Quy cách`**: Quy cách của sản phẩm.
    -   **Cột F: `Số lượng`**: Số lượng của giao dịch.
    -   **Cột G: `Ngày sản xuất`**: Ngày sản xuất của lô hàng.
    -   **Cột H: `Đơn vị sản xuất`**: Tên đầy đủ của phân xưởng.
    -   **Cột I: `Mã lô`**: Mã lô sản xuất của lô hàng.
    -   **Cột J: `Ngày nhập/xuất`**: Ngày thực tế diễn ra giao dịch.
    -   **Cột K: `Mã kho`**: Mã định danh duy nhất của kho.
    -   **Cột L: `Loại kho`**: Phân loại kho (ví dụ: Vật liệu nổ).
    -   **Cột M: `Khu vực`**: Khu vực quản lý kho.
    -   **Cột N: `Tên kho`**: Tên hiển thị của kho.
    -   **Cột O: `Tình trạng chất lượng`**: Trạng thái chất lượng tại thời điểm giao dịch.
    -   **Cột P: `Hạn sử dụng`**: Ngày hết hạn sử dụng, được tính toán tự động.
    -   **Cột Q: `Nhập/xuất`**: Loại giao dịch (`Nhập`, `Xuất`, `Điều chuyển`).
    -   **Cột R: `Ghi chú`**: Ghi chú tự do cho giao dịch.

### 3.3. Các Sheet Giao Diện & Báo Cáo
- **`INPUT`**: Giao diện nhập liệu chính. Người dùng chỉ cần điền các thông tin cơ bản, hệ thống sẽ tự động làm giàu dữ liệu và ghi vào `LOG`.
    - **Cấu trúc cột (đề xuất):**
        - `Nhập/xuất` (Dropdown: Nhập, Xuất, Điều chuyển)
        - `Tên sản phẩm` (Dropdown từ `DANH MUC`)
        - `Quy cách`
        - `Số lượng`
        - `Ngày sản xuất`
        - `Phân xưởng` (Dropdown từ `DANH MUC`)
        - `Tên kho` (Dropdown từ `DANH MUC`)
        - `Tình trạng chất lượng` (Dropdown từ `DANH MUC`)
        - `Ghi chú` (Dùng cho kho đến khi 'Điều chuyển')
        - `Mã index` (Để trống khi 'Nhập', điền vào khi 'Xuất'/'Điều chuyển')
- **`Dashboard`**: Hiển thị một bản sao của `TON_KHO_tonghop` với khả năng lọc dữ liệu theo khu vực kho thông qua một dropdown tại ô `B2`.
- **`BaoCaoTonKho`**: Chứa báo cáo tồn kho tổng hợp theo Tên Sản Phẩm và Quy Cách, được tạo bởi chức năng "Tạo Báo Cáo Tồn Kho Tháng".
- **`Trang Chính`**: Giao diện điều hướng chung. Các chức năng nhập liệu và xem lại đã được tập trung tại sheet `INPUT`.

---

## 4. Yêu Cầu Chức Năng

| ID | Tên Chức Năng | Mô Tả | Tiêu Chí Thành Công |
| :--- | :--- | :--- | :--- |
| **REQ-001** | Nhập/Xuất/Điều chuyển | Người dùng có thể thực hiện giao dịch qua sheet `INPUT`. | - **Nhập:** `Mã index` được tự động tạo. <br>- **Xuất/Điều chuyển:** Người dùng phải nhập `Mã index` hợp lệ. <br>- Hệ thống làm giàu dữ liệu từ các bảng trong `DANH MUC`. <br>- Dữ liệu được ghi chính xác vào sheet `LOG`. |
| **REQ-002** | Cập nhật Giao dịch | Người dùng có thể tra cứu và sửa một giao dịch đã có. | Hệ thống chỉ tính toán lại tồn kho khi các trường quan trọng thay đổi. Một ghi chú thay đổi được tự động tạo. |
| **REQ-003** | Tra cứu Giao dịch | Người dùng có thể tìm kiếm giao dịch theo nhiều tiêu chí. | Hệ thống trả về kết quả chính xác. Ưu tiên tìm theo `INDEX`. |
| **REQ-004** | Báo cáo Tháng | Tạo báo cáo tổng hợp tồn kho theo sản phẩm. | Sheet `BaoCaoTonKho` được tạo/cập nhật với dữ liệu chính xác. |
| **REQ-005** | Chốt sổ Tháng | Tạo một bản sao tĩnh của tồn kho cuối tháng. | Một sheet mới `Snapshot_MM-yyyy` được tạo và dữ liệu không chứa công thức. |

---

## 5. Change Log

- **14/07/2025 (v1.2):**
    -   **Làm rõ Quy Tắc Nghiệp Vụ:** Cập nhật đặc tả để định nghĩa chính xác và chi tiết quy tắc tạo `Lô Sản Xuất` và `INDEX`, bao gồm cả việc xử lý placeholder `{PX}` cho mã nhà máy.
- **14/07/2025 (v1.1):**
    -   Tái cấu trúc luồng xử lý giao dịch để phân biệt rõ ràng giữa "Nhập" và "Xuất/Điều chuyển".
    -   Triển khai logic cho phép người dùng nhập `INDEX` khi xuất kho và tự động điền thông tin.
    -   Thêm quy tắc nghiệp vụ quan trọng: kiểm tra tồn kho trước khi thực hiện giao dịch Xuất/Điều chuyển.
- **14/07/2025 (v1.0):**
    -   Tạo bản đặc tả đầu tiên từ việc phân tích codebase hiện có.
    -   Ghi nhận chi tiết kiến trúc 3 tầng và cấu trúc của tất cả các sheet dữ liệu.


---
## Cấu hình Dự án (Project Configuration)
**Thư mục làm việc (Working Directory):** `/Users/nhung/Documents/Tài liệu AI/PRJ_KHO/`
