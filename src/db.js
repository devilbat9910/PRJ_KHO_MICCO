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
function db_getCategoryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet danh mục: "${CONFIG_SHEET_NAME}"`);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { productMap: {}, productDropdown: [], warehouses: [], factories: [] };
  }

  // Đọc đến cột E theo cấu trúc đã xác nhận
  const data = sheet.getRange(`A2:E${lastRow}`).getValues();

  const productMap = {};
  const warehouses = new Set();
  const factories = new Set();

  data.forEach(row => {
    // Ánh xạ cột chính xác theo cấu trúc DANH MUC đã được xác nhận
    const fullName = row[0];  // Cột A: Sản phẩm
    const shortName = row[1]; // Cột B: Tên viết tắt
    const factory = row[2];   // Cột C: Phân xưởng
    const warehouse = row[3]; // Cột D: Kho
    const lotCode = row[4] ? row[4].toString() : ''; // Cột E: Mã lô/ Mã ngắn

    if (fullName) {
      // productMap chỉ chứa thông tin tra cứu, không chứa quy cách
      productMap[fullName] = {
        shortName: shortName,
        lotCode: lotCode
      };
    }
    if (factory) factories.add(factory); // Lấy từ Cột C
    if (warehouse) warehouses.add(warehouse); // Lấy từ Cột D
  });

  const productDropdown = Object.keys(productMap).map(fullName => ({
    value: fullName,
    text: `${productMap[fullName].shortName} (${fullName})`
  }));

  return {
    productMap,
    productDropdown,
    warehouses: [...warehouses],
    factories: [...factories]
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

/**
 * Lấy danh sách tên kho duy nhất từ sheet DANH MUC.
 * @returns {string[]} Một mảng các tên kho đã được sắp xếp.
 */
function db_getWarehouseList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet danh mục: "${CONFIG_SHEET_NAME}"`);
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }
  // Đọc toàn bộ cột D (Kho)
  const warehouseData = sheet.getRange(`D2:D${lastRow}`).getValues();
  const warehouseSet = new Set();
  warehouseData.forEach(row => {
    if (row[0]) {
      warehouseSet.add(row[0].toString().trim());
    }
  });
  // Sắp xếp để đảm bảo thứ tự cột nhất quán
  return [...warehouseSet].sort();
}


/**
 * Ghi dữ liệu báo cáo đã được định dạng vào sheet báo cáo.
 * @param {Array<Array<any>>} reportData - Mảng 2D chứa dữ liệu báo cáo, bao gồm cả tiêu đề.
 */
function db_writeReportData(reportData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let reportSheet = ss.getSheetByName(REPORT_SHEET_NAME);

  if (reportSheet) {
    reportSheet.clear();
  } else {
    reportSheet = ss.insertSheet(REPORT_SHEET_NAME);
  }

  if (reportData.length === 0) {
    reportSheet.getRange(1, 1).setValue("Không có dữ liệu tồn kho để báo cáo.");
    return;
  }
  
  // Ghi dữ liệu
  reportSheet.getRange(1, 1, reportData.length, reportData[0].length).setValues(reportData);

  // Định dạng
  reportSheet.getRange(1, 1, 1, reportData[0].length).setFontWeight('bold').setBackground('#f3f3f3');
  reportSheet.setFrozenRows(1);
  reportSheet.setFrozenColumns(2);
  
  ss.setActiveSheet(reportSheet);
}


/**
 * Reads all data from the master inventory sheet.
 * @returns {{headers: string[], data: any[][]}}
 */
function db_getInventoryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet || sheet.getLastRow() < 3) {
    return { headers: [], data: [] };
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(3, 1, sheet.getLastRow() - 2, sheet.getLastColumn()).getValues();
  return { headers, data };
}

/**
 * Gets unique values for filters from DANH MUC.
 * @returns {{warehouses: string[], areas: string[]}}
 */
function db_getFilterOptionsFromDanhMuc() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) {
        return { warehouses: [], areas: [] };
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
        return { warehouses: [], areas: [] };
    }
    
    const warehouseData = sheet.getRange(`D2:D${lastRow}`).getValues();
    const areaData = sheet.getRange(`C2:C${lastRow}`).getValues(); // Assuming Khu Vuc is in Column C

    const warehouses = [...new Set(warehouseData.map(r => r[0]).filter(Boolean))];
    const areas = [...new Set(areaData.map(r => r[0]).filter(Boolean))];

    return { warehouses, areas };
}