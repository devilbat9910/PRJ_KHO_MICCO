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
  menu.addItem('Tra Cứu Tồn Kho', 'showTraCuuDialog');
  menu.addSeparator();
  
  const reportMenu = ui.createMenu('Báo Cáo & Chốt Sổ');
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
 * REFACTORED: Hàm thiết lập cấu trúc theo template cố định mới cho "TON_KHO_tonghop".
 * Xóa các sheet tồn kho cũ và tạo lại sheet ma trận với các cột và công thức được định nghĩa trước.
 */
function setupInitialStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // 1. Định nghĩa cấu trúc CỐ ĐỊNH cho sheet Tồn Kho Tổng Hợp
  const MASTER_INVENTORY_SHEET = 'TON_KHO_tonghop';
  const fullHeaders = [[
    'INDEX', 'Tên_SP', 'Quy_Cách', 'Lô_SX', 'Ngày_SX', 'QC_Status', 'ĐV_SX',
    'ĐT3', 'ĐT4', 'ĐT5', 'ĐT6', 'ĐT7', 'ĐT8', 'ĐT9',
    'Tổng_ĐT', 'CP4'
  ]];
  const identifierColumnCount = 7; // Số cột định danh
  const totalColumnPosition = 15; // Vị trí cột O (Tổng_ĐT)

  // 2. Tạo hoặc làm mới sheet Tồn Kho Tổng Hợp
  let inventorySheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (inventorySheet) {
    inventorySheet.clear();
  } else {
    inventorySheet = ss.insertSheet(MASTER_INVENTORY_SHEET);
  }

  // 3. Ghi tiêu đề và định dạng
  const headerRange = inventorySheet.getRange(1, 1, 1, fullHeaders[0].length);
  headerRange.setValues(fullHeaders).setFontWeight('bold').setBackground('#f3f3f3');

  // 3a. Thêm hàng tổng cộng và đặt công thức
  const totalRowRange = inventorySheet.getRange('H2:O2');
  const warehouseFormulas = [
    '=IFERROR(SUM(H3:H))', // H2
    '=IFERROR(SUM(I3:I))', // I2
    '=IFERROR(SUM(J3:J))', // J2
    '=IFERROR(SUM(K3:K))', // K2
    '=IFERROR(SUM(L3:L))', // L2
    '=IFERROR(SUM(M3:M))', // M2
    '=IFERROR(SUM(N3:N))', // N2
    '=IFERROR(SUM(H2:N2))'  // O2
  ];
  totalRowRange.setFormulas([warehouseFormulas]);
  inventorySheet.getRange('G2').setValue('TỔNG CỘNG').setFontWeight('bold').setHorizontalAlignment('right');
  
  inventorySheet.setFrozenColumns(identifierColumnCount);
  inventorySheet.setFrozenRows(2); // Cố định cả tiêu đề và hàng tổng

  // 5. Xóa các sheet tồn kho cũ không còn sử dụng
  const oldViewSheet = ss.getSheetByName(VIEW_INVENTORY_SHEET_NAME);
  if (oldViewSheet) ss.deleteSheet(oldViewSheet);

  const oldInventorySheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
  if (oldInventorySheet) ss.deleteSheet(oldInventorySheet);

  ui.alert(`Thiết lập thành công! Sheet "${MASTER_INVENTORY_SHEET}" đã được tạo/cập nhật theo template mới.`);
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
