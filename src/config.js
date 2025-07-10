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

// --- Tọa độ bảng trên Trang Chính ---
const RECENT_TRANSACTIONS_RANGE = 'A3:K14'; // Header ở dòng 3, 11 dòng data (4-14)
const MANUAL_INPUT_RANGE = 'A19:K30';      // Header ở dòng 19, 11 dòng data (20-30)

// Thêm hoặc bớt các kho bạn muốn theo dõi tại đây.
const MONITORED_WAREHOUSES = ['Kho ĐT3', 'Kho ĐT4', 'Kho ĐT5', 'Kho ĐT6', 'Kho ĐT7', 'Kho ĐT8', 'Kho ĐT9'];

/**
 * Tạo menu tùy chỉnh khi mở file Google Sheets.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('📦 Quản Lý Kho');
  
  menu.addItem('Mở Form Nhập Liệu', 'showSidebar');
  menu.addItem('Mở Dialog Tra Cứu', 'showTraCuuDialog');
  menu.addSeparator();
  
  const reportMenu = ui.createMenu('Báo Cáo & Chốt Sổ');
  reportMenu.addItem('Tạo Báo Cáo Tồn Kho Tháng', 'generateMonthlyReport');
  reportMenu.addItem('Chốt Sổ Cuối Tháng', 'createMonthlySnapshot');
  menu.addSubMenu(reportMenu);
  
  menu.addSeparator();
  
  const helpMenu = ui.createMenu('⚙️ Trợ giúp & Cài đặt');
  helpMenu.addItem('Tạo/Mở Tài liệu Dự án', 'createOrOpenDocumentation');
  helpMenu.addItem('Tạo/Cập nhật Dashboard', 'createIntegratedDashboard');
  helpMenu.addSeparator();
  helpMenu.addItem('Thiết lập cấu trúc (Chạy 1 lần)', 'setupInitialStructure');
  menu.addSubMenu(helpMenu);

  menu.addToUi();
}

/**
 * REFACTORED (v3): Hàm thiết lập cấu trúc an toàn, không phá hủy dữ liệu.
 * Tự động đọc danh sách kho, bảo toàn dữ liệu cũ và áp dụng công thức mảng.
 */
/**
 * Internal function to ensure the inventory sheet has the correct structure.
 * This is the core logic without UI alerts.
 * @returns {boolean} - True if structure is valid or fixed, false on critical error.
 */
function _ensureCorrectStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const MASTER_INVENTORY_SHEET = 'TON_KHO_tonghop';
  const techColumnHeader = '_IsVisible';

  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) {
    Logger.log(`Lỗi: Không tìm thấy sheet "${MASTER_INVENTORY_SHEET}".`);
    return false;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (headers.includes(techColumnHeader)) {
    return true; // Structure is already correct.
  }

  // If the column doesn't exist, add it.
  const newColumnPosition = headers.length + 1;
  sheet.getRange(1, newColumnPosition).setValue(techColumnHeader);
  
  const techFormula = `=ARRAYFORMULA(IF(A3:A="",,SUBTOTAL(103,A3:A)))`;
  sheet.getRange(3, newColumnPosition).setFormula(techFormula);
  sheet.hideColumns(newColumnPosition);
  
  Logger.log(`Cấu trúc đã được cập nhật. Cột kỹ thuật "${techColumnHeader}" đã được thêm vào.`);
  return true;
}


/**
 * User-facing function to set up the structure. Acts as a wrapper for the core logic.
 */
function setupInitialStructure() {
  const ui = SpreadsheetApp.getUi();
  if (_ensureCorrectStructure()) {
    ui.alert('Cấu trúc đã được kiểm tra và cập nhật (nếu cần).');
  } else {
    ui.alert('Lỗi nghiêm trọng: Không tìm thấy sheet "TON_KHO_tonghop".');
  }
}

/**
 * Tạo sheet template để người dùng tự thiết kế.
 */
function createDashboardTemplateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheetName = 'TEMPLATE_TRANG_CHINH';
  if (!ss.getSheetByName(templateSheetName)) {
    ss.insertSheet(templateSheetName);
    SpreadsheetApp.getUi().alert(`Đã tạo sheet "${templateSheetName}". Vui lòng thiết kế giao diện mong muốn trên sheet này.`);
  } else {
    SpreadsheetApp.getUi().alert(`Sheet "${templateSheetName}" đã tồn tại.`);
  }
}

/**
 * Cập nhật Trang Chính dựa trên sheet template.
 */
function updateDashboardFromTemplate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const templateSheet = ss.getSheetByName('TEMPLATE_TRANG_CHINH');
  if (!templateSheet) {
    SpreadsheetApp.getUi().alert('Lỗi: Không tìm thấy sheet "TEMPLATE_TRANG_CHINH". Vui lòng tạo nó trước.');
    return;
  }

  let mainSheet = ss.getSheetByName(MAIN_SHEET_NAME);
  if (mainSheet) {
    ss.deleteSheet(mainSheet);
  }
  
  mainSheet = templateSheet.copyTo(ss).setName(MAIN_SHEET_NAME);
  
  // Ghi đè tiêu đề cho bảng nhập thủ công để đảm bảo tính nhất quán
  const manualEntryHeaders = [
    ['INDEX (SKU)', 'Loại Giao Dịch', 'Tên Sản Phẩm', 'Quy Cách', 'Lô Sản Xuất', 'Ngày Sản Xuất', 'Tình Trạng Chất Lượng', 'Số Lượng', 'Đơn Vị Sản Xuất', 'Kho', 'Ghi Chú']
  ];
  mainSheet.getRange('A19:K19').setValues(manualEntryHeaders).setFontWeight('bold').setBackground('#f3f3f3');

  ss.setActiveSheet(mainSheet);
  SpreadsheetApp.getUi().alert('Đã cập nhật thành công Trang Chính từ template!');
}


/**
 * Tạo Dashboard tích hợp với Slicer.
 */
function createIntegratedDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const dashboardSheetName = 'Dashboard';
  const sourceSheetName = 'TON_KHO_tonghop';

  // --- Tự động kiểm tra và sửa lỗi cấu trúc ---
  if (!_ensureCorrectStructure()) {
      ui.alert('Lỗi nghiêm trọng: Không tìm thấy sheet "TON_KHO_tonghop". Không thể tạo dashboard.');
      return;
  }
  SpreadsheetApp.flush(); // Đảm bảo các thay đổi cấu trúc được áp dụng
  // --- Kết thúc kiểm tra ---

  const sourceSheet = ss.getSheetByName(sourceSheetName);

  // Tạo hoặc lấy sheet Dashboard
  let dashboardSheet = ss.getSheetByName(dashboardSheetName);
  if (!dashboardSheet) {
    dashboardSheet = ss.insertSheet(dashboardSheetName, 0);
  }
  dashboardSheet.clear();
  ss.setActiveSheet(dashboardSheet);

  // --- Thiết lập QUERY ---
  const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const isVisibleColIndex = headers.indexOf('_IsVisible') + 1;
  // Check này giờ chỉ là một lớp bảo vệ kép, vì _ensureCorrectStructure đã chạy
  if (isVisibleColIndex === 0) {
      ui.alert('Lỗi không xác định: Không thể tìm thấy cột "_IsVisible" ngay cả sau khi đã cố gắng sửa lỗi.');
      return;
  }
  const isVisibleColLetter = String.fromCharCode('A'.charCodeAt(0) + isVisibleColIndex - 1);
  const queryFormula = `=QUERY('${sourceSheetName}'!A:Z, "SELECT * WHERE ${isVisibleColLetter}=1", 2)`;
  
  dashboardSheet.getRange('A5').setFormula(queryFormula);
  dashboardSheet.getRange('A4').setValue('BẢNG DỮ LIỆU TỒN KHO').setFontWeight('bold');

  // --- Thiết lập Slicer ---
  // Xóa slicer cũ trên sheet (nếu có)
  const slicers = dashboardSheet.getSlicers();
  slicers.forEach(slicer => slicer.remove());

  const dvSxColIndex = headers.indexOf('ĐV_SX') + 1;

  if (dvSxColIndex > 0) {
    // Lấy toàn bộ cột 'ĐV_SX' từ sheet nguồn để tạo Slicer
    const slicerRange = sourceSheet.getRange(1, dvSxColIndex, sourceSheet.getLastRow());
    const slicer = dashboardSheet.insertSlicer(slicerRange);
    slicer.setPosition(2, 1, 0, 0); // Đặt slicer ở ô A2
  } else {
    ui.alert('Không tìm thấy cột "ĐV_SX" để tạo Slicer.');
  }
  
  ui.alert('Đã tạo/cập nhật Dashboard thành công!');
}
