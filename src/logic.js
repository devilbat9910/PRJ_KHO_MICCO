/**
 * @OnlyCurrentDoc
 * TỆP LOGIC CHÍNH
 * Chứa các hàm xử lý nghiệp vụ của ứng dụng.
 */

//================================================================
// SECTION: HIỂN THỊ VÀ LẤY DỮ LIỆU FORM
//================================================================

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
 * Cập nhật bảng "10 giao dịch gần nhất" trên sheet INPUT.
 */
function updateDashboardRecentTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // SỬA LỖI: Sử dụng trực tiếp Vùng được đặt tên 'INPUT_RECENT'
  const targetRange = ss.getRangeByName('INPUT_RECENT');

  if (!targetRange) {
    Logger.log('Lỗi: Không tìm thấy Vùng được đặt tên "INPUT_RECENT". Vui lòng tạo nó.');
    return;
  }
  
  // Lấy dữ liệu đã được định dạng
  const recentLogsData = db_getRecentLogs(11); // Lấy 11 dòng gần nhất

  // Ánh xạ dữ liệu từ 18 cột của LOG sang 11 cột của INPUT_RECENT
  const transactions = recentLogsData.map(logRow => {
    return [
      logRow[16],       // Nhập/xuất
      logRow[3],        // Tên sản phẩm -> Viết tắt
      logRow[4],        // Quy cách
      logRow[5],        // Số lượng
      logRow[6],        // Ngày sản xuất
      logRow[7],        // Phân xưởng -> Mã phân xưởng (đã được sửa khi ghi log)
      logRow[10],       // Tên kho -> Mã kho
      logRow[14],       // Tình trạng chất lượng
      logRow[17],       // Ghi chú
      logRow[0],        // Mã index
      logRow[8]         // Mã lô
    ];
  }).reverse(); // Đảo ngược để giao dịch mới nhất ở trên cùng
  
  // Xóa dữ liệu cũ (để lại dòng tiêu đề).
  // KIỂM TRA PHÒNG VỆ: Chỉ xóa nếu có nhiều hơn 1 dòng (có dữ liệu cũ).
  if (targetRange.getNumRows() > 1) {
    const dataRange = targetRange.offset(1, 0, targetRange.getNumRows() - 1);
    dataRange.clearContent();
  }

  if (transactions && transactions.length > 0) {
    // Ghi dữ liệu mới vào vùng, bắt đầu từ dòng thứ 2 (dưới tiêu đề).
    const destinationRange = targetRange.offset(1, 0, transactions.length, transactions[0].length);
    destinationRange.setValues(transactions);
    Logger.log(`Đã cập nhật ${transactions.length} giao dịch gần đây vào vùng INPUT_RECENT.`);
  } else {
    Logger.log("Không có giao dịch gần đây nào để hiển thị.");
  }
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

function logic_performSearch(searchCriteria) {
  try {
    return service_performSearch(searchCriteria);
  } catch (e) {
    Logger.log(`Lỗi trong logic_performSearch: ${e.stack}`);
    return { success: false, message: e.message };
  }
}

function logic_getSkuDetails(sku) {
  try {
    return service_getSkuDetails(sku);
  } catch (e) {
    Logger.log(`Lỗi trong logic_getSkuDetails: ${e.stack}`);
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
