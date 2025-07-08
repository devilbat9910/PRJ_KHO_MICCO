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

  const dataRange = sheet.getRange(`A2:D${lastRow}`);
  const data = dataRange.getValues();

  const products = data
    .map(row => ({ value: row[0], text: row[1] })) // Cột A: Tên đầy đủ, Cột B: Tên viết tắt
    .filter(p => p.value && p.text);

  const factories = data
    .map(row => row[2]) // Cột C: Phân xưởng
    .filter((value, index, self) => self.indexOf(value) === index && value); // Lọc duy nhất và loại bỏ rỗng

  const warehouses = data
    .map(row => row[3]) // Cột D: Kho
    .filter((value, index, self) => self.indexOf(value) === index && value); // Lọc duy nhất và loại bỏ rỗng

  return { products, factories, warehouses };
}