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
    return { productMap: {}, productDropdown: [], factories: [], warehouses: [], productAliasMap: {}, factoryAliasMap: {}, warehouseAliasMap: {} };
  }

  const data = sheet.getRange(`A2:E${lastRow}`).getValues();

  const productMap = {};
  const productAliasMap = {}; // Map từ Mã Lô (cột E) -> Tên đầy đủ (cột A)
  const factories = new Set();
  const warehouses = new Set();

  data.forEach(row => {
    const fullName = row[0];
    const shortName = row[1];
    const factory = row[2];
    const warehouse = row[3];
    const lotCode = row[4];

    if (fullName) {
      productMap[fullName] = { shortName: shortName, lotCode: lotCode };
      if (lotCode) {
        productAliasMap[lotCode.toUpperCase()] = fullName; // Key viết hoa để tìm kiếm không phân biệt
      }
      if (shortName) {
         productAliasMap[shortName.toUpperCase()] = fullName; // Thêm cả tên viết tắt vào map
      }
    }
    if (factory) factories.add(factory);
    if (warehouse) warehouses.add(warehouse);
  });

  // Tạo Alias Map cho Phân xưởng và Kho
  const factoryAliasMap = {};
  [...factories].forEach(f => {
    const match = f.match(/\(([^)]+)\)/); // Lấy text trong dấu ngoặc đơn, ví dụ "Px Đông Triều (ĐT)" -> "ĐT"
    if (match) factoryAliasMap[match[1].toUpperCase()] = f;
  });

  const warehouseAliasMap = {};
  [...warehouses].forEach(w => {
    const alias = w.replace('Kho ', '').toUpperCase(); // "Kho ĐT3" -> "ĐT3"
    warehouseAliasMap[alias] = w;
  });

  const productDropdown = Object.keys(productMap).map(fullName => ({
    value: fullName,
    text: `${productMap[fullName].shortName} (${fullName})`
  }));

  return {
    productMap,
    productDropdown,
    factories: [...factories],
    warehouses: [...warehouses],
    productAliasMap,
    factoryAliasMap,
    warehouseAliasMap
  };
}