/**
 * @OnlyCurrentDoc
 * TỆP TRUY CẬP DỮ LIỆU (DATABASE LAYER)
 * Chứa các hàm để đọc và ghi trực tiếp vào các sheet dữ liệu thô (*_tbl).
 * Không chứa logic nghiệp vụ hoặc logic giao diện.
 */

const LOG_SHEET_NAME = 'LOG_GIAO_DICH_tbl';
const CATEGORY_SHEET_NAME = 'DANH_MUC_tbl';

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
 * Lấy dữ liệu danh mục từ sheet DANH_MUC_tbl.
 * @returns {object} - Một đối tượng chứa các mảng dữ liệu cho dropdowns.
 */
function getCategoryData() {
  // TODO: Implement logic to read from the category sheet.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const categorySheet = ss.getSheetByName(CATEGORY_SHEET_NAME);
  if (!categorySheet) {
    throw new Error(`Không tìm thấy sheet danh mục: ${CATEGORY_SHEET_NAME}`);
  }
  
  const lastRow = categorySheet.getLastRow();
  if (lastRow < 2) {
    return { products: [], factories: [], warehouses: [] };
  }

  const data = categorySheet.getRange(2, 1, lastRow - 1, 6).getValues();
  
  const products = data.map(row => ({
    value: row[2], // PRODUCT_FULL_NAME
    text: row[3]   // PRODUCT_SHORT_NAME
  }));

  // For now, let's assume factories and warehouses are still in the old config sheet
  // This will be refactored later.
  const configSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DANH MUC');
  const factories = configSheet.getRange('C2:C' + configSheet.getLastRow()).getValues().flat().filter(String);
  const warehouses = configSheet.getRange('D2:D' + configSheet.getLastRow()).getValues().flat().filter(String);

  return { products, factories, warehouses };
}