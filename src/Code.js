/**
 * @OnlyCurrentDoc
 */

// --- Main & Orchestration Functions ---

/**
 * Hàm chính, điều phối toàn bộ quy trình xử lý.
 * Được kích hoạt thủ công từ menu của Google Sheets.
 */
function mainProcess() {
  const inputData = getSheetData('INPUT');
  const danhMucData = getSheetData('DANH MUC');

  if (inputData.length === 0) {
    showToast('Không có dữ liệu mới trong trang INPUT.');
    return;
  }

  const result = processTransactions(inputData, danhMucData);

  let summary = `Hoàn tất xử lý. ${result.processed} dòng đã được xử lý.`;
  if (result.errors.length > 0) {
    summary += `\nLỗi: ${result.errors.length} dòng không thể xử lý: ${result.errors.join(', ')}`;
  }
  showToast(summary);
}

/**
 * Lặp qua từng giao dịch từ trang INPUT và xử lý chúng.
 * @param {Array<Object>} inputData - Mảng các đối tượng giao dịch từ trang INPUT.
 * @param {Array<Object>} danhMucData - Mảng các đối tượng sản phẩm từ trang DANH MUC.
 * @returns {{processed: number, errors: Array<string>}} - Một đối tượng chứa tóm tắt kết quả.
 */
function processTransactions(inputData, danhMucData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('LOG');
  const dbSheet = ss.getSheetByName('DATABASE');
  const inputSheet = ss.getSheetByName('INPUT');

  const logColumnMap = getColumnIndexMap(logSheet);
  const dbColumnMap = getColumnIndexMap(dbSheet);
  const danhMucColumnMap = getColumnIndexMap(ss.getSheetByName('DANH MUC'));
  const inputColumnMap = getColumnIndexMap(inputSheet);


  const errors = [];
  const processedRows = [];
  let processedCount = 0;

  inputData.forEach((row, index) => {
    try {
      const maSanPham = row[Object.keys(inputColumnMap).find(key => key.toUpperCase() === 'MÃ SẢN PHẨM')];
      const soLuong = row[Object.keys(inputColumnMap).find(key => key.toUpperCase() === 'SỐ LƯỢNG')];
      const loai = row[Object.keys(inputColumnMap).find(key => key.toUpperCase() === 'LOẠI')];

      if (!maSanPham) {
        throw new Error(`Hàng ${index + 2}: Mã sản phẩm trống.`);
      }

      const product = findProductInCatalog(maSanPham, danhMucData, danhMucColumnMap);
      if (!product) {
        throw new Error(`Không tìm thấy sản phẩm với mã: ${maSanPham}`);
      }

      logTransaction(row, logSheet, logColumnMap, inputColumnMap);
      updateDatabase(product, soLuong, loai, dbSheet, dbColumnMap, danhMucColumnMap);

      processedRows.push(index + 2); // +2 because data starts from row 2
      processedCount++;
    } catch (e) {
      errors.push(e.message);
    }
  });

  if (processedRows.length > 0) {
    clearInputSheet(processedRows);
  }


  return { processed: processedCount, errors: errors };
}


// --- Data Handling Functions ---

/**
 * Đọc toàn bộ dữ liệu từ một sheet được chỉ định (từ hàng 2 trở đi) và chuyển đổi nó thành một mảng các đối tượng.
 * @param {string} sheetName - Tên của sheet cần đọc (ví dụ: "INPUT", "DANH MUC").
 * @returns {Array<Object>} - Mảng các đối tượng, mỗi đối tượng đại diện cho một hàng.
 */
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values.shift();
  return values.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

/**
 * Tạo một bản đồ (map) từ tên tiêu đề cột sang chỉ số cột (1-based).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Đối tượng sheet của Google Apps Script.
 * @returns {Object} - Một đối tượng map, ví dụ: { "Mã Sản Phẩm": 2, "Số Lượng": 4 }.
 */
function getColumnIndexMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columnMap = {};
  headers.forEach((header, i) => {
    if (header) {
      columnMap[header] = i + 1;
    }
  });
  return columnMap;
}

/**
 * Tìm kiếm một sản phẩm trong dữ liệu danh mục dựa trên mã sản phẩm.
 * @param {string} productId - Mã sản phẩm cần tìm.
 * @param {Array<Object>} catalogData - Dữ liệu từ trang DANH MUC.
 * @param {Object} catalogColumnMap - Bản đồ cột của trang DANH MUC.
 * @returns {Object|null} - Đối tượng sản phẩm nếu tìm thấy, null nếu không.
 */
function findProductInCatalog(productId, catalogData, catalogColumnMap) {
    const maSanPhamKey = Object.keys(catalogColumnMap).find(key => key.toUpperCase() === 'MÃ SẢN PHẨM');
    return catalogData.find(product => product[maSanPhamKey] == productId) || null;
}


// --- Sheet Interaction Functions ---

/**
 * Ghi một giao dịch đã xử lý vào trang LOG.
 * @param {Object} transactionObject - Đối tượng giao dịch cần ghi.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} logSheet - Đối tượng sheet LOG.
 * @param {Object} logColumnMap - Bản đồ cột của trang LOG.
 * @param {Object} inputColumnMap - Bản đồ cột của trang INPUT.
 */
function logTransaction(transactionObject, logSheet, logColumnMap, inputColumnMap) {
  const newRow = [];
  const timestampKey = Object.keys(inputColumnMap).find(key => key.toUpperCase() === 'TIMESTAMP');
  const maSanPhamKey = Object.keys(inputColumnMap).find(key => key.toUpperCase() === 'MÃ SẢN PHẨM');
  const tenSanPhamKey = Object.keys(inputColumnMap).find(key => key.toUpperCase() === 'TÊN SẢN PHẨM');
  const soLuongKey = Object.keys(inputColumnMap).find(key => key.toUpperCase() === 'SỐ LƯỢNG');
  const loaiKey = Object.keys(inputColumnMap).find(key => key.toUpperCase() === 'LOẠI');
  const nguoiThucHienKey = Object.keys(inputColumnMap).find(key => key.toUpperCase() === 'NGƯỜI THỰC HIỆN');

  newRow[logColumnMap['Timestamp'] - 1] = transactionObject[timestampKey] || new Date();
  newRow[logColumnMap['Mã Sản Phẩm'] - 1] = transactionObject[maSanPhamKey];
  newRow[logColumnMap['Tên Sản Phẩm'] - 1] = transactionObject[tenSanPhamKey];
  newRow[logColumnMap['Số Lượng'] - 1] = transactionObject[soLuongKey];
  newRow[logColumnMap['Loại'] - 1] = transactionObject[loaiKey];
  newRow[logColumnMap['Người Thực Hiện'] - 1] = transactionObject[nguoiThucHienKey] || Session.getActiveUser().getEmail();

  logSheet.appendRow(newRow);
}

/**
 * Cập nhật số lượng tồn kho trong trang DATABASE.
 * Nếu sản phẩm chưa tồn tại, một hàng mới sẽ được tạo.
 * @param {Object} product - Đối tượng sản phẩm từ DANH MUC.
 * @param {number} quantity - Số lượng để cập nhật.
 * @param {string} type - Loại giao dịch ("Nhập" hoặc "Xuất").
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dbSheet - Đối tượng sheet DATABASE.
 * @param {Object} dbColumnMap - Bản đồ cột của trang DATABASE.
 * @param {Object} danhMucColumnMap - Bản đồ cột của trang DANH MUC.
 */
function updateDatabase(product, quantity, type, dbSheet, dbColumnMap, danhMucColumnMap) {
  const data = dbSheet.getDataRange().getValues();
  const maSanPhamKeyDM = Object.keys(danhMucColumnMap).find(key => key.toUpperCase() === 'MÃ SẢN PHẨM');
  const tenSanPhamKeyDM = Object.keys(danhMucColumnMap).find(key => key.toUpperCase() === 'TÊN SẢN PHẨM');
  const donViKeyDM = Object.keys(danhMucColumnMap).find(key => key.toUpperCase() === 'ĐƠN VỊ');

  const maSanPham = product[maSanPhamKeyDM];
  const soLuongCol = dbColumnMap['Tồn Kho'];

  let productRowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][dbColumnMap['Mã Sản Phẩm'] - 1] == maSanPham) {
      productRowIndex = i + 1;
      break;
    }
  }

  if (productRowIndex !== -1) {
    const currentStock = dbSheet.getRange(productRowIndex, soLuongCol).getValue();
    const newStock = type.toLowerCase() === 'nhập' ? currentStock + quantity : currentStock - quantity;
    dbSheet.getRange(productRowIndex, soLuongCol).setValue(newStock);
  } else {
    const newRow = [];
    newRow[dbColumnMap['Mã Sản Phẩm'] - 1] = maSanPham;
    newRow[dbColumnMap['Tên Sản Phẩm'] - 1] = product[tenSanPhamKeyDM];
    newRow[dbColumnMap['Đơn Vị'] - 1] = product[donViKeyDM];
    newRow[dbColumnMap['Tồn Kho'] - 1] = type.toLowerCase() === 'nhập' ? quantity : -quantity;
    dbSheet.appendRow(newRow);
  }
}

/**
 * Xóa các hàng đã được xử lý thành công khỏi trang INPUT.
 * @param {Array<number>} rowsToClear - Mảng chứa chỉ số của các hàng cần xóa.
 */
function clearInputSheet(rowsToClear) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('INPUT');
  // Xóa từ dưới lên để tránh thay đổi chỉ số hàng
  for (let i = rowsToClear.length - 1; i >= 0; i--) {
    sheet.deleteRow(rowsToClear[i]);
  }
}

// --- User Feedback Functions ---

/**
 * Hiển thị một thông báo tóm tắt (toast) cho người dùng.
 * @param {string} summary - Chuỗi thông báo cần hiển thị.
 */
function showToast(summary) {
  SpreadsheetApp.getActiveSpreadsheet().toast(summary, 'Kết quả xử lý', 10);
}

// --- UI Functions ---

/**
 * Thêm menu tùy chỉnh vào UI khi mở bảng tính.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Quản Lý Kho')
    .addItem('Xử lý Nhập/Xuất', 'mainProcess')
    .addToUi();
}