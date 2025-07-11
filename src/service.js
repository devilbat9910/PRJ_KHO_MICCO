/**
 * @OnlyCurrentDoc
 * TỆP DỊCH VỤ (SERVICE LAYER)
 */

const MASTER_INVENTORY_SHEET = 'TON_KHO_tonghop';

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

function service_getOriginalTransactionForEdit(indexValue) {
  if (!indexValue) return null;
  const txObject = db_getTransactionLogBySku(indexValue);
  if (!txObject) return null;
  
  if (txObject.ngaySanXuat instanceof Date) {
    txObject.ngaySanXuat = Utilities.formatDate(txObject.ngaySanXuat, "GMT+7", "yyyy-MM-dd");
  }
  return txObject;
}

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
    Tên_SP: productInfo.shortName,
    Quy_Cách: formObject.quyCach,
    ĐV_SX: formObject.phanXuong,
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

function generateSku(txObject) {
    const fullLotNumber = txObject.Lô_SX || '';
    const lotCode = (fullLotNumber && fullLotNumber.length > 4) ? fullLotNumber.substring(4) : fullLotNumber || 'NA';
    const spec = txObject.Quy_Cách || 'NA';
    const dateString = Utilities.formatDate(new Date(txObject.Ngày_SX), "GMT+7", "ddMMyy");
    
    const factory = txObject.ĐV_SX || '';
    const factoryMap = { 'Px Đông Triều': 'ĐT', 'Px Cẩm Phả': 'CP', 'Px Quảng Ninh': 'QN' };
    const factoryCode = factoryMap[factory] || factory;

    return `${lotCode}-${spec}-${dateString}-${factoryCode}`.toUpperCase().replace(/ /g, '-');
}

function updateMasterInventory(txObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) throw new Error(`Không tìm thấy sheet tồn kho chính: "${MASTER_INVENTORY_SHEET}"`);

  if (sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
     throw new Error(`Lỗi nghiêm trọng: Sheet "${MASTER_INVENTORY_SHEET}" không hợp lệ.`);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const targetRow = _findOrCreateInventoryRow(sheet, headers, txObject);

  if (txObject.loaiGiaoDich === 'Điều chuyển') {
    _updateInventoryValue(sheet, headers, targetRow, txObject.khoDi, -txObject.soLuong);
    _updateInventoryValue(sheet, headers, targetRow, txObject.kho, txObject.soLuong);
  } else {
    const quantity = txObject.loaiGiaoDich === 'Nhập' ? txObject.soLuong : -txObject.soLuong;
    _updateInventoryValue(sheet, headers, targetRow, txObject.kho, quantity);
  }
  
  SpreadsheetApp.flush();
  _removeZeroInventoryRows(sheet, headers);
}

function _findOrCreateInventoryRow(sheet, headers, txObject) {
  const indexCol = headers.indexOf('INDEX');
  if (indexCol === -1) throw new Error("Không tìm thấy cột 'INDEX'.");

  const lastRow = sheet.getLastRow();
  let targetRow = -1;

  if (lastRow >= 3) {
    const indexValues = sheet.getRange(3, indexCol + 1, lastRow - 2, 1).getValues();
    const rowIndexInArray = indexValues.findIndex(row => row[0] === txObject.INDEX);
    if (rowIndexInArray !== -1) {
      targetRow = rowIndexInArray + 3;
    }
  }

  if (targetRow !== -1) {
    return targetRow;
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
        case 'Tổng SL': return null;
        default: return 0;
      }
    });
    sheet.appendRow(newRowData);
    return sheet.getLastRow();
  }
}

function _removeZeroInventoryRows(sheet, headers) {
  const totalColIndex = headers.indexOf('Tổng SL');
  if (totalColIndex === -1) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return;

  const totalValues = sheet.getRange(3, totalColIndex + 1, lastRow - 2, 1).getValues();
  const rowsToDelete = [];

  totalValues.forEach((row, index) => {
    if (parseFloat(row[0]) === 0) {
      rowsToDelete.push(index + 3);
    }
  });

  if (rowsToDelete.length > 0) {
    rowsToDelete.reverse().forEach(rowIndex => sheet.deleteRow(rowIndex));
  }
}

function _updateInventoryValue(sheet, headers, row, warehouseName, quantityChange) {
  const warehouseColumnIndex = headers.indexOf(warehouseName);
  if (warehouseColumnIndex === -1) {
    throw new Error(`Tên kho không hợp lệ: "${warehouseName}".`);
  }
  const cell = sheet.getRange(row, warehouseColumnIndex + 1);
  const currentValue = parseFloat(cell.getValue()) || 0;
  cell.setValue(currentValue + quantityChange);
}

function service_updateTransaction(formObject, originalTx) {
  if (!originalTx || !originalTx.sku) {
    throw new Error("Dữ liệu giao dịch gốc không hợp lệ.");
  }

  const changes = _getChangeSet(originalTx, formObject);
  if (changes.details.length === 0) {
    return { success: true, message: "Không có thay đổi nào." };
  }

  if (!changes.isInventoryChange) {
    const updateNote = `UPDATED (info): ${changes.details.join('; ')}`;
    db_updateLogEntry(originalTx.sku, formObject, updateNote);
    return { success: true, message: `Cập nhật thông tin thành công.` };
  }

  const reversalTx = { ...originalTx, soLuong: parseFloat(originalTx.soLuong) };
  if (reversalTx.loaiGiaoDich === 'Điều chuyển') {
      updateMasterInventory({ ...reversalTx, loaiGiaoDich: 'Nhập', kho: originalTx.khoDi });
      updateMasterInventory({ ...reversalTx, loaiGiaoDich: 'Xuất', kho: originalTx.kho });
  } else {
      reversalTx.loaiGiaoDich = (originalTx.loaiGiaoDich === 'Nhập') ? 'Xuất' : 'Nhập';
      updateMasterInventory(reversalTx);
  }
  
  const result = service_processSingleTransaction(formObject);

  const updateNoteForLog = `UPDATED: ${changes.details.join('; ')}`;
  db_updateLogEntry(originalTx.sku, formObject, updateNoteForLog);

  return { success: true, message: `Giao dịch đã được cập nhật. ${changes.details.join('; ')}` };
}

function _getChangeSet(oldTx, newTx) {
    const changes = [];
    let isInventoryChange = false;
    const inventoryKeys = ['loaiGiaoDich', 'soLuong', 'kho', 'khoDi', 'tenSanPham', 'quyCach', 'loSanXuat', 'phanXuong'];
    const mapping = {
        tenSanPham: 'Tên SP', quyCach: 'Quy Cách', soLuong: 'Số Lượng',
        loSanXuat: 'Lô SX', ngaySanXuat: 'Ngày SX', tinhTrangChatLuong: 'QC Status',
        phanXuong: 'ĐV SX', kho: 'Kho', khoDi: 'Kho Đi', ghiChu: 'Ghi Chú',
        loaiGiaoDich: 'Loại GD'
    };

    for (const key in mapping) {
        let oldVal = oldTx[key] ? oldTx[key].toString().trim() : '';
        let newVal = newTx[key] ? newTx[key].toString().trim() : '';
        
        if (key === 'ngaySanXuat') {
            oldVal = oldTx[key] ? Utilities.formatDate(new Date(oldTx[key]), "GMT+7", "yyyy-MM-dd") : '';
            newVal = newTx[key] ? Utilities.formatDate(new Date(newTx[key]), "GMT+7", "yyyy-MM-dd") : '';
        }

        if (oldVal !== newVal) {
            changes.push(`${mapping[key]} (${oldVal} -> ${newVal})`);
            if (inventoryKeys.includes(key)) {
                isInventoryChange = true;
            }
        }
    }
    return { details: changes, isInventoryChange: isInventoryChange };
}

function service_performSearch(searchCriteria) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!sheet) throw new Error(`Không tìm thấy sheet log: "${LOG_SHEET_NAME}"`);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, headers: [], data: [], message: 'Không có dữ liệu để tìm kiếm.' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  const indexCol = headers.indexOf('INDEX (SKU)');
  const tenSanPhamCol = headers.indexOf('Tên Sản Phẩm');
  const loSanXuatCol = headers.indexOf('Lô Sản Xuất');

  let filteredData = allData;

  // Priority 1: Search by INDEX
  if (searchCriteria.index) {
    filteredData = allData.filter(row => row[indexCol] && row[indexCol].toString().toUpperCase().includes(searchCriteria.index));
  }
  // Priority 2: Combined search if INDEX is not provided
  else if (searchCriteria.tenSanPham || searchCriteria.loSanXuat) {
    filteredData = allData.filter(row => {
      const matchTenSanPham = !searchCriteria.tenSanPham || (row[tenSanPhamCol] && row[tenSanPhamCol] === searchCriteria.tenSanPham);
      const matchLoSanXuat = !searchCriteria.loSanXuat || (row[loSanXuatCol] && row[loSanXuatCol].toString().includes(searchCriteria.loSanXuat));
      return matchTenSanPham && matchLoSanXuat;
    });
  }
  // Default: No criteria, return last 10
  else {
    return formatAndReturn(allData.slice(-10).reverse(), headers, "Hiển thị 10 giao dịch gần nhất.");
  }
  
  return formatAndReturn(filteredData.reverse(), headers);
}


function formatAndReturn(data, headers, message = null) {
    if (data.length === 0) {
      return { success: true, headers: headers, data: [], message: 'Không tìm thấy kết quả nào phù hợp.' };
  }
  
  const tenSanPhamCol = headers.indexOf('Tên Sản Phẩm');
  const ngaySanXuatCol = headers.indexOf('Ngày Sản Xuất');

  const formattedData = data.map(row => {
      // Format date
      if (row[ngaySanXuatCol] instanceof Date) {
        row[ngaySanXuatCol] = Utilities.formatDate(row[ngaySanXuatCol], "GMT+7", "dd/MM/yyyy");
      }
      return row;
  });

  return {
    success: true,
    headers: headers,
    data: formattedData,
    message: message || `Tìm thấy ${data.length} kết quả.`
  };
}

/**
 * Creates a snapshot of the current inventory sheet.
 * The snapshot is a static copy of the data at a specific point in time.
 */
function service_createMonthlySnapshot() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sourceSheet) {
    throw new Error(`Không tìm thấy sheet nguồn: "${MASTER_INVENTORY_SHEET}"`);
  }

  const date = new Date();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear();
  const snapshotName = `Snapshot_${month}-${year}`;

  if (ss.getSheetByName(snapshotName)) {
    return { success: false, message: `Snapshot cho tháng ${month}/${year} đã tồn tại.` };
  }

  const snapshotSheet = sourceSheet.copyTo(ss);
  snapshotSheet.setName(snapshotName);

  // Convert all data to static values to preserve the state
  const range = snapshotSheet.getDataRange();
  range.setValues(range.getValues());

  ss.setActiveSheet(snapshotSheet);
  return { success: true, message: `Đã tạo thành công snapshot: "${snapshotName}"` };
}

/**
 * Generates a summary report of the current inventory.
 * It aggregates stock by product name and specification.
 */
function service_generateMonthlyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sourceSheet || sourceSheet.getLastRow() < 3) {
    return { success: false, message: "Không có dữ liệu tồn kho để tạo báo cáo." };
  }

  const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const data = sourceSheet.getRange(3, 1, sourceSheet.getLastRow() - 2, sourceSheet.getLastColumn()).getValues();

  const productNameCol = headers.indexOf('Tên_SP');
  const specCol = headers.indexOf('Quy_Cách');
  const totalCol = headers.indexOf('Tổng SL');

  if (productNameCol === -1 || specCol === -1 || totalCol === -1) {
      throw new Error("Cấu trúc sheet 'TON_KHO_tonghop' không hợp lệ. Thiếu các cột 'Tên_SP', 'Quy_Cách' hoặc 'Tổng SL'.");
  }
  
  const reportData = {};

  data.forEach(row => {
    const productName = row[productNameCol];
    const spec = row[specCol];
    const total = parseFloat(row[totalCol]) || 0;

    if (!productName || total === 0) return;

    const key = `${productName}|${spec}`;
    if (!reportData[key]) {
      reportData[key] = {
        name: productName,
        spec: spec,
        total: 0
      };
    }
    reportData[key].total += total;
  });

  const reportArray = [['Tên Sản Phẩm', 'Quy Cách', 'Tổng Tồn Kho']];
  for (const key in reportData) {
    const item = reportData[key];
    reportArray.push([item.name, item.spec, item.total]);
  }
  
  db_writeReportData(reportArray);

  return { success: true, message: `Báo cáo tồn kho đã được tạo/cập nhật tại sheet "BaoCaoTonKho".` };
}