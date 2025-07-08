/**
 * @OnlyCurrentDoc
 * TỆP XỬ LÝ LOGIC TẠO VÀ QUẢN LÝ TÀI LIỆU DỰ ÁN
 */

/**
 * Tạo hoặc mở file tài liệu hướng dẫn dự án.
 * Hàm này được gọi từ menu trong file Config.gs.
 */
function createOrOpenDocumentation() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const properties = PropertiesService.getScriptProperties();
  const docId = properties.getProperty('documentationId');
  const ui = SpreadsheetApp.getUi();

  // Nếu đã có file tài liệu, mở nó ra
  if (docId) {
    try {
      const doc = DocumentApp.openById(docId);
      const url = doc.getUrl();
      const htmlOutput = HtmlService.createHtmlOutput(`<p>Đã tìm thấy tài liệu dự án. <a href="${url}" target="_blank">Nhấn vào đây để mở.</a></p>`)
        .setWidth(300)
        .setHeight(100);
      ui.showModalDialog(htmlOutput, 'Mở Tài liệu');
      return;
    } catch (e) {
      // Bắt lỗi nếu file đã bị người dùng xóa, tiến hành tạo mới
      properties.deleteProperty('documentationId');
    }
  }

  // Nếu chưa có file tài liệu, tạo mới
  const response = ui.alert('Tạo file tài liệu', 'Chưa tìm thấy file tài liệu dự án. Bạn có muốn tạo một file mới không?', ui.ButtonSet.YES_NO);
  if (response == ui.Button.YES) {
    const docContent = getDocumentationContent(); // Lấy nội dung từ hàm trợ giúp bên dưới
    const docName = `Tài liệu Dự án - ${ss.getName()}`;
    const newDoc = DocumentApp.create(docName);
    const body = newDoc.getBody();
    
    // Phân tích và định dạng nội dung vào file Google Docs
    docContent.split('\n').forEach(line => {
      if (line.startsWith('### ')) {
        body.appendParagraph(line.replace('### ', '')).setHeading(DocumentApp.ParagraphHeading.HEADING3);
      } else if (line.startsWith('## ')) {
        body.appendParagraph(line.replace('## ', '')).setHeading(DocumentApp.ParagraphHeading.HEADING2);
      } else if (line.startsWith('# ')) {
        body.appendParagraph(line.replace('# ', '')).setHeading(DocumentApp.ParagraphHeading.HEADING1);
      } else if (line.startsWith('* ')) {
        body.appendListItem(line.replace('* ', '')).setGlyphType(DocumentApp.GlyphType.BULLET);
      } else if (line.trim() !== '') {
        body.appendParagraph(line);
      }
    });

    const newDocId = newDoc.getId();
    const newDocUrl = newDoc.getUrl();
    properties.setProperty('documentationId', newDocId);

    const htmlOutput = HtmlService.createHtmlOutput(`<p>Đã tạo tài liệu thành công. <a href="${newDocUrl}" target="_blank">Nhấn vào đây để mở.</a></p><p>File đã được lưu trong Google Drive của bạn.</p>`)
      .setWidth(400)
      .setHeight(150);
    ui.showModalDialog(htmlOutput, 'Thành Công');
  }
}

/**
 * Hàm trợ giúp: Cung cấp toàn bộ nội dung cho file tài liệu.
 * @returns {string} Nội dung tài liệu dưới dạng văn bản.
 */
function getDocumentationContent() {
  return `
# TÀI LIỆU DỰ ÁN: HỆ THỐNG QUẢN LÝ KHO BẰNG GOOGLE APPS SCRIPT

## 1. TỔNG QUAN DỰ ÁN

### Mục tiêu
Dự án này được xây dựng nhằm mục đích số hóa và tự động hóa quy trình quản lý nhập, xuất, tồn kho sản xuất. Hệ thống giúp thay thế các phương pháp thủ công, giảm thiểu sai sót, cung cấp số liệu tồn kho theo thời gian thực và tạo báo cáo định kỳ một cách nhanh chóng.

### Công nghệ sử dụng
* **Google Sheets:** Đóng vai trò là cơ sở dữ liệu (database), nơi lưu trữ toàn bộ thông tin về sản phẩm, kho, giao dịch và các báo cáo.
* **Google Apps Script:** Là "bộ não" của hệ thống, xử lý toàn bộ logic nghiệp vụ, từ việc hiển thị form nhập liệu, tính toán tồn kho, cho đến việc tạo báo cáo.
* **HTML/CSS/JavaScript (phía client):** Dùng để xây dựng giao diện form nhập liệu thân thiện với người dùng.
* **Google Cloud Vision API:** Dịch vụ trí tuệ nhân tạo (AI) của Google, được sử dụng cho tính năng nhận dạng ký tự quang học (OCR) để đọc dữ liệu từ ảnh chụp phiếu kho.

### Đối tượng sử dụng
* **Nhân viên kho/sản xuất:** Người trực tiếp nhập liệu các giao dịch nhập/xuất hàng ngày.
* **Kế toán kho, quản lý sản xuất:** Người theo dõi, kiểm soát số liệu tồn kho, chốt sổ và tạo báo cáo định kỳ.

## 2. KIẾN TRÚC HỆ THỐNG

### Cấu trúc Google Sheets
* **Trang Chính:** Giao diện làm việc chính, hiển thị tóm tắt tình hình.
* **DANH MUC:** Nơi định nghĩa danh sách Sản phẩm, Phân xưởng, Kho.
* **TON_KHO_HIEN_TAI:** Cơ sở dữ liệu "sống" về tình trạng tồn kho.
* **LichSu_YYYY_MM:** Các sheet lưu trữ chi tiết toàn bộ lịch sử giao dịch theo tháng.
* **Snapshot_YYYY_MM:** Các sheet "chụp ảnh" lại tình trạng tồn kho tại thời điểm cuối tháng sau khi "Chốt sổ".
* **BaoCaoTonKho:** Sheet dùng để hiển thị báo cáo Nhập-Xuất-Tồn.

### Cấu trúc Apps Script
* **Config.gs:** Chứa các biến cấu hình, hàm tạo menu, và hàm thiết lập hệ thống.
* **Logic.gs:** Chứa toàn bộ logic nghiệp vụ chính của ứng dụng.
* **Doc.gs:** (File này) Chứa logic tạo và quản lý tài liệu dự án.
* **FormNhapLieu.html:** File HTML định nghĩa giao diện của form nhập liệu.

## 3. QUY TRÌNH HOẠT ĐỘNG

### Thiết lập ban đầu
* Cấu hình danh mục trong sheet **DANH MUC**.
* Chạy chức năng **"Thiết lập ban đầu"** từ menu.
* Cấu hình **Cloud Vision API** theo hướng dẫn để bật tính năng OCR.

### Nhập/Xuất kho hàng ngày
1.  Mở form nhập liệu từ menu.
2.  (Tùy chọn) Tải ảnh lên để OCR điền tự động một số trường.
3.  Kiểm tra và bổ sung thông tin.
4.  Nhấn "Ghi Lại Giao Dịch".

### Quy trình cuối tháng
1.  Đảm bảo nhập đủ giao dịch.
2.  Chạy chức năng **"Chốt Sổ Cuối Tháng"**.
3.  Chạy chức năng **"Tạo Báo Cáo Tồn Kho Tháng"** để xem kết quả.

## 4. BẢO TRÌ VÀ MỞ RỘNG

### Cách thêm/sửa/xóa các danh mục
* **Sản phẩm, Kho, Phân xưởng:** Chỉnh sửa trực tiếp trên sheet **DANH MUC**.
* **Kho được theo dõi trên Bảng Tồn Kho:** Mở file **Config.gs**, tìm biến \`MONITORED_WAREHOUSES\` và chỉnh sửa.

### Tùy chỉnh OCR
* Độ chính xác của OCR phụ thuộc vào các quy tắc trong hàm \`parseRawText(text)\` ở file **Logic.gs**.
`;
}