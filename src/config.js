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
const MAIN_SHEET_INV_DISPLAY_COL_START = 10;
// CONSTANTS for the new DB layer
const LOG_SHEET_NAME = 'LOG_GIAO_DICH_tbl';

// Thêm hoặc bớt các kho bạn muốn theo dõi tại đây.
const MONITORED_WAREHOUSES = ['Kho ĐT3', 'Kho ĐT4', 'Kho ĐT5', 'Kho ĐT6', 'Kho ĐT7', 'Kho ĐT8', 'Kho ĐT9'];

/**
 * Tạo menu tùy chỉnh khi mở file Google Sheets.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('📦 Quản Lý Kho');
  
  menu.addItem('Mở Form Nhập/Xuất Kho', 'showSidebar');
  menu.addSeparator();
  
  const reportMenu = ui.createMenu('📊 Báo Cáo & Chốt Sổ');
  reportMenu.addItem('Tạo Báo Cáo Tồn Kho Tháng', 'generateMonthlyReport');
  reportMenu.addItem('Chốt Sổ Cuối Tháng', 'createMonthlySnapshot');
  menu.addSubMenu(reportMenu);
  
  menu.addSeparator();
  
  const helpMenu = ui.createMenu('⚙️ Trợ giúp & Cài đặt');
  helpMenu.addItem('Tạo/Mở Tài liệu Dự án', 'createOrOpenDocumentation');
  helpMenu.addItem('Tạo Sheet Template cho Trang Chính', 'createDashboardTemplateSheet');
  helpMenu.addItem('Cập nhật Trang Chính từ Template', 'updateDashboardFromTemplate');
  helpMenu.addSeparator();
  helpMenu.addItem('Thiết lập cấu trúc (Chạy 1 lần)', 'setupInitialStructure');
  menu.addSubMenu(helpMenu);

  menu.addToUi();
}

/**
 * Hàm thiết lập cấu trúc ban đầu cho các sheet.
 */
/**
 * Hàm thiết lập cấu trúc cần thiết cho hệ thống.
 * Sheet 'DANH MUC' sẽ do người dùng quản lý thủ công.
 */
function setupInitialStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // 1. Thiết lập sheet LOG_GIAO_DICH_tbl
  const logHeaders = ['Timestamp', 'INDEX (SKU)', 'Ngày Giao Dịch', 'Loại Giao Dịch', 'Tên Sản Phẩm', 'Quy Cách', 'Lô Sản Xuất', 'Ngày Sản Xuất', 'Tình Trạng Chất Lượng', 'Số Lượng', 'Đơn Vị Sản Xuất', 'Kho', 'Ghi Chú'];
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME) || ss.insertSheet(LOG_SHEET_NAME);
  if (logSheet.getLastRow() === 0) {
    logSheet.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]).setFontWeight('bold');
    logSheet.setFrozenRows(1);
  }

  // 2. Thiết lập sheet View vw_tonkho
  const viewSheet = ss.getSheetByName(VIEW_INVENTORY_SHEET_NAME) || ss.insertSheet(VIEW_INVENTORY_SHEET_NAME);
  viewSheet.clear(); // Luôn xóa để đảm bảo công thức là mới nhất
  const queryFormula = `=QUERY(${LOG_SHEET_NAME}!A:M, "SELECT E, F, G, H, I, L, SUM(J) WHERE E IS NOT NULL GROUP BY E, F, G, H, I, L LABEL SUM(J) 'Số Lượng Tồn'")`;
  viewSheet.getRange('A1').setFormula(queryFormula);
  
  // 3. Xóa sheet TỒN KHO HIỆN TẠI cũ (nếu có)
  const oldInventorySheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
  if (oldInventorySheet) {
    ss.deleteSheet(oldInventorySheet);
  }

  ui.alert('Thiết lập cấu trúc các sheet hệ thống thành công!');
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
    'Ngày Giao Dịch', 'Loại Giao Dịch', 'Tên Sản Phẩm', 'Quy Cách', 'Lô Sản Xuất', 'Số Lượng', 'Tình Trạng Chất Lượng', 'Đơn Vị Sản Xuất', 'Kho', 'Ghi Chú'
  ];
  mainSheet.getRange('A18:J18').setValues([manualEntryHeaders]).setFontWeight('bold').setBackground('#f3f3f3');

  ss.setActiveSheet(mainSheet);
  SpreadsheetApp.getUi().alert('Đã cập nhật thành công Trang Chính từ template!');
}
