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

/**
 * Lấy toàn bộ dữ liệu của một lô hàng dựa trên INDEX (SKU) để điền vào form.
 * @param {string} indexValue - Mã INDEX (SKU) cần tra cứu.
 * @returns {object | null} - Đối tượng chứa thông tin chi tiết của lô hàng hoặc null nếu không tìm thấy.
 */
function service_getDataByIndex(indexValue) {
  if (!indexValue) {
    return null;
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet tồn kho chính: "${MASTER_INVENTORY_SHEET}"`);
  }

  const lastRow = sheet.getLastRow();
  // Một sheet hợp lệ phải có ít nhất 3 hàng (Tiêu đề, Tổng, Dữ liệu)
  if (lastRow < 3) {
    return null;
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const indexCol = headers.indexOf('INDEX');
  if (indexCol === -1) {
    throw new Error("Không tìm thấy cột 'INDEX' trong sheet tồn kho.");
  }

  // Dữ liệu bắt đầu từ hàng 3, nên dải ô là (3, index, lastRow - 2, 1)
  const indexData = sheet.getRange(3, indexCol + 1, lastRow - 2, 1).getValues();
  const rowIndexInArray = indexData.findIndex(row => row[0] === indexValue);

  if (rowIndexInArray === -1) {
    return null; // Không tìm thấy INDEX
  }

  const targetRowOnSheet = rowIndexInArray + 3; // Vị trí hàng thực tế trên sheet
  const rowData = sheet.getRange(targetRowOnSheet, 1, 1, sheet.getLastColumn()).getValues()[0];

  const result = { inventory: {} };
  const categories = db_getCategoryData(); // Lấy map để tra cứu tên đầy đủ

  headers.forEach((header, i) => {
    const value = rowData[i];
    switch (header) {
      case 'Tên_SP':
        // Tra cứu ngược từ tên viết tắt ra tên đầy đủ để điền vào form
        const productFullName = Object.keys(categories.productMap).find(key => categories.productMap[key].shortName === value);
        result.tenSanPham = productFullName || value; // Fallback nếu không tìm thấy
        break;
      case 'Quy_Cách':
        result.quyCach = value;
        break;
      case 'Lô_SX':
        result.loSanXuat = value;
        break;
      case 'Ngày_SX':
        result.ngaySanXuat = value instanceof Date ? Utilities.formatDate(value, "GMT+7", "yyyy-MM-dd") : value;
        break;
      case 'QC_Status':
        result.tinhTrangChatLuong = value;
        break;
      case 'ĐV_SX':
        result.phanXuong = value;
        break;
      default:
        // Giả định các cột còn lại là kho và lấy số lượng tồn
        if (header && (header.startsWith('ĐT') || header.startsWith('CP') || header.startsWith('QN'))) {
          result.inventory[header] = parseFloat(value) || 0;
        }
        break;
    }
  });

  return result;
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

  if (sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) {
     throw new Error(`Lỗi nghiêm trọng: Sheet "${MASTER_INVENTORY_SHEET}" không hợp lệ. Vui lòng chạy lại "Thiết lập cấu trúc".`);
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
  
  SpreadsheetApp.flush(); // Buộc ghi dữ liệu trước khi xóa

  _removeZeroInventoryRows(sheet, headers); // Xóa các hàng có tồn kho bằng 0
}

/**
 * REFACTORED (v2): Tìm hoặc tạo hàng mới dựa trên cấu trúc cột động.
 */
function _findOrCreateInventoryRow(sheet, headers, txObject) {
  const indexCol = headers.indexOf('INDEX');
  if (indexCol === -1) throw new Error("Không tìm thấy cột 'INDEX' trong sheet tồn kho.");

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
        case 'Tổng SL': return null; // Để công thức tự tính
        default: return 0; // Mặc định số lượng kho là 0
      }
    });
    sheet.appendRow(newRowData);
    return sheet.getLastRow();
  }
}

/**
 * Tìm và xóa tất cả các hàng có giá trị ở cột "Tổng SL" bằng 0.
 */
function _removeZeroInventoryRows(sheet, headers) {
  const totalColIndex = headers.indexOf('Tổng SL');
  if (totalColIndex === -1) {
    Logger.log('Cảnh báo: Không tìm thấy cột "Tổng SL" để thực hiện xóa hàng tồn kho bằng 0.');
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return; // Không có dữ liệu để xóa

  const totalValues = sheet.getRange(3, totalColIndex + 1, lastRow - 2, 1).getValues();
  const rowsToDelete = [];

  totalValues.forEach((row, index) => {
    if (parseFloat(row[0]) === 0) {
      // +3 vì dữ liệu bắt đầu từ hàng 3
      rowsToDelete.push(index + 3);
    }
  });

  // Xóa hàng từ dưới lên để tránh làm thay đổi chỉ số của các hàng còn lại
  if (rowsToDelete.length > 0) {
    rowsToDelete.reverse().forEach(rowIndex => {
      sheet.deleteRow(rowIndex);
    });
    Logger.log(`Đã xóa ${rowsToDelete.length} hàng có tồn kho bằng 0.`);
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

// ===================================================================================
// LOGIC TRA CỨU
// ===================================================================================

/**
 * Thực hiện tìm kiếm trong sheet TON_KHO_tonghop dựa trên nhiều tiêu chí.
 * @param {object} searchCriteria - Đối tượng chứa các tiêu chí tìm kiếm.
 * @returns {object} - Một đối tượng chứa kết quả, bao gồm headers và data.
 */
function service_performSearch(searchCriteria) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) throw new Error(`Không tìm thấy sheet tồn kho chính: "${MASTER_INVENTORY_SHEET}"`);

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return { success: true, headers: [], data: [], message: 'Không có dữ liệu tồn kho để tìm kiếm.' };

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const allData = sheet.getRange(3, 1, lastRow - 2, sheet.getLastColumn()).getValues();
  
  const indexCol = headers.indexOf('INDEX');
  const tenSpCol = headers.indexOf('Tên_SP');
  const loSxCol = headers.indexOf('Lô_SX');
  const quyCachCol = headers.indexOf('Quy_Cách');
  const qcStatusCol = headers.indexOf('QC_Status');
  const ngaySxCol = headers.indexOf('Ngày_SX');
  const tongDtCol = headers.indexOf('Tổng_ĐT');

  // --- LOGIC TÌM KIẾM THÔNG MINH ---
  // 1. Nếu có INDEX, chỉ tìm theo INDEX
  if (searchCriteria.index) {
    const result = allData.find(row => row[indexCol] === searchCriteria.index);
    const finalData = result ? [result] : [];
    return formatAndReturn(finalData, headers);
  }

  // 2. Kiểm tra xem Tên Sản Phẩm có phải là một INDEX không
  if (searchCriteria.tenSanPham) {
      const potentialIndex = searchCriteria.tenSanPham.toUpperCase();
      const result = allData.find(row => row[indexCol] === potentialIndex);
      if (result) {
          // Nếu các trường khác cũng được điền và mâu thuẫn -> báo lỗi
          if ((searchCriteria.loSanXuat && result[loSxCol] !== searchCriteria.loSanXuat) ||
              (searchCriteria.quyCach && result[quyCachCol] !== searchCriteria.quyCach)) {
              throw new Error(`Xung đột dữ liệu: INDEX '${potentialIndex}' được tìm thấy, nhưng các tiêu chí khác (Lô, Quy cách) không khớp. Vui lòng chỉ tìm theo INDEX hoặc các tiêu chí khác.`);
          }
          return formatAndReturn([result], headers);
      }
  }
  
  // 3. Tìm kiếm kết hợp nhiều tiêu chí
  const filteredData = allData.filter(row => {
    // Lọc bỏ các hàng có tổng tồn kho bằng 0
    if (parseFloat(row[tongDtCol]) === 0) {
      return false;
    }
  
    const tenSpMatch = !searchCriteria.tenSanPham || row[tenSpCol].toString().toLowerCase().includes(searchCriteria.tenSanPham.toLowerCase());
    const loSxMatch = !searchCriteria.loSanXuat || row[loSxCol].toString().toLowerCase().includes(searchCriteria.loSanXuat.toLowerCase());
    const quyCachMatch = !searchCriteria.quyCach || row[quyCachCol].toString().toLowerCase().includes(searchCriteria.quyCach.toLowerCase());
    const qcStatusMatch = !searchCriteria.qcStatus || row[qcStatusCol] === searchCriteria.qcStatus;
    
    const startDate = searchCriteria.ngaySXStart ? new Date(searchCriteria.ngaySXStart) : null;
    const endDate = searchCriteria.ngaySXEnd ? new Date(searchCriteria.ngaySXEnd) : null;
    if (endDate) endDate.setDate(endDate.getDate() + 1); // Bao gồm cả ngày kết thúc
    
    const cellDate = row[ngaySxCol] ? new Date(row[ngaySxCol]) : null;
    
    const dateMatch = (!startDate || (cellDate && cellDate >= startDate)) && (!endDate || (cellDate && cellDate < endDate));

    return tenSpMatch && loSxMatch && quyCachMatch && qcStatusMatch && dateMatch;
  });

  return formatAndReturn(filteredData, headers);
}

/**
 * Hàm trợ giúp để định dạng ngày và trả về kết quả tìm kiếm.
 */
function formatAndReturn(data, headers) {
    if (data.length === 0) {
      return { success: true, headers: headers, data: [], message: 'Không tìm thấy kết quả nào phù hợp.' };
  }
  
  const ngaySXIndex = headers.indexOf('Ngày_SX');
  const formattedData = data.map(row => {
      if (ngaySXIndex !== -1 && row[ngaySXIndex] instanceof Date) {
          row[ngaySXIndex] = Utilities.formatDate(row[ngaySXIndex], "GMT+7", "dd/MM/yyyy");
      }
      return row;
  });

  return { success: true, headers: headers, data: formattedData };
}


// ===================================================================================
// DASHBOARD LOGIC
// ===================================================================================

function service_getDashboardData(filters) {
  const { headers, data } = db_getInventoryData();
  if (data.length === 0) {
    return { headers: headers, data: [] };
  }

  const searchTerm = filters.searchTerm ? filters.searchTerm.toLowerCase() : '';
  const khoFilter = filters.kho;
  // Khu vực filter is not directly applicable on TON_KHO_tonghop, but we keep it for future use
  // const khuVucFilter = filters.khuVuc;

  const filteredData = data.filter(row => {
    // Combine multiple columns for a general search
    const rowString = row.join(' ').toLowerCase();
    const searchMatch = searchTerm ? rowString.includes(searchTerm) : true;
    
    // Filter by warehouse value
    let khoMatch = true;
    if (khoFilter) {
      const khoIndex = headers.indexOf(khoFilter);
      if (khoIndex !== -1) {
        khoMatch = parseFloat(row[khoIndex]) > 0;
      } else {
        khoMatch = false; // If kho doesn't exist in header, it's a mismatch
      }
    }

    return searchMatch && khoMatch;
  });

  return { headers: headers, data: filteredData };
}

function service_getFilterOptions() {
  return db_getFilterOptionsFromDanhMuc();
}