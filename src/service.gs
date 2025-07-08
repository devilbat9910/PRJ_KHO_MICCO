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
  if (!formObject.tenSanPham || !formObject.soLuong || !formObject.ngaySanXuat || !formObject.phanXuong) {
    throw new Error("Thiếu các yếu tố bắt buộc để tạo SKU: Tên Sản Phẩm, Số Lượng, Ngày Sản Xuất, Phân Xưởng.");
  }
  if (formObject.loaiGiaoDich === 'Điều chuyển' && !formObject.khoDi) {
    throw new Error("Giao dịch 'Điều chuyển' yêu cầu phải có 'Kho Đi'.");
  }
  const quantity = parseFloat(formObject.soLuong);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error("Số lượng không hợp lệ. Phải là một số lớn hơn 0.");
  }

  // --- CHUẨN HÓA DỮ LIỆU ---
  formObject.quyCach = formObject.quyCach ? formObject.quyCach.toUpperCase() : 'NA';
  
  // --- LOGIC CHÍNH ---
  const sku = generateSku(formObject, categoryData.productMap);
  const productionDate = formObject.ngaySanXuat;

  if (formObject.loaiGiaoDich === 'Điều chuyển') {
    // Tạo 2 giao dịch: 1 xuất, 1 nhập
    const baseTx = {
      sku: sku,
      tenSanPham: formObject.tenSanPham,
      quyCach: formObject.quyCach,
      loSanXuat: formObject.loSanXuat,
      ngaySanXuat: productionDate,
      tinhTrangChatLuong: formObject.tinhTrangChatLuong,
      phanXuong: formObject.phanXuong,
    };

    // 1. Giao dịch xuất từ kho nguồn
    const exportTx = {
      ...baseTx,
      loaiGiaoDich: 'Xuất (Điều chuyển)',
      soLuong: -quantity, // Số lượng âm
      kho: formObject.khoDi,
      ghiChu: `Từ kho ${formObject.khoDi} đến kho ${formObject.kho}. ${formObject.ghiChu || ''}`.trim()
    };
    addTransactionToLog(exportTx);

    // 2. Giao dịch nhập vào kho đích
    const importTx = {
      ...baseTx,
      loaiGiaoDich: 'Nhập (Điều chuyển)',
      soLuong: quantity, // Số lượng dương
      kho: formObject.kho,
      ghiChu: `Từ kho ${formObject.khoDi} đến kho ${formObject.kho}. ${formObject.ghiChu || ''}`.trim()
    };
    addTransactionToLog(importTx);

  } else {
    // Xử lý Nhập/Xuất đơn giản
    const finalQuantity = formObject.loaiGiaoDich === 'Nhập' ? quantity : -quantity;
    const txObject = {
      sku: sku,
      loaiGiaoDich: formObject.loaiGiaoDich,
      tenSanPham: formObject.tenSanPham,
      quyCach: formObject.quyCach,
      loSanXuat: formObject.loSanXuat,
      ngaySanXuat: productionDate,
      tinhTrangChatLuong: formObject.tinhTrangChatLuong,
      soLuong: finalQuantity,
      phanXuong: formObject.phanXuong,
      kho: formObject.kho,
      ghiChu: formObject.ghiChu
    };
    addTransactionToLog(txObject);
  }
  
  return { success: true, message: "Giao dịch thành công!" };
}

/**
 * Tạo mã SKU theo quy tắc mới, sử dụng productMap và xử lý ANFO.
 * @param {object} txObject - Đối tượng giao dịch từ form.
 * @param {object} productMap - Map thông tin sản phẩm từ getCategoryData.
 * @returns {string} - Mã SKU.
 */
function generateSku(txObject, productMap) {
    const productInfo = productMap[txObject.tenSanPham];
    
    const factoryMap = {
      'Px Đông Triều': 'ĐT',
      'Px Cẩm Phả': 'CP',
      'Px Quảng Ninh': 'QN'
    };
    const factoryCode = factoryMap[txObject.phanXuong] || 'OTHER';

    // **FIX SKU GENERATION**
    // Ưu tiên lotCode, nếu không có thì dùng shortName làm fallback.
    let productCode = 'UNKNOWN';
    if (productInfo) {
        if (productInfo.lotCode) {
            productCode = productInfo.lotCode;
            if (productCode.includes('{PX}')) {
                productCode = productCode.replace('{PX}', factoryCode);
            }
        } else if (productInfo.shortName) {
            productCode = productInfo.shortName;
        }
    }

    const quyCach = txObject.quyCach ? txObject.quyCach.toUpperCase() : 'NA';

    // Định dạng ngày tháng từ object Date hoặc string
    const date = new Date(txObject.ngaySanXuat);
    const dateString = Utilities.formatDate(date, "GMT+7", "ddMMyy"); // Dùng GMT+7 cho chắc chắn

    return `${productCode}-${quyCach}-${dateString}-${factoryCode}`;
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