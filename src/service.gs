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
  // Return only the necessary parts for the initial dropdown population
  return {
    products: categories.productDropdown,
    factories: categories.factories,
    warehouses: categories.warehouses
  };
}

function suggestLotNumber(productShortName, factory, dateStr) {
  if (!productShortName || !dateStr) {
    return ""; // Return empty if essential info is missing
  }
  
  const categories = getCategoryData();
  const date = new Date(dateStr);
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear().toString().slice(-2);

  // Special rule for Quang Ninh
  if (factory === 'PX Quảng Ninh') {
    factory = 'PX Quảng Ninh HG'; // Temporary mapping to find the HG code
  }

  const match = categories.allData.find(p => p.shortName === productShortName && p.factory === factory);
  
  let lotCode = productShortName.replace(/[\s-]/g, ''); // Default if no specific code found
  if (match && match.lotCode) {
    lotCode = match.lotCode;
  }
  
  return `${month}${year}${lotCode}`;
}

/**
 * Xử lý dữ liệu từ form, điều phối việc ghi log.
 * @param {object} formObject - Dữ liệu từ form.
 */
function processTransaction(formObject) {
  // TODO:
  // 1. Validate input
  // 2. Generate SKU
  // 3. Call db.addTransactionToLog(txObject)
  
  const sku = generateSku(formObject); // We need to move generateSku here
  const txObject = { ...formObject, sku: sku, ngayGiaoDich: new Date() };

  addTransactionToLog(txObject); // This function is in db.gs

  return { success: true, message: "Giao dịch đã được ghi nhận." };
}

/**
 * Tạo mã SKU. Hàm này được chuyển từ logic.js cũ.
 * @param {object} txObject - Đối tượng giao dịch.
 * @returns {string} - Mã SKU.
 */
function generateSku(txObject) {
    const productCode = txObject.tenSanPham.split(' ').pop();
    const date = new Date();
    const dateString = Utilities.formatDate(date, "GMT", "ddMMyy");
    const factory = txObject.phanXuong.substring(0, 2).toUpperCase();
    return `${productCode}-${txObject.quyCach}-${dateString}-${factory}`;
}