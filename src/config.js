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
  
  menu.addItem('Bảng điều khiển', 'showSidebar');
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
  // Cột 'Ngày Giao Dịch' đã được loại bỏ để khớp với hàm addTransactionToLog trong db.gs
  const logHeaders = ['Timestamp', 'INDEX (SKU)', 'Loại Giao Dịch', 'Tên Sản Phẩm', 'Quy Cách', 'Lô Sản Xuất', 'Ngày Sản Xuất', 'Tình Trạng Chất Lượng', 'Số Lượng', 'Đơn Vị Sản Xuất', 'Kho', 'Ghi Chú'];
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME) || ss.insertSheet(LOG_SHEET_NAME);
  if (logSheet.getLastRow() === 0) {
    logSheet.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]).setFontWeight('bold');
    logSheet.setFrozenRows(1);
  }

  // 2. Thiết lập sheet View vw_tonkho
  const viewSheet = ss.getSheetByName(VIEW_INVENTORY_SHEET_NAME) || ss.insertSheet(VIEW_INVENTORY_SHEET_NAME);
  viewSheet.clear(); // Luôn xóa để đảm bảo công thức là mới nhất
  // Công thức đã được cập nhật để phản ánh cấu trúc cột mới (12 cột)
  const queryFormula = `=QUERY(${LOG_SHEET_NAME}!A:L, "SELECT D, E, F, G, H, K, SUM(I) WHERE D IS NOT NULL GROUP BY D, E, F, G, H, K LABEL SUM(I) 'Số Lượng Tồn'")`;
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
    ['INDEX (SKU)', 'Loại Giao Dịch', 'Tên Sản Phẩm', 'Quy Cách', 'Lô Sản Xuất', 'Ngày Sản Xuất', 'Tình Trạng Chất Lượng', 'Số Lượng', 'Đơn Vị Sản Xuất', 'Kho', 'Ghi Chú']
  ];
  mainSheet.getRange('A19:K19').setValues(manualEntryHeaders).setFontWeight('bold').setBackground('#f3f3f3');

  ss.setActiveSheet(mainSheet);
  SpreadsheetApp.getUi().alert('Đã cập nhật thành công Trang Chính từ template!');
}
