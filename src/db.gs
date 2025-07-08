/**
 * @OnlyCurrentDoc
 * TỆP TRUY CẬP DỮ LIỆU (DATABASE LAYER)
 * Chứa các hàm để đọc và ghi trực tiếp vào các sheet dữ liệu thô (*_tbl).
 * Không chứa logic nghiệp vụ hoặc logic giao diện.
 */

/**
 * Ghi một đối tượng giao dịch vào sheet LOG_GIAO_DICH_tbl.
 * @param {object} txObject - Đối tượng chứa thông tin giao dịch.
 */
function addTransactionToLog(txObject) {
  // TODO: Implement logic to append a row to the log sheet.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  
  // The order of values must match the column order in the sheet.
  logSheet.appendRow([
    new Date(), // Timestamp
    txObject.sku,
    txObject.ngayGiaoDich,
    txObject.loaiGiaoDich,
    txObject.tenSanPham,
    txObject.quyCach,
    txObject.loSanXuat,
    txObject.ngaySanXuat ? new Date(txObject.ngaySanXuat) : null,
    txObject.tinhTrangChatLuong,
    txObject.soLuong,
    txObject.phanXuong,
    txObject.kho,
    txObject.ghiChu
  ]);
}

/**
 * Lấy dữ liệu danh mục từ sheet 'DANH MUC' theo cấu trúc người dùng chỉ định.
 * @returns {object} - Một đối tượng chứa các mảng dữ liệu cho dropdowns.
 */
function getCategoryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // Sử dụng hằng số CONFIG_SHEET_NAME đã có, trỏ đến 'DANH MUC'
  const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet danh mục: "${CONFIG_SHEET_NAME}"`);
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { products: [], factories: [], warehouses: [] };
  }

  const dataRange = sheet.getRange(`A2:E${lastRow}`); // Read up to column E
  const data = dataRange.getValues();

  const products = data
    .map(row => ({
      fullName: row[0],
      shortName: row[1],
      factory: row[2],
      warehouse: row[3],
      lotCode: row[4]  // Column E: Mã Lô
    }))
    .filter(p => p.fullName);

  const productDropdown = data.map(p => ({ value: p.fullName, text: p.shortName })).filter(p => p.value && p.text);
  const factories = [...new Set(data.map(p => p.factory))].filter(String);
  const warehouses = [...new Set(data.map(p => p.warehouse))].filter(String);

  return {
    allData: products, // Pass all data to service layer
    productDropdown,
    factories,
    warehouses
  };
}