# Danh Sách Kiểm Tra Toàn Diện Hệ Thống

Đây là danh sách các hạng mục cần rà soát để đảm bảo hệ thống hoạt động ổn định và không có nợ kỹ thuật. Quy trình kiểm tra được xây dựng dựa trên các chức năng người dùng cuối có thể truy cập từ menu.

## Danh sách kiểm tra

- [ ] **1. Chức năng Form Nhập Liệu (`showSidebar`)**
    - [ ] Mở sidebar có thành công không?
    - [ ] Tất cả các dropdown (Tên Sản Phẩm, Kho, v.v.) có tải đúng và đủ dữ liệu từ sheet `DANH MUC` không?
    - [ ] Chức năng gợi ý "Lô sản xuất" có hoạt động chính xác theo quy tắc trong `DANH MUC` không?
    - [ ] Gửi form với giao dịch "Nhập": Dữ liệu có được ghi đúng vào `LOG_GIAO_DICH_tbl` và `TON_KHO_tonghop` được cập nhật chính xác không?
    - [ ] Gửi form với giao dịch "Xuất": Dữ liệu có được ghi đúng và tồn kho có bị trừ đi chính xác không?
    - [ ] Gửi form với giao dịch "Điều chuyển": Có tạo ra 2 dòng log (Xuất/Nhập) và tồn kho ở hai kho có được cập nhật đúng không?
    - [ ] Các quy tắc validation (cả client-side và server-side) có hoạt động đúng không?

- [ ] **2. Chức năng Dialog Tra Cứu (`showTraCuuDialog`)**
    - [ ] Mở dialog có thành công không?
    - [ ] Tìm kiếm theo `INDEX` có trả về đúng lô hàng không?
    - [ ] Tìm kiếm theo các trường khác (Tên sản phẩm, Lô) có hoạt động không?
    - [ ] Logic ưu tiên tìm kiếm `INDEX` và xử lý xung đột có hoạt động như thiết kế không?
    - [ ] Kết quả tra cứu có tự động lọc bỏ các lô hàng với tổng tồn kho bằng 0 không?
    - [ ] Chức năng "Tra Cứu & Sửa" có điền đúng dữ liệu gốc vào form không?

- [ ] **3. Chức năng Báo Cáo Tồn Kho (`generateMonthlyReport`)**
    - [ ] Chức năng có chạy mà không gây lỗi không?
    - [ ] Dữ liệu trên sheet `BaoCaoTonKho` có được tạo ra và tính toán tổng hợp chính xác từ `TON_KHO_tonghop` không?

- [ ] **4. Chức năng Chốt Sổ (`createMonthlySnapshot`)**
    - [ ] Chức năng có tạo ra một sheet mới với tên đúng định dạng `Snapshot_MM-yyyy` không?
    - [ ] Dữ liệu trong sheet snapshot có phải là bản sao giá trị tĩnh của `TON_KHO_tonghop` tại thời điểm chạy không?

- [ ] **5. Chức năng Tài Liệu Dự Án (`createOrOpenDocumentation`)**
    - [ ] Chức năng có tạo ra file Google Docs chứa nội dung từ `doc.js` không?
    - [ ] Nội dung tài liệu có phản ánh đúng kiến trúc và quy tắc vận hành hiện tại không?

- [ ] **6. Chức năng Dashboard (`createIntegratedDashboard` và `onEdit`)**
    - [ ] Chạy `createIntegratedDashboard` có tạo ra sheet `Dashboard` với layout và dropdown đúng không?
    - [ ] Trigger `onEdit` có hoạt động khi thay đổi giá trị dropdown "Lọc theo khu vực kho" không?
    - [ ] Dữ liệu hiển thị trên dashboard có được lọc chính xác theo lựa chọn không?
    - [ ] Các cột kho không liên quan có được ẩn/hiện một cách linh hoạt không?

- [ ] **7. Chức năng Bảo Vệ Sheet (`protectDataSheets`)**
    - [ ] Chức năng có khóa thành công các sheet `LOG_GIAO_DICH_tbl` và `TON_KHO_tonghop` không?
    - [ ] Việc bảo vệ có ngăn chặn chỉnh sửa thủ công nhưng vẫn cho phép script hoạt động không?

- [ ] **8. Chức năng Thiết Lập Cấu Trúc (`setupInitialStructure`)**
    - [ ] Rà soát lại code: Logic có đảm bảo không làm mất dữ liệu hiện có trên `TON_KHO_tonghop` không?
    - [ ] Rà soát lại code: Logic có tự động hóa việc thêm/bớt cột kho dựa trên `DANH MUC` không?
    - [ ] Rà soát lại code: Các công thức mảng (`ARRAYFORMULA`) và quy tắc xác thực dữ liệu có được thiết lập đúng cú pháp (dấu `;`) và đúng vị trí không?