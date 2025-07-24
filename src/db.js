/**
 * @OnlyCurrentDoc
 * TỆP TRUY CẬP DỮ LIỆU (DATABASE LAYER) - KIẾN TRÚC NAMED RANGE
 * Chứa các hàm để đọc và ghi dữ liệu từ các vùng được đặt tên (Named Ranges).
 */

/**
 * Hàm trợ giúp chung để đọc một vùng được đặt tên và chuyển thành mảng các đối tượng.
 * SỬA LỖI: Ánh xạ tiêu đề tiếng Việt sang key camelCase để tương thích với service layer.
 * @param {string} rangeName Tên của vùng dữ liệu cần đọc.
 * @returns {object[]} Một mảng các đối tượng, mỗi đối tượng đại diện cho một dòng.
 */
function db_getNamedRangeAsObjects(rangeName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const range = ss.getRangeByName(rangeName);
  if (!range) {
    Logger.log(`Cảnh báo: Không tìm thấy vùng được đặt tên "${rangeName}".`);
    return [];
  }
  const values = range.getValues();
  if (!values || values.length < 2) { // Cần có ít nhất 1 dòng header và 1 dòng dữ liệu
    return [];
  }
  
  const headers = values.shift().map(h => h.toString().trim());

  // Ánh xạ từ tiêu đề trên sheet sang key trong object JavaScript
  const headerToKeyMap = {
    'Nhập/xuất': 'loaiGiaoDich',
    'Tên sản phẩm': 'tenSanPham',
    'Quy cách': 'quyCach',
    'Số lượng': 'soLuong',
    'Ngày sản xuất': 'ngaySanXuat',
    'Phân xưởng': 'phanXuong',
    'Mã kho': 'maKho',
    'Đơn vị': 'donVi',
    'Tình trạng chất lượng': 'tinhTrangChatLuong',
    'Ghi chú': 'ghiChu',
    'Mã index': 'index',
    'Mã lô': 'loSanXuat'
  };

  // Chuyển đổi mảng headers gốc sang mảng keys tương ứng
  const keys = headers.map(header => headerToKeyMap[header] || header);

  return values.map(row => {
    if (row.every(cell => cell === '')) return null; // Bỏ qua các dòng hoàn toàn trống
    
    const obj = {};
    keys.forEach((key, index) => {
      obj[key] = row[index];
    });
    return obj;
  }).filter(obj => obj !== null); // Lọc bỏ các dòng trống đã được đánh dấu là null
}

/**
 * Tìm thông tin sản phẩm trong bảng 'Bảng_Sản phẩm'.
 * @param {string} productName Tên sản phẩm cần tìm.
 * @returns {object | null} Đối tượng chứa thông tin sản phẩm, hoặc null nếu không tìm thấy.
 */
function db_findProduct(productName) { // Giá trị đầu vào (productName) thực chất là mã viết tắt.
  // SỬA LỖI CUỐI CÙNG: Khớp chính xác chữ hoa/thường
  const products = db_getNamedRangeAsObjects('Bảng_Sản_Phẩm');
  
  const trimmedInput = productName ? productName.toString().trim().toUpperCase() : '';
  if (!trimmedInput) return null;

  return products.find(p => {
    // Tìm kiếm dựa trên cột 'Viết tắt'
    const dbProductAbbrValue = p['Viết tắt'];
    const dbProductAbbr = dbProductAbbrValue ? dbProductAbbrValue.toString().trim().toUpperCase() : '';
    return dbProductAbbr === trimmedInput;
  }) || null;
}

/**
 * Tìm thông tin kho trong 'Bảng_Danh_sách_Kho' dựa trên mã kho.
 * Hàm này được xây dựng lại để đảm bảo tính mạnh mẽ và chính xác.
 * @param {string} maKhoInput - Mã kho cần tìm (ví dụ: 'VLN-ĐT-K9').
 * @returns {object | null} Đối tượng chứa thông tin kho, hoặc null nếu không tìm thấy.
 */
function db_findWarehouse(maKhoInput) {
  // Bước 1: Kiểm tra đầu vào ngay lập tức.
  if (!maKhoInput || typeof maKhoInput.toString !== 'function') {
    return null;
  }

  // Bước 2: Lấy tất cả các kho. Hàm db_getNamedRangeAsObjects đã xử lý việc
  // chuyển đổi key từ 'Mã kho' thành 'maKho'.
  const warehouses = db_getNamedRangeAsObjects('Bảng_Danh_Sách_Kho');
  
  // Bước 3: Chuẩn hóa đầu vào để so sánh.
  const normalizedInput = maKhoInput.toString().trim().toUpperCase();

  // Bước 4: Tìm kiếm kho với logic so sánh an toàn.
  const foundWarehouse = warehouses.find(warehouse => {
    // Lấy giá trị 'maKho' từ đối tượng đã được chuẩn hóa.
    const dbCodeValue = warehouse.maKho;
    
    // Nếu kho không có mã kho, bỏ qua.
    if (!dbCodeValue) {
      return false;
    }
    
    // Chuẩn hóa và so sánh.
    const normalizedDbCode = dbCodeValue.toString().trim().toUpperCase();
    return normalizedDbCode === normalizedInput;
  });

  // Bước 5: Trả về kết quả tìm thấy hoặc null.
  return foundWarehouse || null;
}

/**
 * Tìm thông tin phân xưởng trong bảng 'Bảng_Mã phân xưởng'.
 * @param {string} factoryCode Mã phân xưởng cần tìm (ví dụ: 'ĐT').
 * @returns {object | null} Đối tượng chứa thông tin phân xưởng, hoặc null nếu không tìm thấy.
 */
function db_findFactory(factoryCode) {
    const factories = db_getNamedRangeAsObjects('Bảng_Mã_Phân_Xưởng');

    const trimmedInput = factoryCode ? factoryCode.toString().trim().toUpperCase() : '';
    if (!trimmedInput) return null;

    return factories.find(f => {
      // Cải thiện logic tìm kiếm cho mạnh mẽ hơn
      const dbFactoryCodeValue = f['Mã phân xưởng'];
      const dbFactoryCode = dbFactoryCodeValue ? dbFactoryCodeValue.toString().trim().toUpperCase() : '';
      return dbFactoryCode === trimmedInput;
    }) || null;
}

/**
 * Lấy các giao dịch gần đây nhất từ sheet LOG.
 * @param {number} numberOfRows Số lượng dòng cần lấy.
 * @returns {Array<Array<any>>} Mảng 2 chiều chứa dữ liệu các dòng gần đây.
 */
function db_getRecentLogs(numberOfRows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('LOG');
  if (!logSheet) {
    Logger.log('Cảnh báo: Không tìm thấy sheet log: "LOG"');
    return [];
  }

  const lastRow = logSheet.getLastRow();
  // Bắt đầu từ dòng 2 để bỏ qua tiêu đề
  const firstRowToGet = Math.max(2, lastRow - numberOfRows + 1);
  if (firstRowToGet > lastRow) {
    return []; // Không có dữ liệu
  }

  const numRowsToGet = lastRow - firstRowToGet + 1;
  // SỬA: LOG giờ có 19 cột
  const range = logSheet.getRange(firstRowToGet, 1, numRowsToGet, 19);
  return range.getValues();
}


/**
 * Luôn luôn thêm một dòng mới vào sheet DATABASE cho mỗi giao dịch.
 * @param {object} logObject - Đối tượng dữ liệu đã được làm giàu.
 */
function db_appendToDatabase(logObject) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName('DATABASE');
  if (!dbSheet) {
    throw new Error('Không tìm thấy sheet "DATABASE". Vui lòng tạo nó.');
  }

  // DATABASE có 18 cột (bỏ timestamp)
  const newRowData = [
    logObject.maIndex,
    logObject.tenSanPhamDayDu, // THÊM: Tên sản phẩm đầy đủ
    logObject.vietTat,
    logObject.quyCach, logObject.soLuong, logObject.donVi, logObject.ngaySanXuat,
    logObject.donViSanXuat, logObject.maLo, logObject.ngayNhapXuat,
    logObject.maKho, logObject.loaiKho, logObject.khuVuc,
    logObject.tenKho, logObject.tinhTrangChatLuong, logObject.hanSuDung,
    logObject.nhapXuat, logObject.ghiChu
  ];

  // Logic mới: Luôn luôn thêm dòng mới, không bao giờ cập nhật.
  dbSheet.appendRow(newRowData);
  Logger.log(`Đã thêm dòng mới cho maIndex "${logObject.maIndex}" vào DATABASE.`);
}


/**
 * Ghi một đối tượng log đã được làm giàu vào sheet `LOG`.
 * @param {object} logObject - Đối tượng chứa đầy đủ 18 trường dữ liệu cho sheet LOG.
 */
function addTransactionToLog(logObject) {
  // Cần đảm bảo hằng số LOG_SHEET_NAME được định nghĩa là 'LOG' trong file config.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('LOG'); 
  
  if (!logSheet) {
    throw new Error('Không tìm thấy sheet log: "LOG"');
  }

  // Sắp xếp dữ liệu theo đúng thứ tự 19 cột của sheet LOG theo yêu cầu mới
  const newRow = [
      logObject.maIndex,
      logObject.timestamp,
      logObject.tenSanPhamDayDu, // Cột mới
      logObject.vietTat,
      logObject.quyCach,
      logObject.soLuong,
      logObject.donVi,
      logObject.ngaySanXuat,
      logObject.donViSanXuat,
      logObject.maLo,
      logObject.ngayNhapXuat,
      logObject.maKho,
      logObject.loaiKho,
      logObject.khuVuc,
      logObject.tenKho,
      logObject.tinhTrangChatLuong,
      logObject.hanSuDung,
      logObject.nhapXuat,
      logObject.ghiChu
  ];

  logSheet.appendRow(newRow);
}

/**
 * Đọc toàn bộ dữ liệu từ sheet DATABASE và chuyển thành mảng các đối tượng.
 * @returns {object[]} Một mảng các đối tượng, mỗi đối tượng đại diện cho một dòng trong DATABASE.
 */
function db_getAllDatabaseRecords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dbSheet = ss.getSheetByName('DATABASE');
  if (!dbSheet || dbSheet.getLastRow() < 2) {
    Logger.log('Cảnh báo: Không tìm thấy sheet "DATABASE" hoặc sheet không có dữ liệu.');
    return [];
  }
  
  const range = dbSheet.getRange(1, 1, dbSheet.getLastRow(), dbSheet.getLastColumn());
  const values = range.getValues();
  
  const headers = values.shift().map(h => h.toString().trim());

  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * Tìm bản ghi GẦN NHẤT trong DATABASE dựa trên Mã Index.
 * @param {string} maIndex - Mã Index cần tìm.
 * @returns {object | null} Đối tượng dữ liệu của bản ghi, hoặc null nếu không tìm thấy.
 */
function db_findRecordInDatabase(maIndex) {
    if (!maIndex) return null;
    const allRecords = db_getAllDatabaseRecords();
    // Tìm từ dưới lên để lấy bản ghi mới nhất
    for (let i = allRecords.length - 1; i >= 0; i--) {
        if (allRecords[i]['Mã index'] === maIndex) {
            return allRecords[i];
        }
    }
    return null;
}


/**
 * Lấy số lượng tồn kho từ sheet 'BẢNG TỒN KHO'.
 * @param {string} maIndex - Mã Index của sản phẩm.
 * @param {string} maKho - Mã của kho cần kiểm tra.
 * @returns {number} Số lượng tồn kho. Trả về 0 nếu không tìm thấy.
 */
function db_getStockQuantity(maIndex, maKho) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const inventorySheet = ss.getSheetByName('BẢNG TỒN KHO');
    if (!inventorySheet) {
        throw new Error("Không tìm thấy sheet 'BẢNG TỒN KHO'.");
    }

    // 1. Tìm cột của kho
    const headerRange = inventorySheet.getRange('B6:6');
    const headerValues = headerRange.getValues()[0];
    const khoColIndex = headerValues.findIndex(header => header === maKho);

    if (khoColIndex === -1) {
        Logger.log(`Không tìm thấy cột cho kho '${maKho}' trong sheet 'BẢNG TỒN KHO'.`);
        return 0; // Không tìm thấy kho, coi như hết hàng
    }
    const khoCol = khoColIndex + headerRange.getColumn(); // +B (2)

    // 2. Tìm hàng của Mã Index
    const indexRange = inventorySheet.getRange('A7:A');
    const indexValues = indexRange.getValues();
    const indexRowIndex = indexValues.findIndex(row => row[0] === maIndex);

    if (indexRowIndex === -1) {
        Logger.log(`Không tìm thấy hàng cho Mã Index '${maIndex}' trong sheet 'BẢNG TỒN KHO'.`);
        return 0; // Không tìm thấy sản phẩm, coi như hết hàng
    }
    const indexRow = indexRowIndex + indexRange.getRow(); // +7

    // 3. Lấy giá trị tồn kho tại giao điểm
    const stock = inventorySheet.getRange(indexRow, khoCol).getValue();
    return !isNaN(stock) ? Number(stock) : 0;
}