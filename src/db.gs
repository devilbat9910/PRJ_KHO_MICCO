/**
 * @OnlyCurrentDoc
 * TỆP TRUY CẬP DỮ LIỆU (DATABASE LAYER)
 * Chứa các hàm để đọc và ghi trực tiếp vào các sheet dữ liệu thô (*_tbl).
 * Không chứa logic nghiệp vụ hoặc logic giao diện.
 */

/**
 * Ghi một đối tượng giao dịch đã xử lý vào sheet LOG_GIAO_DICH_tbl.
 * @param {object} txObject - Đối tượng chứa thông tin giao dịch đã được service xử lý.
 */
function addTransactionToLog(txObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  
  // Thứ tự các giá trị phải khớp với cấu trúc của txObject từ service
  // và cấu trúc cột trong sheet LOG_GIAO_DICH_tbl.
  logSheet.appendRow([
    new Date(), // Cột A: Timestamp
    txObject.sku, // Cột B: INDEX (SKU)
    // Cột C (Ngày Giao Dịch) bị loại bỏ, dữ liệu dịch sang trái
    txObject.loaiGiaoDich,
    txObject.tenSanPham,
    txObject.quyCach,
    txObject.loSanXuat,
    txObject.ngaySanXuat, // Đã là đối tượng Date từ service
    txObject.tinhTrangChatLuong,
    txObject.soLuong,
    txObject.phanXuong,
    txObject.kho,
    txObject.ghiChu
  ]);
}

/**
 * Lấy dữ liệu danh mục từ sheet 'DANH MUC' với ánh xạ cột chính xác.
 * @returns {object} - Một đối tượng chứa các mảng dữ liệu cho dropdowns và xử lý logic.
 */
function getCategoryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet danh mục: "${CONFIG_SHEET_NAME}"`);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { productMap: {}, productDropdown: [], factories: [], warehouses: [] };
  }

  // Đọc toàn bộ vùng dữ liệu A:E một lần để tối ưu
  const data = sheet.getRange(`A2:E${lastRow}`).getValues();

  const productMap = {};
  const factories = new Set();
  const warehouses = new Set();

  // Lặp qua từng hàng để xử lý dữ liệu với đúng chỉ mục cột
  data.forEach(row => {
    const fullName = row[0]; // Cột A: Tên Sản Phẩm
    const factory = row[2];  // Cột C: Phân xưởng
    const warehouse = row[3]; // Cột D: Kho

    if (fullName) {
      productMap[fullName] = {
        shortName: row[1], // Cột B
        lotCode: row[4]    // Cột E
      };
    }
    if (factory) factories.add(factory);
    if (warehouse) warehouses.add(warehouse);
  });

  const productDropdown = Object.keys(productMap).map(fullName => ({
    value: fullName,
    text: `${productMap[fullName].shortName} (${fullName})`
  }));

  return {
    productMap: productMap,
    productDropdown: productDropdown,
    factories: [...factories],
    warehouses: [...warehouses]
  };
}