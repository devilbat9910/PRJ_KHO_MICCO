/**
 * @OnlyCurrentDoc
 * TỆP LOGIC CHÍNH
 * Chứa các hàm xử lý nghiệp vụ của ứng dụng.
 */

//================================================================
// SECTION: HIỂN THỊ VÀ LẤY DỮ LIỆU FORM
//================================================================

function showSidebar() {
  const html = HtmlService.createTemplateFromFile('FormNhapLieu').evaluate().setTitle('📝 Form Nhập/Xuất Kho');
  SpreadsheetApp.getUi().showSidebar(html);
}

function getDropdownData() {
  try {
    return getMasterDataForForm();
  } catch (e) {
    Logger.log(`LỖI trong getDropdownData (logic.js): ${e.message}`);
    throw new Error(`Không thể tải dữ liệu danh mục. Lỗi: ${e.message}`);
  }
}

/**
 * Hàm cầu nối để lấy dữ liệu giao dịch gốc từ LOG để sửa.
 * @param {string} indexValue - Mã INDEX (SKU) cần tra cứu.
 * @returns {object | null} - Dữ liệu chi tiết của giao dịch.
 */
function getDataForEdit(indexValue) {
  try {
    return service_getOriginalTransactionForEdit(indexValue);
  } catch (e) {
    Logger.log(`Lỗi trong getDataForEdit(logic.js): ${e.stack}`);
    throw new Error(`Không thể lấy dữ liệu cho INDEX "${indexValue}". Lỗi: ${e.message}`);
  }
}

//================================================================
// SECTION: XỬ LÝ GIAO DỊCH VÀ CẬP NHẬT KHO
//================================================================

/**
 * Xử lý dữ liệu trực tiếp từ Sidebar.
 * @param {object} formObject - Dữ liệu từ form.
 * @param {boolean} isUpdate - Cờ xác định đây có phải là giao dịch cập nhật không.
 * @param {object} originalTx - Dữ liệu giao dịch gốc (chỉ khi isUpdate = true).
 * @returns {object} - Kết quả thành công hoặc thất bại.
 */
function processFormData(formObject, isUpdate = false, originalTx = null) {
  try {
    let result;
    if (isUpdate) {
      Logger.log("Bắt đầu service_updateTransaction...");
      result = service_updateTransaction(formObject, originalTx);
    } else {
      Logger.log("Bắt đầu service_processSingleTransaction...");
      result = service_processSingleTransaction(formObject);
    }
    Logger.log("Hoàn thành xử lý. Kết quả: " + JSON.stringify(result));

    if (result.success) {
      Logger.log("Bắt đầu updateDashboardRecentTransactions...");
      updateDashboardRecentTransactions();
      Logger.log("Hoàn thành updateDashboardRecentTransactions.");
    }
    
    return result;
  } catch (e) {
    Logger.log(`Lỗi trong processFormData (logic.js): ${e.stack}`);
    return { success: false, message: 'Lỗi: ' + e.message };
  }
}

//================================================================
// SECTION: HIỂN THỊ DỮ LIỆU LÊN TRANG CHÍNH
//================================================================

/**
 * Cập nhật bảng "10 giao dịch gần nhất" trên Trang Chính.
 */
function updateDashboardRecentTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  if (!mainSheet) {
    Logger.log(`Không tìm thấy sheet "${MAIN_SHEET_NAME}" để cập nhật.`);
    return;
  }
  const transactions = service_getRecentTransactions();

  const targetRange = mainSheet.getRange(RECENT_TRANSACTIONS_RANGE);
  targetRange.offset(1, 0, targetRange.getNumRows() - 1).clearContent();
  if (transactions.length > 0 && transactions[0].length > 0) {
    mainSheet.getRange(4, 1, transactions.length, transactions[0].length).setValues(transactions);
  } else {
    Logger.log("Không có giao dịch nào để hiển thị.");
  }
}

/**
 * Xử lý dữ liệu từ bảng NHẬP THỦ CÔNG.
 */
function processManualInputTable() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  if (!mainSheet) {
    ui.alert("Không tìm thấy Trang Chính.");
    return;
  }

  const inputTableRange = mainSheet.getRange(MANUAL_INPUT_RANGE);
  const dataRegion = inputTableRange.offset(1, 0, inputTableRange.getNumRows() - 1);
  const inputData = dataRegion.getValues();
  
  let processedCount = 0;
  const rowsToClear = [];

  inputData.forEach((row, index) => {
    if (row.every(cell => cell === '')) return;

    const transactionObject = {
      loaiGiaoDich: row[1],
      tenSanPham: row[2],
      quyCach: row[3],
      loSanXuat: row[4],
      ngaySanXuat: row[5],
      tinhTrangChatLuong: row[6],
      soLuong: row[7],
      phanXuong: row[8],
      kho: row[9],
      ghiChu: row[10]
    };

    try {
      if (!transactionObject.tenSanPham || !transactionObject.soLuong || !transactionObject.ngaySanXuat || !transactionObject.kho) {
        throw new Error("Thiếu các trường bắt buộc.");
      }
      
      service_processSingleTransaction(transactionObject);
      processedCount++;
      rowsToClear.push(index + 1);

    } catch (e) {
      const errorCell = dataRegion.getCell(index + 1, 1);
      errorCell.setBackground("#f4cccc").setNote(`Lỗi: ${e.message}`);
    }
  });

  if (processedCount > 0) {
     rowsToClear.reverse().forEach(relativeRowIndex => {
        const absoluteRowIndex = inputTableRange.getRow() + relativeRowIndex;
        mainSheet.deleteRow(absoluteRowIndex);
     });
     ui.alert(`Hoàn tất xử lý. ${processedCount} giao dịch đã được ghi nhận.`);
  } else {
     ui.alert("Không có giao dịch nào được xử lý.");
  }
  updateDashboardRecentTransactions();
}

//================================================================
// SECTION: BÁO CÁO & CHỐT SỔ
//================================================================

function createMonthlySnapshot() {
  const ui = SpreadsheetApp.getUi();
  try {
    const result = service_createMonthlySnapshot();
    ui.alert(result.message);
  } catch (e) {
    Logger.log(`Lỗi khi tạo snapshot: ${e.stack}`);
    ui.alert(`Đã xảy ra lỗi: ${e.message}`);
  }
}

function generateMonthlyReport() {
  const ui = SpreadsheetApp.getUi();
  try {
    const result = service_generateMonthlyReport();
    ui.alert(result.message);
  } catch (e) {
    Logger.log(`Lỗi khi tạo báo cáo: ${e.stack}`);
    ui.alert(`Đã xảy ra lỗi khi tạo báo cáo: ${e.message}`);
  }
}

//================================================================
// SECTION: TRA CỨU
//================================================================

function showTraCuuDialog() {
  const html = HtmlService.createHtmlOutputFromFile('TraCuu')
    .setWidth(1200)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, '📊 Tra Cứu Tồn Kho');
}

function logic_performSearch(searchCriteria) {
  try {
    return service_performSearch(searchCriteria);
  } catch (e) {
    Logger.log(`Lỗi trong logic_performSearch: ${e.stack}`);
    return { success: false, message: e.message };
  }
}

function showTraCuuDialogForEdit() {
  const t = HtmlService.createTemplateFromFile('TraCuu');
  t.mode = 'edit';
  const html = t.evaluate().setWidth(1200).setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, '📊 Chọn Giao Dịch Cần Sửa');
}

function passDataToOpener(data) {
  const cache = CacheService.getUserCache();
  const key = 'edit_data_' + Session.getEffectiveUser().getEmail();
  cache.put(key, JSON.stringify(data), 60);
  Logger.log("Đã lưu dữ liệu để sửa vào cache.");
}

function checkForEditData() {
  const cache = CacheService.getUserCache();
  const key = 'edit_data_' + Session.getEffectiveUser().getEmail();
  const data = cache.get(key);
  if (data) {
    cache.remove(key);
    return JSON.parse(data);
  }
  return null;
}
