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
  const timestamp = new Date();
  timestamp.setHours(timestamp.getHours() + 14); // Chỉnh múi giờ theo yêu cầu
  logSheet.appendRow([
    timestamp, // Cột A: Timestamp đã điều chỉnh
    txObject.sku, // Cột B: INDEX (SKU)
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
    return { productMap: {}, productDropdown: [], warehouses: [] };
  }

  // Đọc đến cột F để lấy tất cả dữ liệu cần thiết
  const data = sheet.getRange(`A2:F${lastRow}`).getValues();

  const productMap = {};
  const warehouses = new Set();

  data.forEach(row => {
    const fullName = row[0]; // Tên đầy đủ
    const shortName = row[1]; // Tên viết tắt
    const quyCach = row[2]; // Quy cách
    const factory = row[3]; // Đơn vị sản xuất
    const warehouse = row[4]; // Kho
    const lotCode = row[5]; // Mã lô (nếu có)

    if (fullName) {
      productMap[fullName] = {
        shortName: shortName,
        quyCach: quyCach,
        factory: factory,
        lotCode: lotCode
      };
    }
    if (warehouse) warehouses.add(warehouse);
  });

  const productDropdown = Object.keys(productMap).map(fullName => ({
    value: fullName,
    text: `${productMap[fullName].shortName} (${fullName})`
  }));

  return {
    productMap,
    productDropdown,
    warehouses: [...warehouses]
  };
}

/**
 * Lấy danh sách tên các kho từ cột 'Kho' trong sheet 'DANH MUC'.
 * @returns {string[]} - Một mảng chứa tên của tất cả các kho.
 */
function getWarehouseNames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    Logger.log(`Không tìm thấy sheet danh mục: "${CONFIG_SHEET_NAME}"`);
    return [];
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  // Đọc dữ liệu từ cột D (cột thứ 4)
  const warehouseData = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
  
  // Lọc bỏ các giá trị rỗng và trùng lặp
  const warehouses = new Set();
  warehouseData.forEach(row => {
    if (row[0]) {
      warehouses.add(row[0].toString().trim());
    }
  });

  return [...warehouses];
}