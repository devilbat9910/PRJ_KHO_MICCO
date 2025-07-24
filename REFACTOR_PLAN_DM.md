# Kế Hoạch Tái Cấu Trúc: Nâng Cấp Sheet `DANH MUC`

**Ngày tạo:** 16/07/2025
**Mục tiêu:** Tái cấu trúc toàn bộ hệ thống để tương thích với cấu trúc mới của sheet `DANH MUC`, chuyển từ mô hình phẳng sang mô hình phức hợp chứa nhiều loại thông tin.

**QUAN TRỌNG:** Kế hoạch này sẽ được thực thi theo từng giai đoạn. Sau mỗi giai đoạn, chúng ta sẽ kiểm tra và xác nhận trước khi chuyển sang giai đoạn tiếp theo. Chức năng cốt lõi trên sheet `INPUT` (Nhập, Xuất, Điều chuyển) phải được đảm bảo hoạt động chính xác sau khi hoàn tất.

---

## Giai Đoạn 1: Cập Nhật Đặc Tả (SPECIFICATION.md)

*   **Mục tiêu:** Cập nhật `SPECIFICATION.md` để phản ánh cấu trúc mới của `DANH MUC`. Đây là "nguồn sự thật" cho tất cả các thay đổi sau này.
*   **Nhiệm vụ:**
    1.  **[Task 1.1]** Mở tệp `SPECIFICATION.md`.
    2.  **[Task 1.2]** Xóa hoàn toàn nội dung của **Mục 3.1. Sheet: `DANH MUC`**.
    3.  **[Task 1.3]** Thay thế bằng đặc tả cấu trúc cột mới, dựa trên hình ảnh người dùng cung cấp:
        *   Cột A: `Tên sản phẩm`
        *   Cột B: `Viết tắt`
        *   Cột C: `Mã Lô/ Mã ngắn`
        *   Cột D: `HSD (tháng)`
        *   Cột E: `Kv` (Tên Khu vực)
        *   Cột F: `Mã kv`
        *   Cột G: `Mã kho` (Khóa chính của kho)
        *   Cột H: `Loại kho`
        *   Cột I: `Khu vực` (Tên đầy đủ của khu vực)
        *   Cột J: `Tên kho`
        *   Cột K: `Mã` (Mã loại vật tư)
        *   Cột L: `tên` (Tên loại vật tư)
        *   Cột M: `Phân xưởng`
        *   Cột N: `Mã phân xưởng`
        *   Cột O: `Trình trạng chất lượng`
    4.  **[Task 1.4]** Rà soát lại **Mục 2.2. Luồng Dữ Liệu Chính** và cập nhật lại các bước lấy thông tin từ `DANH MUC` cho phù hợp với cấu trúc cột mới. Đặc biệt là quy tắc tạo `INDEX`.

---

## Giai Đoạn 2: Tái Cấu Trúc Lớp Dữ Liệu (db.js)

*   **Mục tiêu:** Viết lại các hàm trong `db.js` để có thể đọc và xử lý dữ liệu từ sheet `DANH MUC` có cấu trúc mới.
*   **Nhiệm vụ:**
    1.  **[Task 2.1]** Mở tệp `src/db.js`.
    2.  **[Task 2.2]** Tạo hàm `db_getDanhMucData()`: Đọc toàn bộ dữ liệu từ sheet `DANH MUC` và trả về dưới dạng một mảng các đối tượng (Array of Objects).
    3.  **[Task 2.3]** Tạo hàm `db_getUniqueValuesFromDanhMuc(columnName)`: Một hàm tiện ích để lấy danh sách các giá trị duy nhất từ một cột cụ thể trong `DANH MUC`. Ví dụ: `db_getUniqueValuesFromDanhMuc('Tên kho')` sẽ trả về `['K9', 'K8', 'K7', ...]`.
    4.  **[Task 2.4]** Tạo hàm `db_findProductInfo(productName)`: Tìm và trả về tất cả thông tin liên quan đến một sản phẩm dựa vào `Tên sản phẩm`.
    5.  **[Task 2.5]** Tạo hàm `db_findWarehouseInfo(warehouseName)`: Tìm và trả về thông tin chi tiết của một kho.

---

## Giai Đoạn 3: Tái Cấu Trúc Lớp Dịch Vụ (service.js)

*   **Mục tiêu:** Cập nhật logic nghiệp vụ để phù hợp với nguồn dữ liệu mới từ `db.js`.
*   **Nhiệm vụ:**
    1.  **[Task 3.1]** Mở tệp `src/service.js`.
    2.  **[Task 3.2]** Viết lại hàm `service_processSingleTransaction`:
        *   Thay đổi cách lấy thông tin sản phẩm, kho, phân xưởng bằng cách gọi các hàm mới trong `db.js` (ví dụ: `db_findProductInfo`).
        *   **Cập nhật logic tạo `INDEX`**: Dựa trên các cột mới (`Mã Lô/ Mã ngắn`, `Mã kho`, etc.). Cần định nghĩa lại quy tắc tạo `INDEX` trong `SPECIFICATION.md` trước.
        *   Đảm bảo logic kiểm tra tồn kho vẫn hoạt động chính xác.
    3.  **[Task 3.3]** Viết lại hàm `service_getSkuDetails`: Hàm này sẽ cần logic phức tạp hơn để tra cứu `INDEX` và lấy thông tin từ nhiều cột khác nhau trong `DANH MUC`.

---

## Giai Đoạn 4: Tái Cấu Trúc Giao Diện (UI.gs & logic.js)

*   **Mục tiêu:** Cập nhật giao diện người dùng, đặc biệt là sheet `INPUT`, để hoạt động với cấu trúc dữ liệu mới.
*   **Nhiệm vụ:**
    1.  **[Task 4.1]** Mở tệp `src/logic.js`.
    2.  **[Task 4.2]** Viết lại hàm `processManualInputTable` (hàm xử lý sheet `INPUT`):
        *   Cập nhật cách hàm này đọc dữ liệu từ các cột của sheet `INPUT` (nếu cấu trúc sheet `INPUT` cũng thay đổi).
        *   Đảm bảo nó gọi `service_processSingleTransaction` với đúng các tham số mới.
        *   Đảm bảo logic xử lý 'Nhập', 'Xuất', 'Điều chuyển' vẫn đúng theo yêu cầu.
    3.  **[Task 4.3]** Rà soát các tệp `.html` và `UI.gs` để cập nhật các dropdown, đảm bảo chúng lấy dữ liệu từ các hàm mới (ví dụ: `db_getUniqueValuesFromDanhMuc('Tên kho')`).

---

## Giai Đoạn 5: Chuyển Đổi Dữ Liệu và Kiểm Thử

*   **Mục tiêu:** Hướng dẫn người dùng cập nhật dữ liệu thực tế và kiểm thử toàn bộ luồng.
*   **Nhiệm vụ:**
    1.  **[Task 5.1]** Hướng dẫn người dùng xóa toàn bộ dữ liệu cũ trong sheet `DANH MUC`.
    2.  **[Task 5.2]** Hướng dẫn người dùng dán dữ liệu mới theo đúng định dạng 15 cột đã được đặc tả.
    3.  **[Task 5.3]** Thực hiện kiểm thử (Testing):
        *   Test kịch bản **Nhập kho** từ sheet `INPUT`.
        *   Test kịch bản **Xuất kho** từ sheet `INPUT`.
        *   Test kịch bản **Điều chuyển** từ sheet `INPUT`.
        *   Test chức năng **Tra cứu**.