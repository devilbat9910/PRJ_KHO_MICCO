/**
 * @OnlyCurrentDoc
 * TỆP DỊCH VỤ (SERVICE LAYER)
 * Chứa logic nghiệp vụ, điều phối dữ liệu giữa UI và DB.
 * Không tương tác trực tiếp với Sheet.
 */

/**
 * Lấy dữ liệu tồn kho đã được tính toán sẵn từ View.
 * Tích hợp CacheService để tăng tốc độ.
 */
function getInventoryView() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'inventory_view_data';
  
  const cachedData = cache.get(cacheKey);
  if (cachedData != null) {
    return JSON.parse(cachedData);
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const viewSheet = ss.getSheetByName(VIEW_INVENTORY_SHEET_NAME);
  if (!viewSheet) {
    return []; // Return empty if view doesn't exist
  }

  const data = viewSheet.getDataRange().getDisplayValues();
  
  // Cache the result for 5 minutes (300 seconds)
  cache.put(cacheKey, JSON.stringify(data), 300);
  
  return data;
}

/**
 * Lấy dữ liệu cho các dropdown trên form.
 * Hàm này sẽ thay thế hàm getDropdownData cũ.
 */
function getMasterDataForForm() {
  const categories = getCategoryData();
  // Trả về dữ liệu đã được xử lý bởi hàm getCategoryData mới
  return {
    products: categories.productDropdown,
    factories: categories.factories,
    warehouses: categories.warehouses
  };
}

function suggestLotNumber(productName, factory, dateStr) {
  if (!productName || !dateStr || !factory) {
    return "";
  }

  const categories = getCategoryData();
  const productInfo = categories.productMap[productName];

  if (!productInfo || !productInfo.lotCode) {
    // Fallback to shortName if lotCode is missing
    return productInfo ? productInfo.shortName : "";
  }

  const date = new Date(dateStr);
  const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
  const year = date.getUTCFullYear().toString().slice(-2);
  
  let lotCode = productInfo.lotCode;

  // Handle ANFO special rule
  if (lotCode.includes('{PX}')) {
    const factoryMap = { 'Px Đông Triều': 'ĐT', 'Px Cẩm Phả': 'CP', 'Px Quảng Ninh': 'QN' };
    const factoryCode = factoryMap[factory] || '';
    lotCode = lotCode.replace('{PX}', factoryCode);
  }
  
  return `${month}${year}${lotCode}`;
}

/**
 * Xử lý dữ liệu từ form, điều phối việc ghi log.
 * @param {object} formObject - Dữ liệu từ form.
 */
/**
 * Xử lý một giao dịch duy nhất, tạo SKU và chuẩn bị dữ liệu để ghi log.
 * @param {object} formObject - Dữ liệu thô từ form hoặc bảng.
 * @returns {object} - Kết quả xử lý.
 */
function service_processSingleTransaction(formObject) {
  const categoryData = getCategoryData();

  // --- VALIDATION ---
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

  // --- ANRICHMENT & NORMALIZATION (Làm giàu & Chuẩn hóa dữ liệu) ---
  const productInfo = categoryData.productMap[formObject.tenSanPham];
  if (!productInfo) {
    throw new Error(`Không tìm thấy thông tin sản phẩm cho: "${formObject.tenSanPham}" trong DANH MUC.`);
  }

  const productionDate = new Date(formObject.ngaySanXuat);
  const expiryDate = new Date(productionDate.getTime());
  expiryDate.setDate(expiryDate.getDate() + 30);

  const txObject = {
    ...formObject,
    soLuong: quantity,
    ngaySanXuat: productionDate,
    ngayThuNo: expiryDate,
    tenVietTat: productInfo.shortName,
    quyCach: productInfo.quyCach, // Lấy từ DANH MUC
    donViSanXuat: productInfo.factory, // Lấy từ DANH MUC
  };
  
  // Tạo SKU sau khi đã có đủ thông tin
  txObject.sku = generateSku(txObject);

  // --- LOGIC CHÍNH ---
  // 1. Cập nhật ma trận tồn kho
  updateMasterInventory(txObject);

  // 2. Ghi lại giao dịch vào Log (luôn ghi số lượng dương cho log)
  const logObject = {
      ...txObject,
      soLuong: quantity, // Ghi lại số lượng gốc, không âm
      // Đảm bảo các trường khớp với hàm addTransactionToLog
      tenSanPham: formObject.tenSanPham,
      phanXuong: txObject.donViSanXuat,
  };
  addTransactionToLog(logObject);
  
  return { success: true, message: "Giao dịch thành công!" };
}

/**
 * Tạo mã SKU theo quy tắc mới, sử dụng productMap và xử lý ANFO.
 * @param {object} txObject - Đối tượng giao dịch từ form.
 * @param {object} productMap - Map thông tin sản phẩm từ getCategoryData.
 * @returns {string} - Mã SKU.
 */
function generateSku(txObject) {
    // SKU được tạo từ các thuộc tính đã được chuẩn hóa của lô hàng
    const productCode = txObject.tenVietTat || 'NA';
    const lotNumber = txObject.loSanXuat || 'NA';
    const quality = txObject.tinhTrangChatLuong || 'NA';
    
    // Định dạng ngày tháng từ object Date
    const dateString = Utilities.formatDate(new Date(txObject.ngaySanXuat), "GMT+7", "ddMMyy");

    return `${productCode}-${lotNumber}-${dateString}-${quality}`.toUpperCase().replace(/ /g, '-');
}

/**
 * Lấy 10 giao dịch gần nhất từ log.
 * @returns {Array<Array<any>>} Mảng 2D chứa dữ liệu giao dịch.
 */
function service_getRecentTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet) {
    return [];
  }

  const lastRow = logSheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const startRow = Math.max(2, lastRow - 9); // Lấy tối đa 10 hàng, bắt đầu từ hàng 2
  const numRows = lastRow - startRow + 1;
  
  // Chỉ lấy các cột cần thiết cho Trang Chính (11 cột từ B đến L)
  const range = logSheet.getRange(startRow, 2, numRows, 11); // Từ cột B (INDEX) đến cột L (Ghi Chú)
  const data = range.getValues(); // Lấy giá trị gốc để xử lý ngày tháng

  // Chuẩn hóa định dạng ngày tháng và các giá trị khác
  data.forEach(row => {
    // row[4] là 'Ngày Sản Xuất' trong dải ô B:L
    if (row[4] instanceof Date) {
      row[4] = Utilities.formatDate(row[4], "GMT+7", "yyyy-MM-dd");
    }
    // row[2] là 'Quy Cách'
    if (typeof row[2] === 'string') {
      row[2] = row[2].toUpperCase();
    }
  });

  return data.reverse(); // Đảo ngược để giao dịch mới nhất lên đầu
}

// ===================================================================================
// WAREHOUSE MATRIX SERVICE - LOGIC MỚI
// ===================================================================================

const MASTER_INVENTORY_SHEET = 'TON_KHO_tonghop';

/**
 * Hàm điều phối chính (pipeline) để cập nhật ma trận tồn kho.
 * @param {object} txObject - Đối tượng giao dịch đã được chuẩn hóa.
 */
function updateMasterInventory(txObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MASTER_INVENTORY_SHEET);
  if (!sheet) throw new Error(`Không tìm thấy sheet tồn kho chính: "${MASTER_INVENTORY_SHEET}"`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Tìm hoặc tạo hàng tồn kho cho SKU này
  const targetRow = _findOrCreateInventoryRow(sheet, headers, txObject);

  // Xử lý các loại giao dịch
  if (txObject.loaiGiaoDich === 'Điều chuyển') {
    // Trừ ở kho đi
    _updateInventoryValue(sheet, headers, targetRow, txObject.khoDi, -txObject.soLuong);
    // Cộng ở kho đến
    _updateInventoryValue(sheet, headers, targetRow, txObject.kho, txObject.soLuong);
  } else {
    const quantity = txObject.loaiGiaoDich === 'Nhập' ? txObject.soLuong : -txObject.soLuong;
    _updateInventoryValue(sheet, headers, targetRow, txObject.kho, quantity);
  }
}

/**
 * Tìm hàng dựa trên SKU. Nếu không có, tạo một hàng mới với dữ liệu định danh.
 * @private
 * @param {Sheet} sheet - Sheet tồn kho.
 * @param {string[]} headers - Mảng tiêu đề.
 * @param {object} txObject - Đối tượng giao dịch.
 * @returns {number} - Số thứ tự của hàng được tìm thấy hoặc mới tạo.
 */
function _findOrCreateInventoryRow(sheet, headers, txObject) {
  const skuColumnIndex = headers.indexOf('INDEX (SKU)') + 1;
  if (skuColumnIndex === 0) throw new Error("Không tìm thấy cột 'INDEX (SKU)'");

  const skus = sheet.getRange(2, skuColumnIndex, sheet.getLastRow(), 1).getValues();
  const skuRow = skus.findIndex(row => row[0] === txObject.sku);

  if (skuRow !== -1) {
    return skuRow + 2; // +2 vì mảng bắt đầu từ 0 và sheet bắt đầu từ 1, và có 1 hàng header
  } else {
    // Tạo hàng mới
    const newRowData = headers.map(header => {
      switch (header) {
        case 'INDEX (SKU)': return txObject.sku;
        case 'Tên Viết Tắt': return txObject.tenVietTat;
        case 'Quy Cách': return txObject.quyCach;
        case 'Đơn Vị Sản Xuất': return txObject.donViSanXuat;
        case 'Lô Sản Xuất': return txObject.loSanXuat;
        case 'Ngày Sản Xuất': return txObject.ngaySanXuat;
        case 'Tình Trạng Chất Lượng': return txObject.tinhTrangChatLuong;
        case 'Ngày Thử Nổ': return txObject.ngayThuNo;
        default: return 0; // Mặc định số lượng tồn kho ở các kho là 0
      }
    });
    sheet.appendRow(newRowData);
    return sheet.getLastRow();
  }
}

/**
 * Cập nhật giá trị tồn kho tại một ô cụ thể.
 * @private
 */
function _updateInventoryValue(sheet, headers, row, warehouseName, quantityChange) {
  const warehouseColumnIndex = headers.indexOf(warehouseName);
  if (warehouseColumnIndex === -1) {
    throw new Error(`Tên kho không hợp lệ hoặc không tìm thấy trong tiêu đề: "${warehouseName}"`);
  }
  
  const cell = sheet.getRange(row, warehouseColumnIndex + 1);
  const currentValue = parseFloat(cell.getValue()) || 0;
  cell.setValue(currentValue + quantityChange);
}