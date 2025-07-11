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
  
  const timestamp = new Date();
  timestamp.setHours(timestamp.getHours() + 14);
  logSheet.appendRow([
    timestamp,
    txObject.sku,
    txObject.loaiGiaoDich,
    txObject.tenSanPham,
    txObject.quyCach,
    txObject.loSanXuat,
    txObject.ngaySanXuat,
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

  const data = sheet.getRange(`A2:E${lastRow}`).getValues();

  const productMap = {};
  const warehouses = new Set();
  const factories = new Set();

  data.forEach(row => {
    const fullName = row[0];
    const shortName = row[1];
    const factory = row[2];
    const warehouse = row[3];
    const lotCode = row[4] ? row[4].toString() : '';

    if (fullName) {
      productMap[fullName] = {
        shortName: shortName,
        lotCode: lotCode
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
    productMap,
    productDropdown,
    warehouses: [...warehouses],
    factories: [...factories]
  };
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
  const warehouseData = sheet.getRange(`D2:D${lastRow}`).getValues();
  const warehouseSet = new Set();
  warehouseData.forEach(row => {
    if (row[0]) {
      warehouseSet.add(row[0].toString().trim());
    }
  });
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
  
  reportSheet.getRange(1, 1, reportData.length, reportData[0].length).setValues(reportData);

  reportSheet.getRange(1, 1, 1, reportData[0].length).setFontWeight('bold').setBackground('#f3f3f3');
  reportSheet.setFrozenRows(1);
  reportSheet.setFrozenColumns(2);
  
  ss.setActiveSheet(reportSheet);
}

/**
 * Finds a transaction in the LOG sheet by its INDEX (SKU) to get original data for editing.
 * @param {string} sku - The INDEX (SKU) to search for.
 * @returns {object | null} An object representing the transaction row, or null if not found.
 */
function db_getTransactionLogBySku(sku) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet || logSheet.getLastRow() < 2) return null;

  const skuCol = 2; // Column B is INDEX (SKU)
  const data = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, logSheet.getLastColumn()).getValues();
  
  // Find the last transaction with this SKU, as it's the most recent one
  const targetRow = data.reverse().find(row => row[skuCol - 1] === sku);
  if (!targetRow) return null;

  const headers = ['timestamp', 'sku', 'loaiGiaoDich', 'tenSanPham', 'quyCach', 'loSanXuat', 'ngaySanXuat', 'tinhTrangChatLuong', 'soLuong', 'phanXuong', 'kho', 'ghiChu'];
  const txObject = {};
  headers.forEach((header, i) => {
    txObject[header] = targetRow[i];
  });
  
  return txObject;
}

/**
 * Updates a specific row in the LOG sheet identified by the INDEX.
 * @param {string} index - The INDEX of the row to update.
 * @param {object} formObject - The new data object from the form.
 * @param {string} updateNote - The detailed note of changes.
 */
function db_updateLogEntry(index, formObject, updateNote) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet || logSheet.getLastRow() < 2) return;

  const indexCol = 2; // Column B is INDEX
  const indexValues = logSheet.getRange(2, indexCol, logSheet.getLastRow() - 1, 1).getValues();
  
  const rowIndexInArray = indexValues.findIndex(row => row[0] === index);
  if (rowIndexInArray === -1) {
    throw new Error(`Không thể cập nhật log: Không tìm thấy INDEX ${index} để cập nhật.`);
  }

  const targetRowOnSheet = rowIndexInArray + 2;
  
  const originalData = logSheet.getRange(targetRowOnSheet, 1, 1, 12).getValues()[0];

  const newRowData = [
    originalData[0],
    formObject.index || originalData[1],
    formObject.loaiGiaoDich || originalData[2],
    formObject.tenSanPham || originalData[3],
    formObject.quyCach || originalData[4],
    formObject.loSanXuat || originalData[5],
    formObject.ngaySanXuat ? new Date(formObject.ngaySanXuat) : originalData[6],
    formObject.tinhTrangChatLuong || originalData[7],
    formObject.soLuong || originalData[8],
    formObject.phanXuong || originalData[9],
    formObject.kho || originalData[10],
    updateNote
  ];

  logSheet.getRange(targetRowOnSheet, 1, 1, newRowData.length).setValues([newRowData]);
}