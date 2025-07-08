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
  // REFACTORED: This function now acts as a simple bridge to the service layer.
  try {
    return getMasterDataForForm();
  } catch (e) {
    Logger.log(`LỖI trong getDropdownData (logic.js): ${e.message}`);
    throw new Error(`Không thể tải dữ liệu danh mục. Lỗi: ${e.message}`);
  }
}

// Bridge function for the new lot number suggestion service
function suggestLotNumber(productShortName, factory, dateStr) {
  try {
    return suggestLotNumber(productShortName, factory, dateStr);
  } catch (e) {
    Logger.log(`Lỗi trong suggestLotNumber (logic.js): ${e.message}`);
    return ""; // Return empty string on error
  }
}

//================================================================
// SECTION: XỬ LÝ GIAO DỊCH VÀ CẬP NHẬT KHO
//================================================================

// DEPRECATED: This function is moved to service.gs
/*
function generateSku(txObject) {
    ...
}
*/


// DEPRECATED: This function is now handled by service.gs and db.gs
/*
function recordTransaction(txObject) {
  ...
}
*/

function processFormData(formObject) {
  // REFACTORED: This function now acts as a simple bridge to the service layer.
  try {
    // The actual logic is now in service.gs
    return processTransaction(formObject);
  } catch (e) {
    Logger.log(`Lỗi trong processFormData (logic.js): ${e.message}`);
    return { success: false, message: 'Lỗi: ' + e.message };
  }
}

// DEPRECATED: This entire function is replaced by the vw_tonkho sheet.
/*
function updateInventory(data) {
  ...
}
*/

// DEPRECATED: This function needs to be refactored to use the service layer.
/*
function processManualEntry() {
  ...
}
*/

//================================================================
// SECTION: HIỂN THỊ DỮ LIỆU LÊN TRANG CHÍNH
//================================================================

// DEPRECATED: This function should be refactored to read from LOG_GIAO_DICH_tbl via the service layer.
/*
function displayRecentTransactions() {
 ...
}
*/

// Các hàm báo cáo và chốt sổ cần được viết lại để tương thích với cấu trúc dữ liệu mới.
function createMonthlySnapshot() {
  SpreadsheetApp.getUi().alert('Chức năng này đang được cập nhật để tương thích với cấu trúc dữ liệu mới.');
}
function generateMonthlyReport() {
  SpreadsheetApp.getUi().alert('Chức năng này đang được cập nhật để tương thích với cấu trúc dữ liệu mới.');
}
