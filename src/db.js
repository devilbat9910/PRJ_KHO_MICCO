/**
 * @OnlyCurrentDoc
 * TỆP TRUY CẬP DỮ LIỆU (DATABASE LAYER) - KIẾN TRÚC NAMED RANGE
 * Chứa các hàm để đọc và ghi dữ liệu từ các vùng được đặt tên (Named Ranges).
 */

/**
 * Hàm trợ giúp chung để đọc một vùng được đặt tên và chuyển thành mảng các đối tượng.
 * @param {string} rangeName Tên của vùng dữ liệu cần đọc.
 * @returns {object[]} Một mảng các đối tượng, mỗi đối tượng đại diện cho một dòng.
 */
function db_getNamedRangeAsObjects(rangeName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const range = ss.getRangeByName(rangeName);
  if (!range) {
    Logger.log(`Cảnh báo: Không tìm thấy vùng được đặt tên "${rangeName}".`);
    return [];
  }
  const values = range.getValues();
  // KIỂM TRA PHÒNG VỆ: Nếu vùng trống hoặc không có header, trả về mảng rỗng.
  if (!values || values.length === 0) {
    return [];
  }
  const headers = values.shift().map(h => h.toString().trim());

  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * Tìm thông tin sản phẩm trong bảng 'Bảng_Sản phẩm'.
 * @param {string} productName Tên sản phẩm cần tìm.
 * @returns {object | null} Đối tượng chứa thông tin sản phẩm, hoặc null nếu không tìm thấy.
 */
function db_findProduct(productName) { // Giá trị đầu vào (productName) thực chất là mã viết tắt.
  // SỬA LỖI CUỐI CÙNG: Khớp chính xác chữ hoa/thường
  const products = db_getNamedRangeAsObjects('Bảng_Sản_Phẩm');
  
  const trimmedInput = productName ? productName.toString().trim().toUpperCase() : '';
  if (!trimmedInput) return null;

  return products.find(p => {
    // Tìm kiếm dựa trên cột 'Viết tắt'
    const dbProductAbbrValue = p['Viết tắt'];
    const dbProductAbbr = dbProductAbbrValue ? dbProductAbbrValue.toString().trim().toUpperCase() : '';
    return dbProductAbbr === trimmedInput;
  }) || null;
}

/**
 * Tìm thông tin kho trong bảng 'Bảng_Danh sách kho'.
 * @param {string} warehouseName Tên kho cần tìm.
 * @returns {object | null} Đối tượng chứa thông tin kho, hoặc null nếu không tìm thấy.
 */
function db_findWarehouse(warehouseCode) { // Input là mã kho, không phải tên.
  const warehouses = db_getNamedRangeAsObjects('Bảng_Danh_Sách_Kho');
  
  const trimmedInput = warehouseCode ? warehouseCode.toString().trim().toUpperCase() : '';
  if (!trimmedInput) return null;

  return warehouses.find(w => {
    // SỬA LỖI: Tìm kiếm dựa trên cột 'Mã kho' thay vì 'Tên kho'.
    const dbWarehouseCodeValue = w['Mã kho'];
    const dbWarehouseCode = dbWarehouseCodeValue ? dbWarehouseCodeValue.toString().trim().toUpperCase() : '';
    return dbWarehouseCode === trimmedInput;
  }) || null;
}

/**
 * Tìm thông tin phân xưởng trong bảng 'Bảng_Mã phân xưởng'.
 * @param {string} factoryCode Mã phân xưởng cần tìm (ví dụ: 'ĐT').
 * @returns {object | null} Đối tượng chứa thông tin phân xưởng, hoặc null nếu không tìm thấy.
 */
function db_findFactory(factoryCode) {
    const factories = db_getNamedRangeAsObjects('Bảng_Mã_Phân_Xưởng');

    const trimmedInput = factoryCode ? factoryCode.toString().trim().toUpperCase() : '';
    if (!trimmedInput) return null;

    return factories.find(f => {
      // Cải thiện logic tìm kiếm cho mạnh mẽ hơn
      const dbFactoryCodeValue = f['Mã phân xưởng'];
      const dbFactoryCode = dbFactoryCodeValue ? dbFactoryCodeValue.toString().trim().toUpperCase() : '';
      return dbFactoryCode === trimmedInput;
    }) || null;
}

/**
 * Lấy các giao dịch gần đây nhất từ sheet LOG.
 * @param {number} numberOfRows Số lượng dòng cần lấy.
 * @returns {Array<Array<any>>} Mảng 2 chiều chứa dữ liệu các dòng gần đây.
 */
function db_getRecentLogs(numberOfRows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('LOG');
  if (!logSheet) {
    Logger.log('Cảnh báo: Không tìm thấy sheet log: "LOG"');
    return [];
  }

  const lastRow = logSheet.getLastRow();
  // Bắt đầu từ dòng 2 để bỏ qua tiêu đề
  const firstRowToGet = Math.max(2, lastRow - numberOfRows + 1);
  if (firstRowToGet > lastRow) {
    return []; // Không có dữ liệu
  }

  const numRowsToGet = lastRow - firstRowToGet + 1;
  // LOG được giả định có 18 cột dựa trên hàm addTransactionToLog
  const range = logSheet.getRange(firstRowToGet, 1, numRowsToGet, 18);
  return range.getValues();
}

/**
 * Tìm một dòng trong một sheet dựa trên giá trị của cột 'maIndex'.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet cần tìm kiếm.
 * @param {string} maIndex - Giá trị maIndex cần tìm.
 * @returns {number} - Số thứ tự dòng (1-based) nếu tìm thấy, ngược lại trả về -1.
 */
function db_findRowByMaIndex(sheet, maIndex) {
  // KIỂM TRA PHÒNG VỆ: Nếu sheet chỉ có header hoặc trống, không có gì để tìm.
  if (sheet.getLastRow() < 2) {
    return -1;
  }
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === maIndex) {
      return i + 2; // +2 vì mảng 0-based và sheet 1-based (bỏ qua header)
    }
  }
  return -1;
}

/**
 * Cập nhật hoặc chèn một dòng vào sheet DATABASE.
 * @param {object} logObject - Đối tượng dữ liệu đã được làm giàu.
 */
function db_upsertToDatabase(logObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName('DATABASE');
  if (!dbSheet) {
    throw new Error('Không tìm thấy sheet "DATABASE". Vui lòng tạo nó.');
  }

  const maIndexToFind = logObject.maIndex;
  const targetRow = db_findRowByMaIndex(dbSheet, maIndexToFind);

  // DATABASE có 17 cột (bỏ timestamp)
  const newRowData = [
    logObject.maIndex, logObject.tenSanPham, logObject.vietTat,
    logObject.quyCach, logObject.soLuong, logObject.ngaySanXuat,
    logObject.donViSanXuat, logObject.maLo, logObject.ngayNhapXuat,
    logObject.maKho, logObject.loaiKho, logObject.khuVuc,
    logObject.tenKho, logObject.tinhTrangChatLuong, logObject.hanSuDung,
    logObject.nhapXuat, logObject.ghiChu
  ];

  if (targetRow !== -1) {
    // CẬP NHẬT: Nếu tìm thấy dòng
    dbSheet.getRange(targetRow, 1, 1, newRowData.length).setValues([newRowData]);
    Logger.log(`Đã cập nhật dòng cho maIndex "${maIndexToFind}" trong DATABASE.`);
  } else {
    // THÊM MỚI: Nếu không tìm thấy
    dbSheet.appendRow(newRowData);
    Logger.log(`Đã thêm dòng mới cho maIndex "${maIndexToFind}" vào DATABASE.`);
  }
}

/**
 * Lấy trạng thái mới nhất của một mã index từ sheet DATABASE.
 * @param {string} maIndex - Mã index cần tra cứu.
 * @returns {object | null} - Đối tượng chứa dữ liệu của dòng, hoặc null nếu không tìm thấy.
 */
function db_getLatestState(maIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName('DATABASE');
  if (!dbSheet) {
    Logger.log('Lỗi: Không tìm thấy sheet "DATABASE" trong db_getLatestState.');
    return null;
  }

  const targetRow = db_findRowByMaIndex(dbSheet, maIndex);
  if (targetRow === -1) {
    return null;
  }

  // Lấy toàn bộ dữ liệu dòng và chuyển thành object
  const headers = dbSheet.getRange(1, 1, 1, dbSheet.getLastColumn()).getValues()[0];
  const values = dbSheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  
  const result = {};
  headers.forEach((header, index) => {
    result[header] = values[index];
  });

  return result;
}

/**
 * Ghi một đối tượng log đã được làm giàu vào sheet `LOG`.
 * @param {object} logObject - Đối tượng chứa đầy đủ 18 trường dữ liệu cho sheet LOG.
 */
function addTransactionToLog(logObject) {
  // Cần đảm bảo hằng số LOG_SHEET_NAME được định nghĩa là 'LOG' trong file config.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('LOG'); 
  
  if (!logSheet) {
    throw new Error('Không tìm thấy sheet log: "LOG"');
  }

  // Sắp xếp dữ liệu theo đúng thứ tự 18 cột của sheet LOG
  const newRow = [
    logObject.maIndex,
    logObject.timestamp,
    logObject.tenSanPham,
    logObject.vietTat,
    logObject.quyCach,
    logObject.soLuong,
    logObject.ngaySanXuat,
    logObject.donViSanXuat,
    logObject.maLo,
    logObject.ngayNhapXuat,
    logObject.maKho,
    logObject.loaiKho,
    logObject.khuVuc,
    logObject.tenKho,
    logObject.tinhTrangChatLuong,
    logObject.hanSuDung,
    logObject.nhapXuat,
    logObject.ghiChu
  ];

  logSheet.appendRow(newRow);
}