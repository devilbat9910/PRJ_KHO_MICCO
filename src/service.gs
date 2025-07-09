/**
 * @OnlyCurrentDoc
 * TỆP DỊCH VỤ (SERVICE LAYER) - REFACTORED FOR NEW TEMPLATE
 * Chứa logic nghiệp vụ, điều phối dữ liệu giữa UI và DB.
 * Không tương tác trực tiếp với Sheet.
 */

const MASTER_INVENTORY_SHEET = 'TON_KHO_tonghop';

// ===================================================================================
// DATA GETTERS & HELPERS
// ===================================================================================

function getMasterDataForForm() {
  const categories = db_getCategoryData();
  return {
    products: categories.productDropdown,
    factories: categories.factories,
    warehouses: categories.warehouses
  };
}

function suggestLotNumber(productName, factory, dateStr) {
  if (!productName || !dateStr || !factory) return "";
  const categories = db_getCategoryData();
  const productInfo = categories.productMap[productName];
  if (!productInfo || !productInfo.lotCode) return productInfo ? productInfo.shortName : "";
  const date = new Date(dateStr);
  const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
  const year = date.getUTCFullYear().toString().slice(-2);
  let lotCode = productInfo.lotCode;
  if (lotCode.includes('{PX}')) {
    const factoryMap = { 'Px Đông Triều': 'ĐT', 'Px Cẩm Phả': 'CP', 'Px Quảng Ninh': 'QN' };
    const factoryCode = factoryMap[factory] || '';
    lotCode = lotCode.replace('{PX}', factoryCode);
  }
  return `${month}${year}${lotCode}`;
}

function service_getRecentTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet) return [];
  const lastRow = logSheet.getLastRow();
  if (lastRow < 2) return [];
  const startRow = Math.max(2, lastRow - 9);
  const numRows = lastRow - startRow + 1;
  const range = logSheet.getRange(startRow, 2, numRows, 11);
  const data = range.getValues();
  data.forEach(row => {
    if (row[5] instanceof Date) row[5] = Utilities.formatDate(row[5], "GMT+7", "yyyy-MM-dd");
    if (typeof row[3] === 'string') row[3] = row[3].toUpperCase();
  });
  return data.reverse();
}

// ===================================================================================
// CORE TRANSACTION & INVENTORY LOGIC
// ===================================================================================

/**
 * REFACTORED: Xử lý một giao dịch, làm giàu dữ liệu theo template mới.
 */
function service_processSingleTransaction(formObject) {
  const categoryData = db_getCategoryData();

  if (!formObject.tenSanPham || !formObject.soLuong || !formObject.ngaySanXuat) {
    throw new Error("Thiếu các trường bắt buộc: Tên Sản Phẩm, Số Lượng, Ngày Sản Xuất.");
  }
  if (formObject.loaiGiaoDich === 'Điều chuyển' && (!formObject.kho || !formObject.khoDi)) {
    throw new Error("Giao dịch 'Điều chuyển' yêu cầu phải có cả 'Kho Đi' và 'Kho Đến'.");
  }
  const quantity = parseFloat(formObject.soLuong);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error("Số lượng không hợp lệ. Phải là một số lớn hơn 0.");
  }

  const productInfo = categoryData.productMap[formObject.tenSanPham];
  if (!productInfo) {
    throw new Error(`Không tìm thấy thông tin sản phẩm cho: "${formObject.tenSanPham}" trong DANH MUC.`);
  }

  const txObject = {
    ...formObject,
    soLuong: quantity,
    Tên_SP: productInfo.shortName, // Lấy tên viết tắt từ map
    Quy_Cách: formObject.quyCach,   // LẤY TRỰC TIẾP TỪ FORM
    ĐV_SX: formObject.phanXuong,    // LẤY TRỰC TIẾP TỪ FORM
    Lô_SX: formObject.loSanXuat,
    Ngày_SX: new Date(formObject.ngaySanXuat),
    QC_Status: formObject.tinhTrangChatLuong,
  };
  
  txObject.INDEX = generateSku(txObject);

  updateMasterInventory(txObject);

  const logObject = {
    sku: txObject.INDEX,
    loaiGiaoDich: txObject.loaiGiaoDich,
    tenSanPham: formObject.tenSanPham,
    quyCach: txObject.Quy_Cách,
    loSanXuat: txObject.Lô_SX,
    ngaySanXuat: txObject.Ngày_SX,
    tinhTrangChatLuong: txObject.QC_Status,
    soLuong: txObject.soLuong,
    phanXuong: txObject.ĐV_SX,
    kho: txObject.kho,
    ghiChu: txObject.ghiChu
  };
  addTransactionToLog(logObject);
  
  return { success: true, message: "Giao dịch thành công!" };
}

/**
 * REFACTORED (v3): Tạo mã INDEX (SKU) theo công thức {mã lô}-{quy cách}-{date}-{px sản xuất}.
 * Sửa lỗi logic lấy mã lô.
 */
function generateSku(txObject) {
    const fullLotNumber = txObject.Lô_SX || '';
    // Tách lấy mã lô thực tế (bỏ đi phần MMYY ở đầu, ví dụ: "0725R08" -> "R08")
    const lotCode = (fullLotNumber && fullLotNumber.length > 4) ? fullLotNumber.substring(4) : fullLotNumber || 'NA';
    const spec = txObject.Quy_Cách || 'NA';
    const dateString = Utilities.formatDate(new Date(txObject.Ngày_SX), "GMT+7", "ddMMyy");
    
    // Chuyển đổi ĐV_SX thành mã
    const factory = txObject.ĐV_SX || '';
    const factoryMap = { 'Px Đông Triều': 'ĐT', 'Px Cẩm Phả': 'CP', 'Px Quảng Ninh': 'QN' };
    const factoryCode = factoryMap[factory] || factory; // Fallback to original if not in map

    return `${lotCode}-${spec}-${dateString}-${factoryCode}`.toUpperCase().replace(/ /g, '-');
}

/**
 * REFACTORED: Hàm điều phối chính để cập nhật ma trận tồn kho.
 */
function updateMasterInventory(txObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) throw new Error(`Không tìm thấy sheet tồn kho chính: "${MASTER_INVENTORY_SHEET}"`);

  // BẢO VỆ CHỐNG LỖI (V2): Kiểm tra cả hàng và cột.
  // Một sheet hợp lệ phải có ít nhất 1 hàng (tiêu đề) và 1 cột.
  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
     throw new Error(`Lỗi nghiêm trọng: Sheet "${MASTER_INVENTORY_SHEET}" không hợp lệ (trống hoặc không có tiêu đề). Vui lòng chạy lại "Thiết lập cấu trúc" từ menu Trợ giúp.`);
  }

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const targetRow = _findOrCreateInventoryRow(sheet, headers, txObject);

  if (txObject.loaiGiaoDich === 'Điều chuyển') {
    _updateInventoryValue(sheet, headers, targetRow, txObject.khoDi, -txObject.soLuong);
    _updateInventoryValue(sheet, headers, targetRow, txObject.kho, txObject.soLuong);
  } else {
    const quantity = txObject.loaiGiaoDich === 'Nhập' ? txObject.soLuong : -txObject.soLuong;
    _updateInventoryValue(sheet, headers, targetRow, txObject.kho, quantity);
  }
  // BUỘC GHI DỮ LIỆU: Đây là bước quan trọng để giải quyết lỗi "ghi thầm lặng".
  // Nó đảm bảo tất cả các thay đổi (appendRow, setValue) được áp dụng ngay lập tức.
  SpreadsheetApp.flush();
}

/**
 * REFACTORED: Tìm hoặc tạo hàng mới dựa trên INDEX, sử dụng tên cột từ template mới.
 */
function _findOrCreateInventoryRow(sheet, headers, txObject) {
  const skuColumnIndex = headers.indexOf('INDEX') + 1;
  if (skuColumnIndex === 0) throw new Error("Không tìm thấy cột 'INDEX' trong sheet tồn kho.");

  const lastRow = sheet.getLastRow();
  let skuRow = -1;

  // Chỉ tìm kiếm nếu có ít nhất một hàng dữ liệu
  if (lastRow >= 2) {
    const numRows = lastRow - 1; // Sửa lỗi tính toán dải ô
    const skus = sheet.getRange(2, skuColumnIndex, numRows, 1).getValues();
    skuRow = skus.findIndex(row => row[0] === txObject.INDEX);
  }

  if (skuRow !== -1) {
    // Chuyển đổi chỉ số mảng thành chỉ số hàng trên sheet
    return skuRow + 2;
  } else {
    const newRowData = headers.map(header => {
      switch (header) {
        case 'INDEX': return txObject.INDEX;
        case 'Tên_SP': return txObject.Tên_SP;
        case 'Quy_Cách': return txObject.Quy_Cách;
        case 'Lô_SX': return txObject.Lô_SX;
        case 'Ngày_SX': return txObject.Ngày_SX;
        case 'QC_Status': return txObject.QC_Status;
        case 'ĐV_SX': return txObject.ĐV_SX;
        case 'Tổng_ĐT': return null; // Để công thức ARRAYFORMULA tự tính
        default: return 0; // Mặc định số lượng kho là 0
      }
    });
    sheet.appendRow(newRowData);
    return sheet.getLastRow();
  }
}

function _updateInventoryValue(sheet, headers, row, warehouseName, quantityChange) {
  // Bỏ qua tiền tố "Kho " để khớp với tên cột như "ĐT3", "CP4"
  const normalizedWarehouseName = warehouseName.replace('Kho ', '').trim();
  
  const warehouseColumnIndex = headers.indexOf(normalizedWarehouseName);
  if (warehouseColumnIndex === -1) {
    throw new Error(`Tên kho không hợp lệ. Không tìm thấy cột cho kho "${warehouseName}" (đã chuẩn hóa thành "${normalizedWarehouseName}") trong sheet ${sheet.getName()}.`);
  }
  const cell = sheet.getRange(row, warehouseColumnIndex + 1);
  const currentValue = parseFloat(cell.getValue()) || 0;
  cell.setValue(currentValue + quantityChange);
}

// ===================================================================================
// BÁO CÁO VÀ CHỐT SỔ
// ===================================================================================

function service_createMonthlySnapshot() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sourceSheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sourceSheet) throw new Error(`Không tìm thấy sheet nguồn: "${MASTER_INVENTORY_SHEET}"`);
  const snapshotDate = new Date();
  const snapshotSheetName = `Snapshot_${Utilities.formatDate(snapshotDate, "GMT+7", "MM-yyyy")}`;
  let snapshotSheet = ss.getSheetByName(snapshotSheetName);
  if (snapshotSheet) {
    const response = ui.alert('Cảnh báo', `Sheet chốt sổ cho tháng này ("${snapshotSheetName}") đã tồn tại. Bạn có muốn xóa sheet cũ và tạo lại không?`, ui.ButtonSet.YES_NO);
    if (response == ui.Button.YES) {
      ss.deleteSheet(snapshotSheet);
    } else {
      return { success: false, message: 'Hành động đã bị hủy bởi người dùng.' };
    }
  }
  snapshotSheet = sourceSheet.copyTo(ss).setName(snapshotSheetName);
  const dataRange = snapshotSheet.getDataRange();
  dataRange.copyTo(dataRange, { contentsOnly: true });
  ss.setActiveSheet(snapshotSheet);
  return { success: true, message: `Đã tạo thành công sheet chốt sổ: "${snapshotSheetName}"` };
}

/**
 * REFACTORED: Tạo báo cáo tồn kho dựa trên cấu trúc template mới.
 */
function service_generateMonthlyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sourceSheet) throw new Error(`Không tìm thấy sheet nguồn: "${MASTER_INVENTORY_SHEET}"`);

  const dataRange = sourceSheet.getDataRange();
  const allData = dataRange.getValues();

  if (allData.length < 2) {
    db_writeReportData([]);
    return { success: true, message: "Báo cáo đã được tạo (không có dữ liệu)." };
  }

  const headers = allData.shift();
  const warehouseNames = headers.filter(h => h.startsWith('ĐT') || h.startsWith('CP'));
  
  const productNameIndex = headers.indexOf('Tên_SP');
  const specIndex = headers.indexOf('Quy_Cách');
  if (productNameIndex === -1 || specIndex === -1) {
    throw new Error("Không tìm thấy cột 'Tên_SP' hoặc 'Quy_Cách' trong sheet tồn kho.");
  }

  const aggregatedData = {};

  allData.forEach(row => {
    const productName = row[productNameIndex];
    const productSpec = row[specIndex];
    if (!productName) return; // Bỏ qua các hàng không có tên sản phẩm
    const productKey = `${productName}_${productSpec}`;

    if (!aggregatedData[productKey]) {
      aggregatedData[productKey] = { name: productName, spec: productSpec, total: 0, warehouses: {} };
      warehouseNames.forEach(wh => aggregatedData[productKey].warehouses[wh] = 0);
    }

    warehouseNames.forEach(wh => {
      const whIndex = headers.indexOf(wh);
      if (whIndex !== -1) {
        const quantity = parseFloat(row[whIndex]) || 0;
        aggregatedData[productKey].warehouses[wh] += quantity;
        aggregatedData[productKey].total += quantity;
      }
    });
  });

  const reportHeaders = ['Tên Sản Phẩm', 'Quy Cách', 'Tổng Tồn Kho', ...warehouseNames];
  const reportRows = Object.values(aggregatedData).map(prod => {
    const row = [prod.name, prod.spec, prod.total];
    warehouseNames.forEach(wh => row.push(prod.warehouses[wh]));
    return row;
  });

  db_writeReportData([reportHeaders, ...reportRows]);

  return { success: true, message: `Báo cáo tồn kho đã được tạo/cập nhật thành công trong sheet "${REPORT_SHEET_NAME}".` };
}