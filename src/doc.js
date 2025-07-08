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
# TÀI LIỆU VẬN HÀNH: HỆ THỐNG QUẢN LÝ KHO (MICCO)

## 1. KIẾN TRÚC HỆ THỐNG (Mô hình AllInSheets)

Hệ thống được tái cấu trúc theo mô hình 3 tầng để đảm bảo hiệu năng và khả năng bảo trì.

### Cấu trúc Google Sheets
* **DANH MUC:** Sheet **quan trọng nhất**, do người dùng quản lý. Đây là nơi định nghĩa toàn bộ danh sách cho các ô lựa chọn và các quy tắc nghiệp vụ.
* **LOG_GIAO_DICH_tbl:** Bảng dữ liệu thô, lưu lại toàn bộ lịch sử giao dịch nhập/xuất. Dữ liệu ở đây là bất biến.
* **vw_tonkho:** Một "View" chỉ đọc, tự động dùng hàm QUERY để tổng hợp tồn kho từ sheet LOG_GIAO_DICH_tbl.
* **Trang Chính:** Giao diện làm việc chính.

### Cấu trúc Apps Script
* **Config.gs:** Chứa các biến cấu hình và hàm tạo menu.
* **db.gs:** Tầng truy cập dữ liệu, chỉ chứa hàm đọc/ghi vào các sheet.
* **service.gs:** Tầng dịch vụ, chứa logic nghiệp vụ (tạo SKU, gợi ý lô...).
* **logic.js:** Tầng trung gian, kết nối giao diện với tầng dịch vụ.
* **doc.js:** (File này) Chứa logic tạo tài liệu hướng dẫn.
* **FormNhapLieu.html:** Giao diện người dùng.

## 2. QUY TẮC VẬN HÀNH BẮT BUỘC

### Quản Lý Danh Mục (Sheet "DANH MUC")
Đây là nơi duy nhất để quản lý các danh sách lựa chọn.

* **Cột A (Sản phẩm):** Tên đầy đủ của sản phẩm.
* **Cột B (Tên viết tắt):** Tên ngắn gọn để hiển thị trên form.
* **Cột C (Phân xưởng):** Tên đơn vị sản xuất.
* **Cột D (Kho):** Tên kho lưu trữ.
* **Cột E (Mã Lô):** **CỰC KỲ QUAN TRỌNG.** Đây là ký hiệu để hệ thống tạo gợi ý Lô Sản Xuất.

### Quy Tắc Gợi Ý Lô Sản Xuất
Hệ thống sẽ tự động tạo gợi ý Lô Sản Xuất khi người dùng chọn **Tên Sản Phẩm**, **Ngày Sản Xuất** và **Đơn Vị Sản Xuất**.

* **Công thức gợi ý:** \`[MMYY][Mã Lô]\`
* **Ví dụ:**
    * Nếu Ngày sản xuất là **07/2025** và "Mã Lô" (cột E) tương ứng là **"LĐ2"**.
    * Hệ thống sẽ gợi ý: **0725LĐ2**

### Các Trường Hợp Đặc Biệt
* **PX Quảng Ninh:** Để hệ thống gợi ý đúng mã lô **AFHG**, tại dòng sản phẩm ANFO của PX Quảng Ninh, bạn cần điền vào cột "Phân xưởng" là **"PX Quảng Ninh HG"** và cột "Mã Lô" là **"AFHG"**.
* **ANFO/AF Nhập Tay:** Hệ thống vẫn sẽ đưa ra gợi ý dựa trên các quy tắc trên. Tuy nhiên, người dùng có thể **hoàn toàn bỏ qua gợi ý** và tự nhập tay Lô Sản Xuất theo quy cách nghiệm thu riêng.

## 3. THIẾT LẬP BAN ĐẦU
Để thiết lập các sheet hệ thống (\`LOG_GIAO_DICH_tbl\`, \`vw_tonkho\`), từ menu chọn:
* \`📦 Quản Lý Kho\` -> \`⚙️ Trợ giúp & Cài đặt\` -> \`Thiết lập cấu trúc (Chạy 1 lần)\`
`;
}