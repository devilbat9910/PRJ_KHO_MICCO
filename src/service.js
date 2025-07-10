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
  const quantity = parseFloat(formObject.soLuong);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error("Số lượng không hợp lệ. Phải là một số lớn hơn 0.");
  }

  let txObject = { ...formObject, soLuong: quantity };

  if (formObject.loaiGiaoDich === 'Nhập') {
    // --- VALIDATION for NHẬP ---
    if (!formObject.tenSanPham || !formObject.ngaySanXuat) {
      throw new Error("Giao dịch 'Nhập' yêu cầu Tên Sản Phẩm và Ngày Sản Xuất.");
    }
    if (formObject.loSanXuat && formObject.loSanXuat.includes('Đang tạo gợi ý...')) {
      throw new Error("Lỗi: Mã Lô chưa được tạo xong. Vui lòng chờ và thử lại.");
    }
    if (!formObject.quyCach || !/^[Dd Bb]/.test(formObject.quyCach)) {
      throw new Error("Lỗi: Quy Cách phải bắt đầu bằng ký tự 'D', 'd', 'B', hoặc 'b'.");
    }
    
    const categoryData = db_getCategoryData();
    const productInfo = categoryData.productMap[formObject.tenSanPham];
    if (!productInfo) {
      throw new Error(`Không tìm thấy thông tin sản phẩm cho: "${formObject.tenSanPham}" trong DANH MUC.`);
    }

    // Enrich txObject for Nhập
    txObject.Tên_SP = productInfo.shortName;
    txObject.Quy_Cách = formObject.quyCach;
    txObject.ĐV_SX = formObject.phanXuong;
    txObject.Lô_SX = formObject.loSanXuat;
    txObject.Ngày_SX = new Date(formObject.ngaySanXuat);
    txObject.QC_Status = formObject.tinhTrangChatLuong;
    txObject.INDEX = generateSku(txObject);

  } else { // Xuất hoặc Điều chuyển
    // --- VALIDATION for XUẤT/ĐIỀU CHUYỂN ---
    if (!formObject.index) {
      throw new Error("Giao dịch 'Xuất' hoặc 'Điều chuyển' yêu cầu phải nhập INDEX.");
    }
    if (formObject.loaiGiaoDich === 'Điều chuyển' && (!formObject.kho || !formObject.khoDi)) {
      throw new Error("Giao dịch 'Điều chuyển' yêu cầu phải có cả 'Kho Đi' và 'Kho Đến'.");
    }
    txObject.INDEX = formObject.index.trim().toUpperCase();
  }

  updateMasterInventory(txObject);

  // --- LOGGING ---
  let finalGhiChu = txObject.ghiChu;
  if (txObject.loaiGiaoDich === 'Điều chuyển') {
    const transferNote = `Điều chuyển từ ${txObject.khoDi} đến ${txObject.kho}.`;
    finalGhiChu = txObject.ghiChu ? `${transferNote} Ghi chú: ${txObject.ghiChu}` : transferNote;
  }

  const logObject = {
    sku: txObject.INDEX,
    loaiGiaoDich: txObject.loaiGiaoDich,
    tenSanPham: txObject.tenSanPham || formObject.tenSanPham, // Lấy từ txObject nếu có
    quyCach: txObject.Quy_Cách || formObject.quyCach,
    loSanXuat: txObject.Lô_SX || formObject.loSanXuat,
    ngaySanXuat: txObject.Ngày_SX || new Date(formObject.ngaySanXuat),
    tinhTrangChatLuong: txObject.QC_Status || formObject.tinhTrangChatLuong,
    soLuong: txObject.soLuong,
    phanXuong: txObject.ĐV_SX || formObject.phanXuong,
    kho: txObject.kho,
    ghiChu: finalGhiChu
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
  Logger.log('--- Bắt đầu updateMasterInventory ---');
  Logger.log('Input txObject: ' + JSON.stringify(txObject, null, 2));

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) throw new Error(`Không tìm thấy sheet tồn kho chính: "${MASTER_INVENTORY_SHEET}"`);

  if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
     throw new Error(`Lỗi nghiêm trọng: Sheet "${MASTER_INVENTORY_SHEET}" không hợp lệ (trống hoặc không có tiêu đề). Vui lòng chạy lại "Thiết lập cấu trúc" từ menu Trợ giúp.`);
  }

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  
  let targetRow;
  if (txObject.loaiGiaoDich === 'Nhập') {
    targetRow = _findOrCreateInventoryRow(sheet, headers, txObject);
  } else { // Xuất hoặc Điều chuyển
    targetRow = _findInventoryRowByIndex(sheet, headers, txObject.INDEX);
    if (targetRow === -1) {
      throw new Error(`Không tìm thấy lô hàng nào với INDEX: "${txObject.INDEX}".`);
    }
    // Làm giàu txObject với thông tin từ hàng tìm thấy để ghi log chính xác
    const rowData = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
    // Cần lấy tên sản phẩm đầy đủ từ DANH MUC để ghi log cho đẹp, thay vì chỉ lấy tên viết tắt
    const categoryData = db_getCategoryData();
    const productInfo = Object.values(categoryData.productMap).find(p => p.shortName === rowData[headers.indexOf('Tên_SP')]);
    txObject.tenSanPham = productInfo ? productInfo.fullName : rowData[headers.indexOf('Tên_SP')];
    
    txObject.Quy_Cách = rowData[headers.indexOf('Quy_Cách')];
    txObject.Lô_SX = rowData[headers.indexOf('Lô_SX')];
    txObject.Ngày_SX = rowData[headers.indexOf('Ngày_SX')];
    txObject.QC_Status = rowData[headers.indexOf('QC_Status')];
    txObject.ĐV_SX = rowData[headers.indexOf('ĐV_SX')];
  }
  
  Logger.log(`Hàng mục tiêu được xác định: ${targetRow}`);

  if (targetRow <= 1) {
    Logger.log('LỖI: targetRow không hợp lệ. Dừng thực thi.');
    throw new Error('Không thể xác định hàng để cập nhật. targetRow <= 1.');
  }

  if (txObject.loaiGiaoDich === 'Điều chuyển') {
    _updateInventoryValue(sheet, headers, targetRow, txObject.khoDi, -txObject.soLuong);
    _updateInventoryValue(sheet, headers, targetRow, txObject.kho, txObject.soLuong);
  } else {
    const quantity = txObject.loaiGiaoDich === 'Nhập' ? txObject.soLuong : -txObject.soLuong;
    _updateInventoryValue(sheet, headers, targetRow, txObject.kho, quantity);
  }

  Logger.log('Đã gọi _updateInventoryValue. Đang thực thi SpreadsheetApp.flush()...');
  SpreadsheetApp.flush();
  Logger.log('--- Hoàn thành updateMasterInventory ---');
}

/**
 * REFACTORED: Tìm hoặc tạo hàng mới dựa trên INDEX, sử dụng tên cột từ template mới.
 */
function _findInventoryRowByIndex(sheet, headers, index) {
  const skuColumnIndex = headers.indexOf('INDEX') + 1;
  if (skuColumnIndex === 0) throw new Error("Không tìm thấy cột 'INDEX' trong sheet tồn kho.");

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return -1;

  const numRows = lastRow - 2;
  const skus = sheet.getRange(3, skuColumnIndex, numRows, 1).getValues();
  const skuRow = skus.findIndex(row => row[0] === index);

  return skuRow !== -1 ? skuRow + 3 : -1;
}

function _findOrCreateInventoryRow(sheet, headers, txObject) {
  const existingRow = _findInventoryRowByIndex(sheet, headers, txObject.INDEX);
  if (existingRow !== -1) {
    return existingRow;
  }

  // Nếu không tìm thấy, tạo hàng mới
  const newRowData = headers.map(header => {
    switch (header) {
      case 'INDEX': return txObject.INDEX;
      case 'Tên_SP': return txObject.Tên_SP;
      case 'Quy_Cách': return txObject.Quy_Cách;
      case 'Lô_SX': return txObject.Lô_SX;
      case 'Ngày_SX': return Utilities.formatDate(txObject.Ngày_SX, "GMT+7", "yyyy-MM-dd");
      case 'QC_Status': return txObject.QC_Status;
      case 'ĐV_SX': return txObject.ĐV_SX;
      case 'Tổng_ĐT': return 0; // Khởi tạo tổng là 0
      default: return 0; // Mặc định số lượng kho là 0
    }
  });
  sheet.appendRow(newRowData);
  return sheet.getLastRow();
}

function _updateInventoryValue(sheet, headers, row, warehouseName, quantityChange) {
  Logger.log(`_updateInventoryValue: row=${row}, warehouse=${warehouseName}, change=${quantityChange}`);
  
  const normalizedWarehouseName = warehouseName.replace('Kho ', '').trim();
  const warehouseColumnIndex = headers.indexOf(normalizedWarehouseName);

  if (warehouseColumnIndex === -1) {
    const errorMsg = `Tên kho không hợp lệ. Không tìm thấy cột cho kho "${warehouseName}" (đã chuẩn hóa thành "${normalizedWarehouseName}") trong sheet ${sheet.getName()}.`;
    Logger.log('LỖI: ' + errorMsg);
    throw new Error(errorMsg);
  }
  
  // 1. Cập nhật giá trị cho kho cụ thể
  const cell = sheet.getRange(row, warehouseColumnIndex + 1);
  const currentValue = parseFloat(cell.getValue()) || 0;
  const newValue = currentValue + quantityChange;
  cell.setValue(newValue);
  Logger.log(`Đã cập nhật ô ${cell.getA1Notation()} thành ${newValue}.`);

  // 2. Tính toán và cập nhật lại cột tổng
  const totalColIndex = headers.indexOf('Tổng_ĐT');
  if (totalColIndex === -1) {
    Logger.log("Cảnh báo: Không tìm thấy cột 'Tổng_ĐT'. Bỏ qua việc cập nhật tổng.");
    return;
  }

  const startWarehouseCol = headers.indexOf('ĐT3');
  const endWarehouseCol = headers.indexOf('ĐT9');
  
  if (startWarehouseCol !== -1 && endWarehouseCol !== -1) {
    const rowValues = sheet.getRange(row, startWarehouseCol + 1, 1, (endWarehouseCol - startWarehouseCol) + 1).getValues()[0];
    const total = rowValues.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    
    const totalCell = sheet.getRange(row, totalColIndex + 1);
    totalCell.setValue(total);
    Logger.log(`Đã cập nhật ô Tổng_ĐT (${totalCell.getA1Notation()}) thành ${total}.`);
  }
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

  const lastRow = sourceSheet.getLastRow();
  // Dữ liệu bắt đầu từ hàng 3, nếu ít hơn thì không có dữ liệu
  if (lastRow < 3) {
    db_writeReportData([]);
    return { success: true, message: "Báo cáo đã được tạo (không có dữ liệu)." };
  }

  // Lấy tiêu đề từ hàng 1
  const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  // Lấy dữ liệu từ hàng 3 trở đi
  const allData = sourceSheet.getRange(3, 1, lastRow - 2, sourceSheet.getLastColumn()).getValues();
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

// ===================================================================================
// LOGIC TRA CỨU
// ===================================================================================

/**
 * Lọc dữ liệu từ sheet TON_KHO_tonghop dựa trên các tiêu chí.
 * @param {object} criteria - Đối tượng chứa các tiêu chí tìm kiếm.
 * @returns {object} - Đối tượng chứa kết quả và trạng thái.
 */
function service_performSearch(criteria) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) {
    return { success: false, message: 'Không tìm thấy sheet tồn kho.' };
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) {
    return { success: false, message: 'Không có dữ liệu để tra cứu.' };
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(3, 1, lastRow - 2, sheet.getLastColumn()).getValues();

  const filteredData = data.filter(row => {
    let match = true;
    
    // Helper function to get value by header name
    const getValue = (headerName) => row[headers.indexOf(headerName)];

    if (criteria.tenSanPham) {
      const tenSP = getValue('Tên_SP') || '';
      if (!tenSP.toLowerCase().includes(criteria.tenSanPham.toLowerCase())) {
        match = false;
      }
    }
    if (match && criteria.loSanXuat) {
      const loSX = getValue('Lô_SX') || '';
      if (!loSX.toLowerCase().includes(criteria.loSanXuat.toLowerCase())) {
        match = false;
      }
    }
    if (match && criteria.quyCach) {
      const quyCach = getValue('Quy_Cách') || '';
      if (!quyCach.toLowerCase().includes(criteria.quyCach.toLowerCase())) {
        match = false;
      }
    }
    if (match && criteria.qcStatus) {
      const qcStatus = getValue('QC_Status') || '';
      if (qcStatus !== criteria.qcStatus) {
        match = false;
      }
    }
    if (match && criteria.ngaySXStart) {
      const ngaySX = getValue('Ngày_SX');
      if (!ngaySX || new Date(ngaySX) < new Date(criteria.ngaySXStart)) {
        match = false;
      }
    }
    if (match && criteria.ngaySXEnd) {
      const ngaySX = getValue('Ngày_SX');
      const endDate = new Date(criteria.ngaySXEnd);
      endDate.setHours(23, 59, 59, 999); // Bao gồm cả ngày cuối cùng
      if (!ngaySX || new Date(ngaySX) > endDate) {
        match = false;
      }
    }
    return match;
  });

  // Định dạng lại ngày tháng trong kết quả để hiển thị
  const dateColIndex = headers.indexOf('Ngày_SX');
  if (dateColIndex !== -1) {
    filteredData.forEach(row => {
      if (row[dateColIndex] instanceof Date) {
        row[dateColIndex] = Utilities.formatDate(row[dateColIndex], "GMT+7", "yyyy-MM-dd");
      }
    });
  }

  return { success: true, data: filteredData, headers: headers };
}

/**
 * Lấy thông tin chi tiết của một lô hàng dựa trên INDEX.
 * @param {string} index - Mã INDEX của lô hàng cần tìm.
 * @returns {object|null} - Trả về một đối tượng chứa thông tin chi tiết hoặc null nếu không tìm thấy.
 */
function service_getDataByIndex(index) {
  if (!index) return null;
  
  const normalizedIndex = index.trim().toUpperCase();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) throw new Error(`Không tìm thấy sheet tồn kho chính: "${MASTER_INVENTORY_SHEET}"`);

  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  
  const targetRow = _findInventoryRowByIndex(sheet, headers, normalizedIndex);
  
  if (targetRow === -1) {
    return null; // Không tìm thấy
  }
  
  const rowData = sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0];
  const categoryData = db_getCategoryData();

  const shortName = rowData[headers.indexOf('Tên_SP')];
  // Sử dụng map tra cứu ngược để tìm tên đầy đủ một cách hiệu quả
  const fullName = categoryData.shortNameToFullNameMap[shortName] || shortName;

  const inventoryData = {
    tenSanPham: fullName,
    quyCach: rowData[headers.indexOf('Quy_Cách')],
    ngaySanXuat: Utilities.formatDate(new Date(rowData[headers.indexOf('Ngày_SX')]), "GMT+7", "yyyy-MM-dd"),
    phanXuong: rowData[headers.indexOf('ĐV_SX')],
    tinhTrangChatLuong: rowData[headers.indexOf('QC_Status')],
    loSanXuat: rowData[headers.indexOf('Lô_SX')],
    inventory: {}
  };

  // Lấy số lượng tồn kho từ các cột kho
  const warehouseNames = categoryData.warehouses.map(wh => wh.replace('Kho ', '').trim());
  warehouseNames.forEach(whName => {
    const whIndex = headers.indexOf(whName);
    if (whIndex !== -1) {
      inventoryData.inventory[whName] = rowData[whIndex] || 0;
    }
  });

  return inventoryData;
}