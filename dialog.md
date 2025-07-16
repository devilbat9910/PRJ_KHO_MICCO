# Nhật Ký Phiên Làm Việc - 07/07/2025
... (các nội dung cũ) ...
---
# Nhật Ký Phiên Làm Việc - 14/07/2025: Tái Cấu Trúc Logic Form và Cập Nhật Đặc Tả
... (nội dung cũ) ...
---
# Nhật Ký Phiên Làm Việc - 16/07/2025: Hoàn Thiện Chức Năng Nhập Liệu Từ Sheet và Tái Cấu Trúc UI

### Giai Đoạn 38: Triển Khai Chức Năng Nhập Liệu Từ Sheet 'INPUT'

1.  **Mục tiêu:** Tạo một phương thức nhập liệu mới trực tiếp trên trang tính, thay thế cho các giao diện phức tạp, đồng thời đảm bảo tính toàn vẹn dữ liệu và tái sử dụng logic nghiệp vụ cốt lõi.
2.  **Hành động & Triển khai:**
    *   **Tạo Sheet `INPUT`:** Hướng dẫn người dùng tạo sheet `INPUT` với các cột và xác thực dữ liệu (Data Validation) cần thiết để chuẩn hóa đầu vào.
    *   **Tạo Hàm Xử Lý (`macros.js`):** Tạo một tệp mới là `macros.js` và viết hàm `processInputSheet()` để đọc dữ liệu từ sheet `INPUT`.
    *   **Tích hợp Menu:** Thêm một menu tùy chỉnh "Tiện Ích" -> "Xử lý dữ liệu từ sheet INPUT" vào tệp `config.js` để người dùng có thể dễ dàng gọi hàm.
    *   **Tái cấu trúc `processManualInputTable`:** Dựa trên phản hồi, đã tái sử dụng và tái cấu trúc lại hàm `processManualInputTable` trong `logic.js` để nó hoạt động với sheet `INPUT` và vùng dữ liệu mới, thay vì tạo một hàm hoàn toàn mới.

### Giai Đoạn 39: Gỡ Lỗi và Nâng Cấp Logic Xử Lý Giao Dịch

1.  **Mục tiêu:** Khắc phục một loạt các lỗi nghiêm trọng phát sinh từ chức năng nhập liệu mới và nâng cấp để xử lý các kịch bản phức tạp hơn.
2.  **Hành động & Triển khai:**
    *   **Sửa lỗi `dateStr.split`:**
        *   **Triệu chứng:** Lỗi xảy ra khi script cố gắng xử lý một đối tượng `Date` từ sheet như một chuỗi.
        *   **Khắc phục:** Nâng cấp hàm `service_processSingleTransaction` trong `service.js` để kiểm tra và xử lý linh hoạt cả đối tượng `Date` (từ sheet) và chuỗi (từ form HTML).
    *   **Sửa lỗi `replace` trên giá trị `undefined`:**
        *   **Triệu chứng:** Lỗi xảy ra do script không tìm thấy tên kho hợp lệ.
        *   **Khắc phục:** Thêm các bước kiểm tra phòng vệ và xác thực tên kho trong `service.js` và `logic.js` để đảm bảo tên kho luôn hợp lệ trước khi xử lý.
    *   **Nâng cấp logic 'Điều chuyển':**
        *   **Yêu cầu:** Xử lý giao dịch "Điều chuyển" với quy ước: cột "Kho hiện tại" là kho đi, và cột "Ghi chú" là kho đến.
        *   **Triển khai:** Cập nhật `logic.js` và `service.js` để đọc, chuẩn hóa, và xác thực dữ liệu kho theo quy ước mới này. Logic kiểm tra tồn kho đã được xác nhận là hoạt động chính xác.
    *   **Nâng cấp logic 'Nhập':**
        *   **Yêu cầu:** Tự động tạo `INDEX`, gợi ý `Lô Sản Xuất` (nếu trống), tự lấy ngày hiện tại (nếu trống), và ghi ngược các giá trị này lại vào sheet.
        *   **Triển khai:** Tái cấu trúc toàn diện hàm `processManualInputTable` và `service_processSingleTransaction` để thực hiện các yêu cầu tự động hóa này.
    *   **Tối ưu hóa và Xóa dòng:**
        *   **Yêu cầu:** Xử lý hàng loạt giao dịch và xóa các dòng đã xử lý thành công.
        *   **Triển khai:** Viết lại `processManualInputTable` để xử lý theo mẻ và thực hiện một lệnh `clearContent()` duy nhất cho tất cả các dòng thành công để tối ưu hiệu suất.

### Giai Đoạn 40: Tái Cấu Trúc và Hoàn Thiện Giao Diện Người Dùng (UI)

1.  **Mục tiêu:** Giải quyết dứt điểm lỗi "Không tìm thấy hàm tập lệnh" và tổ chức lại mã nguồn một cách logic hơn.
2.  **Hành động & Triển khai:**
    *   **Chẩn đoán:** Xác định nguyên nhân lỗi là do các hàm giao diện (`showTraCuuDialog`, `showSidebar`, `processManualInputTable`) được đặt trong các tệp `.js` thay vì `.gs`.
    *   **Khắc phục:**
        *   Tạo một tệp mới chuyên dụng cho giao diện là `UI.gs`.
        *   Di chuyển tất cả các hàm được gọi trực tiếp từ giao diện người dùng vào tệp `UI.gs` này.
        *   Dọn dẹp các hàm đã di chuyển ra khỏi các tệp `logic.js` và `config.js` để tránh trùng lặp.
    *   **Cập nhật `SPECIFICATION.md`:** Cập nhật lại tài liệu đặc tả để phản ánh tất cả các thay đổi về quy trình nghiệp vụ và hành vi của hệ thống.

### Tình Trạng Cuối Phiên
Phiên làm việc kết thúc. Chức năng nhập liệu từ sheet `INPUT` đã được hoàn thiện và ổn định. Toàn bộ mã nguồn đã được tái cấu trúc để đảm bảo tính đúng đắn và dễ bảo trì. Đặc tả hệ thống đã được cập nhật.
---
# Nhật Ký Phiên Làm Việc - 16/07/2025: Tái Cấu Trúc Lớn và Gỡ Lỗi

### Giai Đoạn 1: Tái Cấu Trúc Sang Kiến Trúc Named Range
- **Vấn đề:** Phát hiện ra kiến trúc ban đầu (flat-file `DANH MUC`) là không chính xác. Cấu trúc thực tế là nhiều bảng dữ liệu riêng biệt trên cùng một sheet, được xác định bằng các Vùng được đặt tên (Named Ranges).
- **Hành động:**
    - Tái cấu trúc lại toàn bộ lớp dữ liệu (`db.js`) để đọc từ các vùng được đặt tên (`Bảng_Sản phẩm`, `Bảng_Danh sách kho`, v.v.).
    - Tái cấu trúc lại toàn bộ lớp dịch vụ (`service.js`) để thực hiện các tra cứu riêng biệt vào từng bảng thay vì một bảng lớn.
    - Cập nhật `SPECIFICATION.md` để phản ánh đúng kiến trúc này.

### Giai Đoạn 2: Gỡ Lỗi Luồng Nhập Liệu
- **Triệu chứng:** Chức năng xử lý từ sheet `INPUT` liên tục không xử lý được giao dịch nào.
- **Quá trình gỡ lỗi:**
    1.  Sửa lỗi không khớp tên tiêu đề (`Loại Giao Dịch` -> `Nhập/xuất`).
    2.  Sửa lỗi logic đọc vùng dữ liệu (sử dụng `getRangeByName('INPUT_RANGE')`).
    3.  Sửa lỗi logic xử lý header không phải là chuỗi.
    4.  Sửa lỗi logic tra cứu trong `service.js` (tìm theo mã thay vì tên đầy đủ).
- **Tình trạng cuối phiên:** Vẫn còn lỗi. Lỗi cuối cùng được ghi nhận là `Không tìm thấy sản phẩm: "NTLT"`. Điều này cho thấy vẫn còn sự không khớp giữa dữ liệu nhập vào và dữ liệu trong `Bảng_Sản phẩm`.

### Nhiệm vụ cho phiên tiếp theo
- Tiếp tục điều tra và gỡ lỗi chức năng nhập liệu từ sheet `INPUT`.
---
# Nhật Ký Phiên Làm Việc - 16/07/2025 (Tiếp theo): Gỡ Lỗi Toàn Diện và Hoàn Thiện Hệ Thống

### Giai Đoạn 3: Gỡ Lỗi Toàn Diện Luồng Nhập Liệu

1.  **Mục tiêu:** Giải quyết dứt điểm lỗi `Không tìm thấy sản phẩm: "NTLT"` và các lỗi phát sinh sau đó để hoàn thiện toàn bộ luồng xử lý.
2.  **Quá trình gỡ lỗi & Khắc phục:**
    *   **Lỗi `Không tìm thấy sản phẩm`:**
        *   **Chẩn đoán ban đầu:** Nghi ngờ do khoảng trắng thừa hoặc khác biệt chữ hoa/thường.
        *   **Hành động:** Cải thiện logic tìm kiếm trong `db.js` để chuẩn hóa dữ liệu (`trim`, `toUpperCase`). -> **Thất bại.**
        *   **Chẩn đoán tiếp theo:** Nghi ngờ tìm sai cột (`Tên sản phẩm` thay vì `Viết tắt`).
        *   **Hành động:** Sửa logic trong `db.js` để tìm theo cột `Viết tắt`. -> **Thất bại.**
        *   **Chẩn đoán cuối cùng:** Phát hiện tên Vùng được đặt tên (Named Range) trong mã nguồn (`Bảng_Sản phẩm`) không khớp với tên thực tế trong Google Sheet (`Bảng_Sản_Phẩm`).
        *   **Khắc phục:** Sửa lại tên Vùng được đặt tên trong `db.js` cho chính xác. -> **Thành công.**
    *   **Lỗi `Không tìm thấy kho`:**
        *   **Triệu chứng:** Sau khi sửa lỗi sản phẩm, hệ thống báo lỗi không tìm thấy kho.
        *   **Chẩn đoán:** Tương tự lỗi trước, mã đang tìm theo `Tên kho` thay vì `Mã kho`.
        *   **Khắc phục:** Sửa hàm `db_findWarehouse` trong `db.js` để tìm theo `Mã kho`. Đồng thời cập nhật lại tên các Vùng được đặt tên khác cho chính xác (`Bảng_Danh_Sách_Kho`, `Bảng_Mã_Phân_Xưởng`). -> **Thành công.**
    *   **Lỗi `service_getRecentTransactions is not defined`:**
        *   **Triệu chứng:** Lỗi phát sinh sau khi các lỗi tra cứu được giải quyết.
        *   **Chẩn đoán:** Thiếu hàm để lấy và hiển thị các giao dịch gần đây lên UI.
        *   **Khắc phục:**
            1.  Tạo hàm `db_getRecentLogs` trong `db.js` để đọc các dòng cuối từ sheet `LOG`.
            2.  Tạo hàm `service_getRecentTransactions` trong `service.js` để lấy và định dạng dữ liệu từ `LOG` sang định dạng 11 cột của bảng RECENT.
            3.  Sửa lại hàm `updateDashboardRecentTransactions` trong `logic.js` để sử dụng trực tiếp Vùng được đặt tên `INPUT_RECENT` và ghi dữ liệu vào đó. -> **Thành công.**
    *   **Tinh chỉnh cuối cùng (Dựa trên phản hồi):**
        *   **Định dạng ngày giờ:** Cập nhật `service.js` để sử dụng múi giờ `GMT+7` và định dạng `dd/MM/yyyy HH:mm:ss` cho tất cả các trường ngày tháng.
        *   **Hiển thị dữ liệu RECENT:** Sửa đổi `service.js` để bảng RECENT hiển thị `Viết tắt` (sản phẩm), `Mã kho` và `Mã phân xưởng` thay vì tên đầy đủ. -> **Thành công.**

### Tình Trạng Cuối Phiên
- Toàn bộ luồng nhập liệu từ sheet `INPUT`, bao gồm tra cứu, ghi log, và cập nhật giao diện, đã được gỡ lỗi và hoàn thiện.
- Hệ thống đã tuân thủ đúng các quy tắc nghiệp vụ và định dạng dữ liệu được yêu cầu.
- Mã nguồn đã được dọn dẹp và đồng bộ lên Google Apps Script.
---
## CỘT MỐC QUAN TRỌNG: Chức năng Nhập liệu Chính Hoàn Thiện
Toàn bộ luồng xử lý nhập liệu từ sheet `INPUT`, bao gồm tra cứu dữ liệu, xác thực, ghi vào `LOG`, và cập nhật giao diện người dùng (bảng RECENT), đã được gỡ lỗi toàn diện và đi vào hoạt động ổn định. Giai đoạn phát triển và gỡ lỗi cho tính năng cốt lõi này đã chính thức hoàn thành.
---
# Nhật Ký Phiên Làm Việc - 16/07/2025 (Tối): Triển Khai Kiến Trúc DATABASE và Hoàn Thiện Hệ Thống

### Giai Đoạn 4: Triển Khai Kiến Trúc `DATABASE`

1.  **Mục tiêu:** Xây dựng một kiến trúc dữ liệu mới, tách biệt giữa `LOG` (lịch sử giao dịch không thay đổi) và `DATABASE` (trạng thái tồn kho mới nhất) để hỗ trợ chức năng sửa đổi dữ liệu một cách minh bạch.
2.  **Hành động & Triển khai:**
    *   **Tạo Sheet `DATABASE`:** Hướng dẫn người dùng tạo sheet `DATABASE` với cấu trúc tương tự `LOG` nhưng không có cột `timestamp`.
    *   **Nâng cấp Lớp Dữ liệu (`db.js`):**
        *   Tạo hàm `db_upsertToDatabase(logObject)` để thực hiện việc cập nhật hoặc thêm mới (UPSERT) một dòng vào `DATABASE` dựa trên `maIndex`.
        *   Tạo hàm `db_getLatestState(maIndex)` để lấy trạng thái mới nhất của một sản phẩm từ `DATABASE`, phục vụ cho việc sửa đổi.
    *   **Xây dựng Logic Sửa đổi (`service.js`):**
        *   Xây dựng hàm `service_updateTransaction(newData, oldData)` để so sánh dữ liệu mới và cũ.
        *   Triển khai logic ghi nhiều dòng log: Với mỗi trường dữ liệu bị thay đổi, một dòng log riêng biệt với loại giao dịch `UPDATE:[tên trường]` sẽ được ghi vào `LOG`.
    *   **Tích hợp Luồng Dữ liệu:**
        *   Tích hợp `db_upsertToDatabase` vào cả luồng tạo mới và sửa đổi giao dịch để đảm bảo `DATABASE` luôn được cập nhật.
    *   **Sửa Lỗi Phát Sinh:**
        *   Khắc phục lỗi cú pháp do đặt nhầm hàm `db_getLatestState` vào bên trong một hàm khác.
        *   Thêm các bước kiểm tra phòng vệ để xử lý các trường hợp sheet hoặc vùng dữ liệu trống, ngăn ngừa lỗi "Số hàng trong dải ô phải tối thiểu là 1".

### Tình Trạng Cuối Cùng
- Hệ thống đã được nâng cấp lên kiến trúc `LOG` / `DATABASE` hoàn chỉnh, hoạt động ổn định.
- Toàn bộ mã nguồn đã được đồng bộ hóa giữa môi trường local và Google Apps Script.
- Toàn bộ lịch sử làm việc đã được ghi lại.