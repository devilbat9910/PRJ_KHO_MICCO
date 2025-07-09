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

// DEPRECATED: Hàm suggestLotNumber đã bị xóa khỏi logic.js để tránh lỗi đệ quy.
// Giao diện sẽ gọi trực tiếp hàm trong service.gs.

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

/**
 * Xử lý dữ liệu trực tiếp từ Sidebar.
 * @param {object} formObject - Dữ liệu từ form.
 * @returns {object} - Kết quả thành công hoặc thất bại.
 */
function processFormData(formObject) {
  try {
    Logger.log("Bắt đầu service_processSingleTransaction...");
    const result = service_processSingleTransaction(formObject);
    Logger.log("Hoàn thành service_processSingleTransaction. Kết quả: " + JSON.stringify(result));

    if (result.success) {
      Logger.log("Bắt đầu updateDashboardRecentTransactions...");
      updateDashboardRecentTransactions();
      Logger.log("Hoàn thành updateDashboardRecentTransactions.");
    }
    
    return result;
  } catch (e) {
    // Ghi lại toàn bộ stack trace để gỡ lỗi chi tiết hơn
    Logger.log(`Lỗi trong processFormData (logic.js): ${e.stack}`);
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

  // --- Thêm log chi tiết để gỡ lỗi ---
  Logger.log("Dữ liệu transactions nhận được: " + JSON.stringify(transactions));
  Logger.log(`Số lượng giao dịch: ${transactions.length}`);
  if (transactions.length > 0) {
    Logger.log(`Số cột của giao dịch đầu tiên: ${transactions[0].length}`);
  }
  // --- Kết thúc log ---

  const targetRange = mainSheet.getRange(RECENT_TRANSACTIONS_RANGE);
  targetRange.offset(1, 0, targetRange.getNumRows() - 1).clearContent(); // Xóa dữ liệu cũ, giữ header
  if (transactions.length > 0 && transactions[0].length > 0) {
    mainSheet.getRange(4, 1, transactions.length, transactions[0].length).setValues(transactions);
  } else {
    Logger.log("Không có giao dịch nào để hiển thị hoặc dữ liệu giao dịch không hợp lệ (0 cột).");
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
    // Bỏ qua hàng trống
    if (row.every(cell => cell === '')) {
      return;
    }

    // Ánh xạ trực tiếp từ cột sang đối tượng, không cần diễn giải thông minh
    const transactionObject = {
      // Cột A trong sheet là INDEX (SKU), bỏ qua khi đọc
      loaiGiaoDich: row[1],
      tenSanPham: row[2],
      quyCach: row[3], // Sẽ được ghi đè bởi thông tin từ DANH MUC trong service layer
      loSanXuat: row[4],
      ngaySanXuat: row[5],
      tinhTrangChatLuong: row[6],
      soLuong: row[7],
      phanXuong: row[8], // Sẽ được ghi đè bởi thông tin từ DANH MUC
      kho: row[9],
      ghiChu: row[10]
    };

    try {
      // Validation cơ bản ở tầng này
      if (!transactionObject.tenSanPham || !transactionObject.soLuong || !transactionObject.ngaySanXuat || !transactionObject.kho) {
        throw new Error("Thiếu các trường bắt buộc: Tên Sản Phẩm, Số Lượng, Ngày Sản Xuất, Kho.");
      }
      
      service_processSingleTransaction(transactionObject);
      processedCount++;
      
      // Đánh dấu hàng để xóa sau khi xử lý thành công
      const relativeRow = index + 1;
      rowsToClear.push(relativeRow);

    } catch (e) {
      const errorCell = dataRegion.getCell(index + 1, 1); // Cột A của dòng hiện tại
      errorCell.setBackground("#f4cccc").setNote(`Lỗi: ${e.message}`);
    }
  });

  // Xóa các hàng đã xử lý thành công
  if (processedCount > 0) {
     // Xóa các hàng từ dưới lên để tránh thay đổi chỉ số
     rowsToClear.reverse().forEach(relativeRowIndex => {
        const absoluteRowIndex = inputTableRange.getRow() + relativeRowIndex;
        mainSheet.deleteRow(absoluteRowIndex);
     });
     ui.alert(`Hoàn tất xử lý. ${processedCount} giao dịch đã được ghi nhận và xóa khỏi bảng nhập liệu.`);
  } else {
     ui.alert("Không có giao dịch nào được xử lý. Vui lòng kiểm tra lại dữ liệu và các ghi chú lỗi (nếu có).");
  }

  // Cập nhật lại bảng giao dịch gần nhất
  updateDashboardRecentTransactions();
}

// Các hàm báo cáo và chốt sổ cần được viết lại để tương thích với cấu trúc dữ liệu mới.
/**
 * Hàm cầu nối để gọi dịch vụ tạo snapshot tồn kho hàng tháng.
 */
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
/**
 * Hàm cầu nối để gọi dịch vụ tạo báo cáo tồn kho.
 */
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
