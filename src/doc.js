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
# TÀI LIỆU VẬN HÀNH: HỆ THỐNG QUẢN LÝ KHO (MICCO) - v2.0

## 1. KIẾN TRÚC HỆ THỐNG (Mô hình 3 Tầng)

Hệ thống được cấu trúc theo mô hình 3 tầng để đảm bảo hiệu năng, tính toàn vẹn dữ liệu và khả năng bảo trì.

### Cấu trúc Google Sheets
* **DANH MUC:** Sheet **quan trọng nhất**, do người dùng quản lý. Đây là nơi định nghĩa toàn bộ danh sách sản phẩm, kho, phân xưởng và các quy tắc tạo mã.
* **LOG_GIAO_DICH_tbl:** Bảng dữ liệu thô, lưu lại **toàn bộ** lịch sử giao dịch. Dữ liệu ở đây là bất biến và là nguồn chân lý duy nhất.
* **vw_tonkho:** Một "View" (chỉ đọc), tự động dùng hàm QUERY để tổng hợp tồn kho tức thời từ sheet LOG_GIAO_DICH_tbl.
* **Trang Chính:** Giao diện làm việc chính, hiển thị dữ liệu và chứa bảng nhập liệu thủ công.

### Cấu trúc Apps Script
* **Config.gs:** Chứa các biến cấu hình (tên sheet, dải ô) và hàm tạo menu, thiết lập cấu trúc.
* **db.gs:** Tầng Truy cập Dữ liệu. Chứa các hàm **duy nhất** được phép đọc/ghi trực tiếp vào Google Sheets.
* **service.gs:** Tầng Dịch vụ. Chứa **toàn bộ logic nghiệp vụ** (xử lý giao dịch, tạo SKU, gợi ý lô...).
* **logic.js:** Tầng Logic Giao diện. Đóng vai trò cầu nối, gọi các hàm từ tầng dịch vụ để đáp ứng yêu cầu từ giao diện.
* **doc.js:** (File này) Chứa logic tạo tài liệu hướng dẫn.
* **FormNhapLieu.html:** Giao diện người dùng (sidebar).

## 2. QUY TRÌNH VẬN HÀNH

### Quy Tắc Gợi Ý Lô Sản Xuất
Hệ thống sẽ tự động tạo gợi ý Lô Sản Xuất khi người dùng chọn **Tên Sản Phẩm**, **Ngày Sản Xuất** và **Đơn Vị Sản Xuất** trên form.
* **Công thức gợi ý:** \`[MMYY][Mã Lô]\`
* **Ví dụ:** Nếu Ngày sản xuất là **07/2025** và "Mã Lô" (cột E) tương ứng là **"LĐ2"**, hệ thống sẽ gợi ý: **0725LĐ2**.

### Quy Tắc Tạo Mã SKU (INDEX)
Mã SKU được tự động tạo cho mỗi giao dịch để định danh duy nhất.
* **Công thức SKU:** \`[Mã Sản Phẩm]-[Quy Cách]-[ddMMyy]-[Mã Phân Xưởng]\`
* **Ví dụ:** \`LĐ2-NA-250724-ĐT\`
* **Lưu ý:**
    * **[Mã Sản Phẩm]:** Ưu tiên lấy từ cột "Mã Lô" (cột E), nếu trống sẽ lấy "Tên viết tắt" (cột B).
    * **[Quy Cách]:** Lấy từ form, nếu trống sẽ là "NA".
    * **[Mã Phân Xưởng]:** Được ánh xạ từ tên phân xưởng (ví dụ: 'Px Đông Triều' -> 'ĐT').

### Trường Hợp Đặc Biệt: Sản phẩm ANFO
Để xử lý linh hoạt mã ANFO cho các phân xưởng khác nhau, hệ thống sử dụng một placeholder đặc biệt.
* **Cách dùng:** Trong sheet "DANH MUC", tại cột "Mã Lô" (cột E) của sản phẩm ANFO, hãy điền giá trị có chứa \`{PX}\`.
* **Ví dụ:** Điền **\`AF{PX}\`** vào cột "Mã Lô".
* **Kết quả:** Khi người dùng chọn "Px Cẩm Phả", hệ thống sẽ tự động thay thế \`{PX}\` bằng "CP", tạo ra mã sản phẩm là **AFCP** để dùng trong SKU.

### Xử Lý Giao Dịch
* **Nhập:** Ghi nhận số lượng dương.
* **Xuất:** Tự động ghi nhận số lượng âm.
* **Điều chuyển:** Tự động tạo 2 dòng trong log:
    * 1. Một dòng **xuất kho** (số lượng âm) từ kho đi.
    * 2. Một dòng **nhập kho** (số lượng dương) vào kho đến.

## 3. THIẾT LẬP BAN ĐẦU
Để thiết lập các sheet hệ thống (\`LOG_GIAO_DICH_tbl\`, \`vw_tonkho\`), từ menu chọn:
* \`📦 Quản Lý Kho\` -> \`⚙️ Trợ giúp & Cài đặt\` -> \`Thiết lập cấu trúc (Chạy 1 lần)\`
`;
}