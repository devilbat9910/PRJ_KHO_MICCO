/**
 * @OnlyCurrentDoc
 * TỆP CẤU HÌNH VÀ THIẾT LẬP
 * Chứa các biến toàn cục và các hàm chạy một lần.
 */

// --- BIẾN CẤU HÌNH ---
const CONFIG_SHEET_NAME = 'DANH MUC';
const INVENTORY_SHEET_NAME = 'TON_KHO_HIEN_TAI';
const HISTORY_SHEET_PREFIX = 'LichSu_';
const SNAPSHOT_SHEET_PREFIX = 'Snapshot_';
const REPORT_SHEET_NAME = 'BaoCaoTonKho';
const MAIN_SHEET_NAME = 'Trang Chính';
const VIEW_INVENTORY_SHEET_NAME = 'vw_tonkho'; // Tên sheet View
const LOG_SHEET_NAME = 'LOG_GIAO_DICH_tbl';
const INPUT_SHEET_NAME = 'INPUT';

// --- Tọa độ bảng trên Trang Chính & Sheet INPUT ---
const RECENT_TRANSACTIONS_RANGE = 'A27:K38'; // Header ở dòng 27, 11 dòng data (28-38) trên sheet INPUT
const MANUAL_INPUT_RANGE = 'A2:K23';      // Vùng nhập liệu thủ công trên sheet INPUT. Header ở dòng 2.

/**
 * Tạo menu tùy chỉnh khi mở file Google Sheets.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('📦 Quản Lý Kho');
  
  menu.addItem('Mở Form Nhập Liệu', 'showSidebar');
  menu.addItem('Mở Dialog Tra Cứu', 'showTraCuuDialog');
  menu.addSeparator();

  const utilitiesMenu = ui.createMenu('Tiện Ích');
  utilitiesMenu.addItem('Xử lý dữ liệu từ sheet INPUT', 'processInputSheet');
  menu.addSubMenu(utilitiesMenu);
  
  const reportMenu = ui.createMenu('Báo Cáo & Chốt Sổ');
  reportMenu.addItem('Tạo Báo Cáo Tồn Kho Tháng', 'generateMonthlyReport');
  reportMenu.addItem('Chốt Sổ Cuối Tháng', 'createMonthlySnapshot');
  menu.addSubMenu(reportMenu);
  
  menu.addSeparator();
  
  const helpMenu = ui.createMenu('⚙️ Trợ giúp & Cài đặt');
  helpMenu.addItem('Tạo/Mở Tài liệu Dự án', 'createOrOpenDocumentation');
  helpMenu.addItem('Tạo/Cập nhật Dashboard', 'createIntegratedDashboard');
  helpMenu.addSeparator();
  helpMenu.addItem('Bảo vệ Sheet Dữ liệu', 'protectDataSheets');
  helpMenu.addItem('Thiết lập cấu trúc (Chạy 1 lần)', 'setupInitialStructure');
  menu.addSubMenu(helpMenu);

  menu.addToUi();
}

/**
 * Internal function to ensure the inventory sheet has the correct structure.
 * This is the core logic without UI alerts.
 * @returns {boolean} - True if structure is valid or fixed, false on critical error.
 */
function _ensureCorrectStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const MASTER_INVENTORY_SHEET = 'TON_KHO_tonghop';
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) {
    Logger.log(`Lỗi: Không tìm thấy sheet "${MASTER_INVENTORY_SHEET}".`);
    return false;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let structureUpdated = false;

  // --- 1. Ensure _IsVisible column exists ---
  const techColumnHeader = '_IsVisible';
  if (!headers.includes(techColumnHeader)) {
    const newColumnPosition = headers.length + 1;
    sheet.getRange(1, newColumnPosition).setValue(techColumnHeader);
    const techFormula = `=ARRAYFORMULA(IF(A3:A="";;SUBTOTAL(103;A3:A)))`;
    sheet.getRange(3, newColumnPosition).setFormula(techFormula);
    sheet.hideColumns(newColumnPosition);
    Logger.log(`Cấu trúc đã được cập nhật. Cột kỹ thuật "${techColumnHeader}" đã được thêm vào.`);
    structureUpdated = true;
  }

  // --- 2. Ensure QC_Status column has correct data validation ---
  const qcStatusHeader = 'QC_Status';
  const qcStatusColIndex = headers.indexOf(qcStatusHeader);
  if (qcStatusColIndex !== -1) {
    const allowedValues = ['Đạt', 'Chờ kết quả', 'Mẫu lưu'];
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(allowedValues, true)
      .setAllowInvalid(false) // Disallow other values
      .build();
    // Apply rule from row 3 to the end of the sheet
    sheet.getRange(3, qcStatusColIndex + 1, sheet.getMaxRows() - 2).setDataValidation(rule);
    Logger.log(`Đã cập nhật quy tắc xác thực dữ liệu cho cột "${qcStatusHeader}".`);
    structureUpdated = true;
  }
  
  return true; // Always return true if sheet exists
}

/**
 * User-facing function to set up the structure. Acts as a wrapper for the core logic.
 */
function setupInitialStructure() {
  const ui = SpreadsheetApp.getUi();
  let messages = [];

  // --- Fix 1: TON_KHO_tonghop ---
  if (_ensureCorrectStructure()) {
    messages.push('- Cấu trúc sheet "TON_KHO_tonghop" đã được kiểm tra và cập nhật.');
  } else {
    ui.alert('Lỗi nghiêm trọng: Không tìm thấy sheet "TON_KHO_tonghop".');
    return;
  }

  // --- Fix 2: Trang Chính (RECENT table data validation) ---
  try {
    const mainSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MAIN_SHEET_NAME);
    if (mainSheet) {
      const headers = mainSheet.getRange('A3:K3').getValues()[0];
      const qcStatusColIndex = headers.indexOf('Tình Trạng Chất Lượng');
      
      if (qcStatusColIndex !== -1) {
        const allowedValues = ['Đạt', 'Chờ kết quả', 'Mẫu lưu'];
        const rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(allowedValues, true)
          .setAllowInvalid(false)
          .build();
        // Apply from row 4 to the end of the table
        mainSheet.getRange(4, qcStatusColIndex + 1, 11).setDataValidation(rule);
        messages.push('- Quy tắc xác thực dữ liệu trên "Trang Chính" đã được sửa.');
      }
    }
  } catch (e) {
    messages.push(`- Không thể sửa quy tắc xác thực trên "Trang Chính": ${e.message}`);
  }

  ui.alert('Hoàn tất thiết lập:\n\n' + messages.join('\n'));
}

/**
 * REFACTORED (v6): Sets up the dashboard layout and creates a filter dropdown.
 * The actual data filtering and display is handled by the onEdit trigger.
 */
function createIntegratedDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const dashboardSheetName = 'Dashboard';
  const sourceSheetName = 'TON_KHO_tonghop';

  const sourceSheet = ss.getSheetByName(sourceSheetName);
  if (!sourceSheet) {
    ui.alert(`Lỗi: Không tìm thấy sheet nguồn "${sourceSheetName}".`);
    return;
  }

  let dashboardSheet = ss.getSheetByName(dashboardSheetName);
  if (!dashboardSheet) {
    dashboardSheet = ss.insertSheet(dashboardSheetName, 0);
  }
  
  // --- Setup Layout ---
  dashboardSheet.clear();
  dashboardSheet.getRange('A2').setValue('Lọc theo khu vực kho:').setFontWeight('bold');
  dashboardSheet.getRange('A4').setValue('BẢNG DỮ LIỆU TỒN KHO').setFontWeight('bold');
  
  // --- Create Filter Dropdown ---
  const filterOptions = ['Tất cả', 'Kho ĐT', 'Kho CP'];
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(filterOptions).build();
  dashboardSheet.getRange('B2').setDataValidation(rule).setValue('Tất cả');

  // --- Copy Headers ---
  try {
    const headers = sourceSheet.getRange(1, 1, 2, sourceSheet.getLastColumn()).getValues();
    const headerRange = dashboardSheet.getRange(5, 1, 2, headers[0].length);
    const weights = headers.map(row => row.map(() => 'bold')); // FIX: Create a 2D array of 'bold' strings
    headerRange.setValues(headers).setFontWeights(weights);
  } catch (e) {
    ui.alert(`Lỗi khi sao chép tiêu đề: ${e.message}`);
    return;
  }
  
  // --- Initial Data Load ---
  try {
    _updateDashboardData(dashboardSheet, 'Tất cả');
  } catch (e) {
    ui.alert(`Lỗi khi tải dữ liệu lần đầu: ${e.message}`);
  }

  ss.setActiveSheet(dashboardSheet);
  ui.alert('Dashboard đã được thiết lập. Dữ liệu sẽ được cập nhật khi bạn thay đổi bộ lọc.');
}

/**
 * An onEdit trigger that filters and displays data on the Dashboard sheet.
 * @param {Object} e - The event object.
 */
function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  
  if (sheet.getName() !== 'Dashboard' || range.getA1Notation() !== 'B2') {
    return;
  }
  
  try {
    _updateDashboardData(sheet, e.value);
  } catch (err) {
    SpreadsheetApp.getUi().alert(`Lỗi khi cập nhật dashboard: ${err.message}`);
  }
}

/**
 * Helper function to filter and display data on the dashboard, and dynamically hide/show columns.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dashboardSheet The sheet object for the dashboard.
 * @param {string} filterValue The value to filter by (e.g., 'Tất cả', 'Kho ĐT').
 */
function _updateDashboardData(dashboardSheet, filterValue) {
  const ss = SpreadsheetApp.getActive();
  const sourceSheetName = 'TON_KHO_tonghop';
  const sourceSheet = ss.getSheetByName(sourceSheetName);
  
  if (!sourceSheet) throw new Error(`Không tìm thấy sheet nguồn: ${sourceSheetName}`);

  // --- Step 1: Filter and display data ---
  // Clear old data, starting from row 7
  if (dashboardSheet.getLastRow() >= 7) {
    dashboardSheet.getRange(7, 1, dashboardSheet.getLastRow() - 6, dashboardSheet.getMaxColumns()).clearContent();
  }

  // Get all data from source (from row 3 downwards)
  if (sourceSheet.getLastRow() < 3) return;
  const dataRange = sourceSheet.getRange(3, 1, sourceSheet.getLastRow() - 2, sourceSheet.getLastColumn());
  const allData = dataRange.getValues();

  if (!allData || allData.length === 0) return;

  let filteredData;
  if (!filterValue || filterValue === 'Tất cả') {
    filteredData = allData;
  } else {
    const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    filteredData = allData.filter(row => {
      let hasStockInArea = false;
      for (let i = 0; i < headers.length; i++) {
        if (typeof headers[i] === 'string' && headers[i].startsWith(filterValue)) {
          if (row[i] > 0) {
            hasStockInArea = true;
            break;
          }
        }
      }
      return hasStockInArea;
    });
  }

  if (filteredData && filteredData.length > 0) {
    dashboardSheet.getRange(7, 1, filteredData.length, filteredData[0].length).setValues(filteredData);
  }

  // --- Step 2: Dynamically hide/show columns ---
  const dashboardHeaders = dashboardSheet.getRange(5, 1, 1, dashboardSheet.getLastColumn()).getValues()[0];
  
  // First, show all columns to reset the state
  dashboardSheet.showColumns(1, dashboardSheet.getMaxColumns());

  let hidePrefix = null;
  if (filterValue === 'Kho ĐT') {
    hidePrefix = 'Kho CP';
  } else if (filterValue === 'Kho CP') {
    hidePrefix = 'Kho ĐT';
  }

  if (hidePrefix) {
    dashboardHeaders.forEach((header, index) => {
      if (typeof header === 'string' && header.startsWith(hidePrefix)) {
        dashboardSheet.hideColumns(index + 1);
      }
    });
  }
}


/**
 * Applies protection to the core data sheets to prevent manual edits.
 * This function warns the user and then applies protection, allowing only the script and the owner to edit.
 */
function protectDataSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sheetsToProtect = ['LOG_GIAO_DICH_tbl', 'TON_KHO_tonghop'];
  let protectedSheets = [];

  const response = ui.alert(
    'Xác nhận Bảo vệ Sheet',
    'Hành động này sẽ KHÓA các sheet LOG và TỒN KHO để chống chỉnh sửa thủ công. Chỉ có thể sửa đổi dữ liệu thông qua các chức năng của script.\n\nBạn có muốn tiếp tục không?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    ui.alert('Hành động đã được hủy.');
    return;
  }

  sheetsToProtect.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const protection = sheet.protect().setDescription('Protected by script to ensure data integrity');
      // Ensure the current user is an editor if they are the owner.
      const me = Session.getEffectiveUser();
      protection.addEditor(me);
      // Remove all other editors from the protected range.
      protection.removeEditors(protection.getEditors().filter(editor => editor.getEmail() !== me.getEmail()));
      
      if (protection.canDomainEdit()) {
        protection.setDomainEdit(false);
      }
      protectedSheets.push(sheetName);
    }
  });

  if (protectedSheets.length > 0) {
    ui.alert(`Các sheet sau đã được bảo vệ:\n\n- ${protectedSheets.join('\n- ')}`);
  } else {
    ui.alert('Không tìm thấy sheet nào để bảo vệ.');
  }
}

