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
    // Gọi thẳng vào service layer để xử lý
    const result = service_processSingleTransaction(formObject);
    
    // Nếu xử lý thành công, cập nhật bảng RECENT
    if (result.success) {
      updateDashboardRecentTransactions();
    }
    
    return result;
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
  targetRange.offset(1, 0, targetRange.getNumRows() - 1).clearContent(); // Xóa dữ liệu cũ, giữ header
  if (transactions.length > 0) {
    mainSheet.getRange(4, 1, transactions.length, transactions[0].length).setValues(transactions);
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
    // Bỏ qua nếu hàng trống (chỉ kiểm tra các cột quan trọng)
    if (!row[2] && !row[6]) { // Tên SP và Số lượng
      return;
    }

    // Ánh xạ cột chính xác theo header mới (bỏ qua cột A: INDEX)
    const transactionObject = {
      loaiGiaoDich: row[1],       // Cột B
      tenSanPham: row[2],         // Cột C
      quyCach: row[3],            // Cột D
      loSanXuat: row[4],          // Cột E
      ngaySanXuat: row[5],        // Cột F
      tinhTrangChatLuong: row[6], // Cột G
      soLuong: row[7],            // Cột H
      phanXuong: row[8],          // Cột I
      kho: row[9],                // Cột J
      ghiChu: row[10]             // Cột K
    };

    try {
      // Thêm validation cơ bản
      if (!transactionObject.tenSanPham || !transactionObject.soLuong || !transactionObject.ngaySanXuat || !transactionObject.phanXuong || !transactionObject.kho) {
        throw new Error("Thiếu các trường thông tin bắt buộc (Sản phẩm, Số lượng, Ngày SX, Phân xưởng, Kho).");
      }
      
      service_processSingleTransaction(transactionObject);
      processedCount++;
      // Đánh dấu hàng để xóa sau khi xử lý thành công
      const relativeRow = index + 1; // Vị trí tương đối trong vùng dữ liệu
      const cellToClear = dataRegion.getCell(relativeRow, 1);
      cellToClear.setValue('✔ Đã xử lý'); // Đánh dấu trực quan
      rowsToClear.push(relativeRow);

    } catch (e) {
      const errorCell = dataRegion.getCell(index + 1, 1); // Cột A của dòng hiện tại
      errorCell.setBackground("#f4cccc").setNote(`Lỗi: ${e.message}`);
    }
  });

  // Xóa các hàng đã xử lý thành công (cách tiếp cận an toàn hơn)
  if (processedCount > 0) {
     ui.alert(`Hoàn tất xử lý. ${processedCount} giao dịch đã được ghi nhận. Các hàng đã xử lý sẽ được xóa.`);
     // Xóa các hàng từ dưới lên để tránh thay đổi chỉ số
     rowsToClear.reverse().forEach(relativeRowIndex => {
        const absoluteRowIndex = inputTableRange.getRow() + relativeRowIndex;
        mainSheet.deleteRow(absoluteRowIndex);
     });
  } else {
     ui.alert("Không có giao dịch nào được xử lý. Vui lòng kiểm tra lại dữ liệu và các ghi chú lỗi (nếu có).");
  }

  // Cập nhật lại bảng giao dịch gần nhất
  updateDashboardRecentTransactions();
}

// Các hàm báo cáo và chốt sổ cần được viết lại để tương thích với cấu trúc dữ liệu mới.
function createMonthlySnapshot() {
  SpreadsheetApp.getUi().alert('Chức năng này đang được cập nhật để tương thích với cấu trúc dữ liệu mới.');
}
function generateMonthlyReport() {
  SpreadsheetApp.getUi().alert('Chức năng này đang được cập nhật để tương thích với cấu trúc dữ liệu mới.');
}
