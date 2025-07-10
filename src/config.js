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
 * REFACTORED (v3): Hàm thiết lập cấu trúc an toàn, không phá hủy dữ liệu.
 * Tự động đọc danh sách kho, bảo toàn dữ liệu cũ và áp dụng công thức mảng.
 */
function setupInitialStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const MASTER_INVENTORY_SHEET = 'TON_KHO_tonghop';

  // --- Bước 1: Lấy cấu trúc mới và dữ liệu cũ ---
  const warehouseList = db_getWarehouseList();
  if (warehouseList.length === 0) {
    ui.alert("Lỗi: Không tìm thấy kho nào trong sheet 'DANH MUC'.");
    return;
  }

  const identifierHeaders = ['INDEX', 'Tên_SP', 'Quy_Cách', 'Lô_SX', 'Ngày_SX', 'QC_Status', 'ĐV_SX'];
  const totalColumnHeader = 'Tổng SL';
  const newHeaders = [...identifierHeaders, totalColumnHeader, ...warehouseList];
  
  let oldData = [];
  let oldHeaders = [];
  const sourceSheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (sourceSheet && sourceSheet.getLastRow() > 2) {
    const dataRange = sourceSheet.getRange(3, 1, sourceSheet.getLastRow() - 2, sourceSheet.getLastColumn());
    oldData = dataRange.getValues();
    oldHeaders = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  }

  // --- Bước 2: Tạo sheet tạm và ghi dữ liệu đã ánh xạ ---
  const tempSheetName = `temp_migration_${Date.now()}`;
  const tempSheet = ss.insertSheet(tempSheetName);
  
  // Ghi tiêu đề mới vào sheet tạm
  tempSheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);

  // Ánh xạ dữ liệu cũ sang cấu trúc mới
  if (oldData.length > 0) {
    const mappedData = oldData.map(row => {
      const oldRowObject = oldHeaders.reduce((obj, header, i) => {
        obj[header] = row[i];
        return obj;
      }, {});
      
      return newHeaders.map(newHeader => {
        // Trả về giá trị từ dữ liệu cũ nếu tìm thấy, nếu không thì trả về rỗng
        return oldRowObject[newHeader] !== undefined ? oldRowObject[newHeader] : "";
      });
    });
    tempSheet.getRange(3, 1, mappedData.length, mappedData[0].length).setValues(mappedData);
  }

  // --- Bước 3: Xóa sheet cũ và đổi tên sheet tạm ---
  if (sourceSheet) {
    ss.deleteSheet(sourceSheet);
  }
  tempSheet.setName(MASTER_INVENTORY_SHEET);
  const newInventorySheet = tempSheet; // Giờ sheet tạm là sheet chính

  // --- Bước 4: Áp dụng công thức và định dạng ---
  const totalColumnPosition = identifierHeaders.length + 1; // Cột H
  const firstWarehouseCol = String.fromCharCode('A'.charCodeAt(0) + totalColumnPosition);
  const lastWarehouseCol = String.fromCharCode('A'.charCodeAt(0) + totalColumnPosition + warehouseList.length - 1);
  
  // SỬA LỖI CÔNG THỨC: Dùng ARRAYFORMULA và dấu chấm phẩy
  const arrayFormula = `=ARRAYFORMULA(IF(A3:A="";;MMULT(IF(ISNUMBER(${firstWarehouseCol}3:${lastWarehouseCol});${firstWarehouseCol}3:${lastWarehouseCol};0);SEQUENCE(COLUMNS(${firstWarehouseCol}3:${lastWarehouseCol});1;1;0))))`;
  newInventorySheet.getRange(3, totalColumnPosition).setFormula(arrayFormula);
  
  // Đặt hàng tổng cộng
  const totalRowFormulas = [];
  totalRowFormulas.push(`=IFERROR(SUM(H3:H))`);
  for (let i = 0; i < warehouseList.length; i++) {
    const colLetter = String.fromCharCode('A'.charCodeAt(0) + totalColumnPosition + i);
    totalRowFormulas.push(`=IFERROR(SUM(${colLetter}3:${colLetter}))`);
  }
  newInventorySheet.getRange(2, totalColumnPosition, 1, totalRowFormulas.length).setFormulas([totalRowFormulas]);
  newInventorySheet.getRange(2, identifierHeaders.length).setValue('TỔNG CỘNG').setFontWeight('bold').setHorizontalAlignment('right');

  // Định dạng cuối cùng
  newInventorySheet.getRange(1, 1, 1, newHeaders.length).setFontWeight('bold').setBackground('#f3f3f3');
  newInventorySheet.setFrozenColumns(identifierHeaders.length);
  newInventorySheet.setFrozenRows(2);

  // Xóa các sheet tồn kho cũ không còn sử dụng
  const oldViewSheet = ss.getSheetByName(VIEW_INVENTORY_SHEET_NAME);
  if (oldViewSheet) ss.deleteSheet(oldViewSheet);
  const oldInventorySheet = ss.getSheetByName(INVENTORY_SHEET_NAME);
  if (oldInventorySheet) ss.deleteSheet(oldInventorySheet);

  ui.alert(`Tái cấu trúc thành công! Dữ liệu đã được bảo toàn và di chuyển sang cấu trúc mới. Sheet "${MASTER_INVENTORY_SHEET}" đã được cập nhật động.`);
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
