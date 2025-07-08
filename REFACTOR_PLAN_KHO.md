# Kế hoạch Tái Cấu Trúc Service Layer (Mô Hình Một Sheet - Nhiều Cột)

Đây là kế hoạch chi tiết để tái cấu trúc hệ thống sang mô hình quản lý tồn kho tập trung trên một sheet duy nhất, sử dụng các cột động cho từng kho.

---

## Cấu Trúc Dữ Liệu Đích: Sheet `TON_KHO_tonghop`

*   **Hàng (Row):** Mỗi hàng đại diện cho một lô sản phẩm duy nhất, được xác định bởi sự kết hợp của (`Tên Viết Tắt`, `Lô Sản Xuất`, `Ngày Sản Xuất`, `Tình Trạng Chất Lượng`).
*   **Cột Định Danh (Cố định):**
    1.  `INDEX (SKU)`
    2.  `Tên Viết Tắt`
    3.  `Quy Cách`
    4.  `Đơn Vị Sản Xuất`
    5.  `Lô Sản Xuất`
    6.  `Ngày Sản Xuất`
    7.  `Tình Trạng Chất Lượng`
    8.  `Ngày Thử Nổ` (Ngày Sản Xuất + 30 ngày)
*   **Cột Số Lượng (Động):** Các cột có tiêu đề là mã kho (ví dụ: `ĐT3`, `CP4`), chứa số lượng tồn kho.

---

## Giai đoạn 1: Nền tảng (Boomerang - Lượt đi)

*Mục tiêu: Thiết lập sheet tồn kho tổng hợp (`TON_KHO_tonghop`) với cấu trúc cột động.*

- [x] **1.1. Đọc Danh Sách Kho:** Tạo hàm trong `db.gs` để đọc danh sách tên kho từ cột D của sheet `DANH MUC`.
- [x] **1.2. Thiết Kế Sheet Tồn Kho Tổng Hợp:** Cập nhật `setupInitialStructure()` trong `config.js` để tự động tạo sheet `TON_KHO_tonghop` với các cột định danh cố định và các cột số lượng động dựa trên danh sách kho đọc được.
- [x] **1.3. Cập nhật `PLANNING.md`:** Ghi lại kiến trúc "một sheet, nhiều cột" mới này vào file `PLANNING.md`.

## Giai đoạn 2: Xây dựng Logic (Boomerang - Điểm cao nhất)

*Mục tiêu: Viết logic nghiệp vụ để tìm đúng hàng, đúng cột và cập nhật số lượng.*

- [x] **2.1. Viết Lại `WarehouseService`:** Trong `service.gs`, xây dựng các hàm để làm việc với cấu trúc bảng dẹt (flat table).
- [x] **2.2. Hàm Cập Nhật Tồn Kho Chính (`updateMasterInventory`):**
    - [x] Tìm hàng (row) trong `TON_KHO_tonghop` dựa trên `INDEX (SKU)`. Nếu chưa có, tạo hàng mới.
    - [x] Xác định tên cột (column) cần cập nhật dựa vào trường "Kho" trong giao dịch.
    - [x] Thực hiện phép toán cộng (Nhập) hoặc trừ (Xuất) vào đúng ô.
    - [x] Xử lý giao dịch "Điều chuyển" (trừ ở cột "Kho Đi", cộng vào cột "Kho Đến").
- [x] **2.3. Ghi Giao Dịch:** Đảm bảo logic ghi vào `LOG_GIAO_DICH_tbl` vẫn hoạt động chính xác.

## Giai đoạn 3: Tích hợp (Boomerang - Lượt về)

*Mục tiêu: Kết nối logic mới với giao diện người dùng.*

- [x] **3.1. Tái cấu trúc `logic.js`:** Sửa đổi `processFormData()` để gọi đến hàm `updateMasterInventory()` mới.
- [x] **3.2. Kiểm tra và Hoàn Thiện:** Đảm bảo toàn bộ luồng hoạt động chính xác.
- [x] **3.3. Triển khai:** Thực hiện `clasp push` để cập nhật hệ thống.