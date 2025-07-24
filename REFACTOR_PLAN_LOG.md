# Kế Hoạch Tái Cấu Trúc: Chuyển Đổi Sang Sheet `LOG`

**Ngày tạo:** 16/07/2025
**Mục tiêu:** Tái cấu trúc hệ thống để loại bỏ sự phụ thuộc vào `TON_KHO_tonghop` và chuyển sang sử dụng một sheet `LOG` mới với cấu trúc 18 cột làm đích ghi dữ liệu duy nhất từ sheet `INPUT`.

---

## Giai Đoạn 1: Cập Nhật Đặc Tả (SPECIFICATION.md)

*   **Mục tiêu:** Định nghĩa lại "nguồn sự thật" để phản ánh kiến trúc mới.
*   **Nhiệm vụ:**
    1.  **[Task 1.1]** Mở tệp `SPECIFICATION.md`.
    2.  **[Task 1.2]** Xóa bỏ hoàn toàn **Mục 3.3. Sheet: `TON_KHO_tonghop`**.
    3.  **[Task 1.3]** Thay thế **Mục 3.2. Sheet: `LOG_GIAO_DICH_tbl`** bằng đặc tả cho sheet `LOG` mới với 18 cột:
        *   A: `Mã index`, B: `Timestamp`, C: `Tên sản phẩm`, D: `Viết tắt`, E: `Quy cách`, F: `Số lượng`, G: `Ngày sản xuất`, H: `Đơn vị sản xuất`, I: `Mã lô`, J: `Ngày nhập/xuất`, K: `Mã kho`, L: `Loại kho`, M: `Khu vực`, N: `Tên kho`, O: `Tình trạng chất lượng`, P: `Hạn sử dụng`, Q: `Nhập/xuất`, R: `Ghi chú`.
    4.  **[Task 1.4]** Cập nhật **Mục 3.4. Các Sheet Giao Diện** để định nghĩa lại cấu trúc cột cho sheet `INPUT` cho phù hợp với luồng dữ liệu mới.
    5.  **[Task 1.5]** Viết lại **Mục 2.2. Luồng Dữ Liệu Chính** để mô tả luồng xử lý đơn giản mới: `INPUT` -> `service` (làm giàu dữ liệu) -> `LOG`.

---

## Giai Đoạn 2: Tái Cấu Trúc Lớp Dữ Liệu (db.js)

*   **Mục tiêu:** Viết lại hàm ghi log để tương thích với sheet `LOG` mới.
*   **Nhiệm vụ:**
    1.  **[Task 2.1]** Mở tệp `src/db.js`.
    2.  **[Task 2.2]** Viết lại hoàn toàn hàm `addTransactionToLog` để nó nhận một đối tượng giao dịch đã được làm giàu và ghi chính xác vào 18 cột của sheet `LOG`. Đổi tên hằng số `LOG_SHEET_NAME` thành `LOG`.

---

## Giai Đoạn 3: Tái Cấu Trúc Lớp Dịch Vụ (service.js)

*   **Mục tiêu:** Đơn giản hóa `service.js` để chỉ thực hiện việc làm giàu dữ liệu.
*   **Nhiệm vụ:**
    1.  **[Task 3.1]** Mở tệp `src/service.js`.
    2.  **[Task 3.2]** Xóa bỏ các hàm và các đoạn code liên quan đến `updateMasterInventory`, `_getInventoryValue`, `_findOrCreateInventoryRow`, và logic kiểm tra tồn kho.
    3.  **[Task 3.3]** Viết lại `service_processSingleTransaction`:
        *   Hàm này sẽ nhận dữ liệu thô từ sheet `INPUT`.
        *   Sử dụng `db_findRowsInDanhMuc` để tra cứu thông tin bổ sung (HSD, Mã kho, Loại kho, etc.) từ `DANH MUC` dựa trên `Tên sản phẩm` và `Tên kho`.
        *   Tạo một đối tượng `logObject` hoàn chỉnh với đủ 18 trường thông tin.
        *   Gọi `addTransactionToLog(logObject)` để ghi dữ liệu.
    4.  **[Task 3.4]** Cập nhật lại hàm `generateSku` nếu quy tắc tạo `Mã index` có thay đổi.

---

## Giai Đoạn 4: Tái Cấu Trúc Giao Diện (UI.gs)

*   **Mục tiêu:** Cập nhật hàm xử lý sheet `INPUT` để phù hợp với luồng mới.
*   **Nhiệm vụ:**
    1.  **[Task 4.1]** Mở tệp `src/UI.gs`.
    2.  **[Task 4.2]** Viết lại hàm `processManualInputTable`:
        *   Cập nhật logic đọc dữ liệu để khớp với cấu trúc cột mới của sheet `INPUT`.
        *   Đảm bảo nó tạo và truyền đúng đối tượng `formObject` cho `service_processSingleTransaction`.
        *   Loại bỏ logic ghi ngược không cần thiết nếu có.

---

## Giai Đoạn 5: Chuyển Đổi và Kiểm Thử

*   **Mục tiêu:** Hướng dẫn người dùng thiết lập sheet và kiểm thử luồng mới.
*   **Nhiệm vụ:**
    1.  **[Task 5.1]** Hướng dẫn người dùng tạo sheet `LOG` mới với 18 cột tiêu đề.
    2.  **[Task 5.2]** Hướng dẫn người dùng cập nhật lại các cột tiêu đề của sheet `INPUT`.
    3.  **[Task 5.3]** Kiểm thử luồng nhập liệu từ `INPUT` và xác minh dữ liệu được ghi chính xác vào `LOG`.