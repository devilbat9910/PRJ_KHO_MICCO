# Kế Hoạch Tái Cấu Trúc Mã Nguồn

Tài liệu này trình bày kế hoạch chi tiết để dọn dẹp và đơn giản hóa mã nguồn của dự án. Mục tiêu là chỉ giữ lại các tệp và hàm cần thiết cho hai chức năng cốt lõi: `processManualInputTable()` và `UI_executeSearch()`.

---

## 1. Phân Tích Luồng Phụ Thuộc

### Luồng 1: `processManualInputTable()`
- **`UI.gs`**: `processManualInputTable()`
  - Gọi **`service.js`**: `service_processSingleTransaction()`
    - Gọi **`db.js`**: `db_findProduct()`, `db_findWarehouse()`, `db_findFactory()`, `db_appendToDatabase()`, `addTransactionToLog()`
      - Các hàm `db_find...` gọi **`db.js`**: `db_getNamedRangeAsObjects()`
    - Gọi **`service.js`**: `generateSku()`
  - Gọi **`logic.js`**: `updateDashboardRecentTransactions()` (Sẽ được di chuyển sang `UI.gs`)
    - Gọi **`db.js`**: `db_getRecentLogs()`

### Luồng 2: `UI_executeSearch()`
- **`UI.gs`**: `UI_executeSearch()`
  - Gọi **`service.js`**: `service_performAdvancedSearch()`
    - Gọi **`db.js`**: `db_getAllDatabaseRecords()`

---

## 2. Các Tệp Cần Xóa

Dưới đây là danh sách các tệp không cần thiết cho hai luồng hoạt động chính và sẽ bị xóa.

| Tệp Cần Xóa                 | Lý Do                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/logic.js`              | Chứa logic cho các UI cũ (sidebar, dialog). Hàm duy nhất còn dùng (`updateDashboardRecentTransactions`) sẽ được chuyển sang `UI.gs`. |
| `src/macros.js`             | Chứa hàm `processInputSheet()` là một phiên bản macro cũ, đã được thay thế bằng `processManualInputTable()` mạnh mẽ hơn. |
| `src/FormNhapLieu.html`     | Giao diện của sidebar nhập liệu cũ (`showSidebar()`), không còn được sử dụng.                      |
| `src/TraCuu.html`           | Giao diện của dialog tra cứu và sửa dữ liệu cũ (`showTraCuuDialog()`), không còn được sử dụng.      |
| `src/Dashboard.html`        | Tệp HTML không được tham chiếu ở bất kỳ đâu trong mã nguồn.                                        |
| `src/doc.js`                | Tệp JavaScript không được tham chiếu ở bất kỳ đâu trong mã nguồn.                                 |

---

## 3. Các Hàm Cần Xóa (Trong Các Tệp Được Giữ Lại)

Đây là danh sách các hàm không còn cần thiết trong các tệp sẽ được giữ lại.

### a. Tệp: `src/UI.gs`

| Hàm Cần Xóa          | Lý Do                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `showSidebar()`      | Gọi `FormNhapLieu.html` đã bị xóa.                                  |
| `showTraCuuDialog()` | Gọi `TraCuu.html` đã bị xóa.                                        |

### b. Tệp: `src/service.js`

| Hàm Cần Xóa                           | Lý Do                                                              |
| -------------------------------------- | ------------------------------------------------------------------ |
| `service_getOriginalTransactionForEdit()` | Phục vụ cho luồng sửa giao dịch cũ đã bị loại bỏ.                  |
| `service_updateTransaction()`          | Phục vụ cho luồng sửa giao dịch cũ đã bị loại bỏ.                  |

### c. Tệp: `src/db.js`

| Hàm Cần Xóa             | Lý Do                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| `db_findRowByMaIndex()`  | Hàm trợ giúp cho logic cập nhật cũ, không còn cần thiết.           |
| `db_getLatestState()`    | Hàm trợ giúp cho logic cập nhật cũ, không còn cần thiết.           |

---

## 4. Hành Động Đề Xuất (Ngoài việc xóa)

- **Di chuyển hàm**: Chuyển nội dung của hàm `updateDashboardRecentTransactions` từ `src/logic.js` vào tệp `src/UI.gs` để hợp nhất logic và cho phép xóa hoàn toàn `logic.js`.

Bằng cách thực hiện kế hoạch này, mã nguồn sẽ trở nên gọn gàng, dễ bảo trì và tập trung hoàn toàn vào các chức năng cốt lõi đang được sử dụng.

---
### Ghi Nhật Ký: Gỡ Lỗi và Tái Cấu Trúc Logic `Mã kho` (24/07/2025)

**1. Bối cảnh sự cố:**
Hệ thống liên tục báo lỗi "Yêu cầu phải có Mã kho" mặc dù dữ liệu đầu vào có chứa trường này. Sau nhiều vòng điều tra, nguyên nhân cốt lõi được xác định là do sự không nhất quán trong cách xử lý khóa (key) của đối tượng dữ liệu, cụ thể là các vấn đề về cách viết hoa (case-sensitive) và khoảng trắng thừa trong tiêu đề cột từ Google Sheet.

**2. Quá trình xử lý:**
- **Tái cấu trúc ban đầu:** Cập nhật logic để sử dụng biến `maKho` thay vì `tenKho`.
- **Gỡ lỗi lặp lại:** Nhiều nỗ lực vá lỗi đã được thực hiện nhưng không thành công, cho thấy vấn đề nằm ở tầng ánh xạ (mapping).
- **Tái xây dựng `db_findWarehouse`:** Để loại bỏ các lỗi tiềm ẩn, hàm `db_findWarehouse` trong `db.js` đã được viết lại hoàn toàn với logic kiểm tra đầu vào và so sánh an toàn hơn.
- **Giải pháp cuối cùng:** Nâng cấp hàm `normalizeObjectKeys` trong `service.js` để hoạt động **không phân biệt chữ hoa chữ thường** và **tự động loại bỏ khoảng trắng thừa** từ các khóa đầu vào. Hàm mới này sử dụng logic tìm kiếm đa tầng và thêm các bản ghi nhật ký chi tiết để hỗ trợ gỡ lỗi trong tương lai.

**3. Kết quả:**
Sự cố đã được giải quyết triệt để. Hệ thống hiện tại có khả năng xử lý dữ liệu đầu vào một cách linh hoạt và mạnh mẽ. Tất cả các thay đổi đã được áp dụng cho các tệp `db.js` và `service.js`.