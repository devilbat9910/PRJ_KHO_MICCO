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
 * Hàm thiết lập cấu trúc cần thiết cho hệ thống theo mô hình "Ma trận Tồn kho".
 * Sheet 'DANH MUC' và 'LOG_GIAO_DICH_tbl' được giữ lại, các sheet tồn kho cũ bị xóa.
 * Tạo ra sheet 'TON_KHO_tonghop' với cấu trúc cột động.
 */
function setupInitialStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  // 1. Định nghĩa cấu trúc cho sheet Tồn Kho Tổng Hợp
  const MASTER_INVENTORY_SHEET = 'TON_KHO_tonghop';
  
  // Các cột định danh cố định
  const identifierHeaders = [
    'INDEX (SKU)', 'Tên Viết Tắt', 'Quy Cách', 'Đơn Vị Sản Xuất',
    'Lô Sản Xuất', 'Ngày Sản Xuất', 'Tình Trạng Chất Lượng', 'Ngày Thử Nổ'
  ];

  // Lấy danh sách các cột kho động từ sheet DANH MUC
  const warehouseHeaders = getWarehouseNames();
  if (warehouseHeaders.length === 0) {
    ui.alert('Lỗi: Không tìm thấy tên kho nào trong cột D của sheet "DANH MUC". Vui lòng kiểm tra lại.');
    return;
  }

  // Kết hợp hai danh sách để tạo tiêu đề hoàn chỉnh
  const fullHeaders = [identifierHeaders.concat(warehouseHeaders)];

  // 2. Tạo hoặc làm mới sheet Tồn Kho Tổng Hợp
  let inventorySheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (inventorySheet) {
    inventorySheet.clear(); // Xóa dữ liệu cũ nếu sheet đã tồn tại
  } else {
    inventorySheet = ss.insertSheet(MASTER_INVENTORY_SHEET);
  }
  
  inventorySheet.getRange(1, 1, 1, fullHeaders[0].length)
    .setValues(fullHeaders)
    .setFontWeight('bold')
    .setBackground('#f3f3f3');
  inventorySheet.setFrozenColumns(identifierHeaders.length); // Cố định các cột định danh
  inventorySheet.setFrozenRows(1);

  // 3. Xóa các sheet tồn kho cũ không còn sử dụng
  const oldViewSheet = ss.getSheetByName(VIEW_INVENTORY_SHEET_NAME);
  if (oldViewSheet) ss.deleteSheet(oldViewSheet);

  const oldInventorySheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
  if (oldInventorySheet) ss.deleteSheet(oldInventorySheet);

  ui.alert(`Thiết lập thành công! Sheet "${MASTER_INVENTORY_SHEET}" đã được tạo/cập nhật với ${warehouseHeaders.length} kho.`);
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
