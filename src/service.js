/**
 * @OnlyCurrentDoc
 * TỆP DỊCH VỤ (SERVICE LAYER) - KIẾN TRÚC NAMED RANGE
 * Nhiệm vụ: Nhận dữ liệu thô, gọi các hàm db để tra cứu từ các vùng được đặt tên,
 * làm giàu dữ liệu và ghi vào LOG.
 */

// Placeholder for a product when lookup fails
const productNotFound = {
  'Tên sản phẩm': 'KHÔNG TÌM THẤY',
  'Viết tắt': 'LỖI_TRA_CỨU',
  'HSD (tháng)': null,
  'Mã Lô/ Mã ngắn': 'LỖI',
  'Đơn vị': ''
};

// Placeholder for a warehouse when lookup fails
const warehouseNotFound = {
  maKho: 'KHÔNG TÌM THẤY', // SỬA: Dùng key camelCase để nhất quán
  'Loại kho': '',
  'Khu vực': '',
  'Tên kho': 'LỖI_TRA_CỨU'
};

// Placeholder for a factory when lookup fails
const factoryNotFound = {
  'Mã phân xưởng': 'LỖI'
};

/**
 * Xử lý một giao dịch duy nhất từ sheet INPUT.
 * @param {object} formObject - Đối tượng dữ liệu thô từ sheet INPUT.
 * @returns {object} - Kết quả xử lý.
 */
function service_processSingleTransaction(rawFormObject) {
  const formObject = normalizeObjectKeys(rawFormObject);

  // --- START: Add detailed logging ---
  Logger.log('--- DEBUG: Bắt đầu kiểm tra đối tượng form đã chuẩn hóa ---');
  for (const key in formObject) {
    if (Object.prototype.hasOwnProperty.call(formObject, key)) {
      const value = formObject[key];
      Logger.log(`Trường: ${key} | Giá trị: "${value}" | Kiểu: ${typeof value}`);
    }
  }
  Logger.log('--- DEBUG: Kết thúc kiểm tra đối tượng form ---');
  // --- END: Add detailed logging ---

  const maKho = formObject.maKho;
  const txType = formObject.loaiGiaoDich;
  const soLuong = parseFloat(formObject.soLuong);
  if (isNaN(soLuong) || soLuong <= 0) throw new Error("Số lượng không hợp lệ.");

  let productInfo, warehouseInfo, factoryInfo;

  if (txType === 'Xuất') {
      // --- Logic cho giao dịch XUẤT ---
      // SỬA: Gộp các điều kiện xác thực cho giao dịch 'Xuất' và sửa lại thông báo lỗi.
      if (!formObject.index || !maKho || String(maKho).trim().length === 0) {
        throw new Error("'Xuất' yêu cầu nhập đủ 'Mã index', 'Mã kho', và 'Số lượng'.");
      }

      // Kiểm tra tồn kho trước tiên
      const stock = db_getStockQuantity(formObject.index, maKho);
      if (soLuong > stock) {
          throw new Error(`Không đủ hàng. Tồn kho của ${formObject.index} tại kho ${maKho} là: ${stock}. Yêu cầu xuất: ${soLuong}.`);
      }
      
      // Lấy thông tin đầy đủ từ DATABASE để tạo log
      const recordToUpdate = db_findRecordInDatabase(formObject.index);
      if (!recordToUpdate) {
          throw new Error(`Không tìm thấy bản ghi gốc với Mã index: ${formObject.index} để thực hiện giao dịch 'Xuất'.`);
      }
      productInfo = db_findProduct(recordToUpdate['Viết tắt']) || productNotFound;
      warehouseInfo = db_findWarehouse(recordToUpdate['Mã kho']) || warehouseNotFound;
      factoryInfo = db_findFactory(recordToUpdate['Đơn vị sản xuất']) || factoryNotFound;
      
      // Ghi đè các giá trị từ recordToUpdate vào formObject để đảm bảo tính nhất quán
      // formObject.tenSanPham = recordToUpdate['Tên sản phẩm']; // SỬA: Không ghi đè tên sản phẩm, vì formObject.tenSanPham là tên viết tắt dùng để tra cứu
      formObject.quyCach = recordToUpdate['Quy cách'];
      formObject.ngaySanXuat = recordToUpdate['Ngày sản xuất'];
      formObject.noiSanXuat = recordToUpdate['Đơn vị sản xuất'];
      formObject.loSanXuat = recordToUpdate['Mã lô'];
      formObject.tinhTrangChatLuong = recordToUpdate['Tình trạng chất lượng'];

  } else {
      // --- Logic cho giao dịch NHẬP và ĐIỀU CHUYỂN ---
      if (!formObject.tenSanPham) throw new Error("Yêu cầu phải có Tên sản phẩm.");
      Logger.log(`DEBUG: Kiểm tra Mã Kho. Giá trị: "${maKho}", Loại: ${typeof maKho}`);
      if (!maKho || String(maKho).trim().length === 0) throw new Error("Yêu cầu phải có Mã kho.");
      if (!formObject.noiSanXuat) throw new Error("Yêu cầu phải có Nơi sản xuất.");

      // --- QUY TẮC NGHIỆP VỤ MỚI: Kiểm tra Tình trạng chất lượng cho lô hàng đã tồn tại ---
      if (txType === 'Nhập' && formObject.index) {
        const dbRecord = db_findRecordInDatabase(formObject.index);
        if (dbRecord && dbRecord['Tình trạng chất lượng'] !== formObject.tinhTrangChatLuong) {
          throw new Error("Lỗi: Tình trạng chất lượng không khớp với lô hàng đã có.");
        }
      }
      // --- KẾT THÚC QUY TẮC NGHIỆP VỤ ---

      productInfo = db_findProduct(formObject.tenSanPham) || productNotFound;
      warehouseInfo = db_findWarehouse(maKho) || warehouseNotFound;
      factoryInfo = db_findFactory(formObject.noiSanXuat) || factoryNotFound;
  }

    // --- 3. Tạo đối tượng log hoàn chỉnh (Dùng chung cho mọi loại giao dịch) ---
  const timeZone = "GMT+7";

  // QUAN TRỌNG: Phân tách rõ ràng ngày giao dịch và ngày sản xuất
  const ngayNhapXuatDate = new Date(); // Quy tắc: Ngày nhập xuất LUÔN LÀ ngày giờ hiện tại.


  // SỬA: Parse ngày sản xuất đúng định dạng dd/MM/yyyy
  let ngaySanXuatDate;
  try {
    // Giả định formObject.ngaySanXuat là string "dd/MM/yyyy" hoặc Date
    if (typeof formObject.ngaySanXuat === 'string') {
      ngaySanXuatDate = Utilities.parseDate(formObject.ngaySanXuat, timeZone, 'dd/MM/yyyy');
      if (isNaN(ngaySanXuatDate.getTime())) {
        throw new Error(`Định dạng "Ngày sản xuất" không hợp lệ: ${formObject.ngaySanXuat}. Hãy đảm bảo là dd/MM/yyyy.`);
      }
    } else if (formObject.ngaySanXuat instanceof Date) {
      ngaySanXuatDate = formObject.ngaySanXuat;
    } else {
      throw new Error(`Loại dữ liệu "Ngày sản xuất" không hợp lệ: ${typeof formObject.ngaySanXuat}`);
    }
  } catch (e) {
    throw new Error(`Lỗi parse "Ngày sản xuất": ${e.message}`);
  }
  formObject.ngaySanXuat = ngaySanXuatDate; // SỬA LỖI: Ghi đè lại ngày đã được xử lý vào formObject để các hàm sau sử dụng.
  
  const hsdThang = parseInt(productInfo['HSD (tháng)'], 10);
  let hanSuDungDate = null;
  if (!isNaN(hsdThang)) {
    hanSuDungDate = new Date(ngaySanXuatDate);
    hanSuDungDate.setMonth(hanSuDungDate.getMonth() + hsdThang);
  }

  const logObject = {
    maIndex: formObject.index || generateSku(productInfo, factoryInfo, formObject),
    timestamp: Utilities.formatDate(ngayNhapXuatDate, timeZone, "dd/MM/yyyy HH:mm:ss"),
    tenSanPhamDayDu: productInfo.tenSanPham || productInfo['Tên sản phẩm'], // SỬA: Dùng key camelCase, fallback cho an toàn
    vietTat: productInfo['Viết tắt'],
    quyCach: formObject.quyCach,
    soLuong: soLuong,
    donVi: productInfo.donVi || productInfo['Đơn vị'], // SỬA: Dùng key camelCase, fallback cho an toàn
    ngaySanXuat: Utilities.formatDate(ngaySanXuatDate, timeZone, "dd/MM/yyyy"),
    donViSanXuat: formObject.noiSanXuat,
    maLo: formObject.loSanXuat || `${Utilities.formatDate(ngaySanXuatDate, "GMT+7", "MMyy")}${productInfo['Mã Lô/ Mã ngắn']}`,
    ngayNhapXuat: Utilities.formatDate(ngayNhapXuatDate, timeZone, "dd/MM/yyyy HH:mm:ss"),
    maKho: warehouseInfo.maKho, // SỬA: Dùng key camelCase 'maKho' từ đối tượng warehouseInfo
    loaiKho: warehouseInfo['Loại kho'],
    khuVuc: warehouseInfo['Khu vực'],
    tenKho: warehouseInfo['Tên kho'],
    tinhTrangChatLuong: formObject.tinhTrangChatLuong,
    hanSuDung: hanSuDungDate ? Utilities.formatDate(hanSuDungDate, timeZone, "dd/MM/yyyy") : null,
    nhapXuat: formObject.loaiGiaoDich,
    ghiChu: formObject.ghiChu
  };

  // ... (phần còn lại giữ nguyên: ghi log, database, notifyMauLuu, return)

  // --- 4. Ghi vào Log & DATABASE ---
  addTransactionToLog(logObject);
  db_appendToDatabase(logObject); // Ghi nhận giao dịch vào DATABASE
  notifyMauLuu(logObject); //gửi thông báo mẫu lưu

  // --- 5. Trả về kết quả ---
  return {
    success: true,
    message: "Giao dịch đã được ghi vào LOG thành công!",
    generatedIndex: logObject.maIndex,
    generatedLot: logObject.maLo
  };
}


/**
 * Tạo Mã index (SKU) duy nhất.
 * @param {object} productInfo - Đối tượng thông tin sản phẩm.
 * @param {object} factoryInfo - Đối tượng thông tin phân xưởng.
 * @param {object} txInfo - Đối tượng giao dịch.
 * @returns {string} Mã index đã được tạo.
 */
/**
 * Tạo Mã index (SKU) duy nhất.
 * @param {object} productInfo - Đối tượng thông tin sản phẩm.
 * @param {object} factoryInfo - Đối tượng thông tin phân xưởng.
 * @param {object} txInfo - Đối tượng giao dịch.
 * @returns {string} Mã index đã được tạo.
 */
function generateSku(productInfo, factoryInfo, txInfo) {
  const maLo = productInfo['Mã Lô/ Mã ngắn'] || 'NA';
  const quyCach = txInfo.quyCach || 'NA';
  const maPhanXuong = factoryInfo['Mã phân xưởng'] || 'NA';
  const timeZone = "GMT+7"; // Nhất quán với hệ thống

  // SỬA: Parse ngày sản xuất đúng định dạng dd/MM/yyyy
  let date;
  try {
    if (typeof txInfo.ngaySanXuat === 'string') {
      date = Utilities.parseDate(txInfo.ngaySanXuat, timeZone, 'dd/MM/yyyy');
      if (isNaN(date.getTime())) {
        throw new Error(`Định dạng ngày sản xuất không hợp lệ: ${txInfo.ngaySanXuat}`);
      }
    } else if (txInfo.ngaySanXuat instanceof Date) {
      date = txInfo.ngaySanXuat;
    } else {
      throw new Error(`Loại dữ liệu ngày sản xuất không hợp lệ: ${typeof txInfo.ngaySanXuat}`);
    }
  } catch (e) {
    throw new Error(`Lỗi parse ngày sản xuất trong generateSku: ${e.message}`);
  }

  const dateString = Utilities.formatDate(date, "GMT+7", "ddMMyy");

  return `${maLo}-${quyCach}-${dateString}-${maPhanXuong}`.toUpperCase().replace(/ /g, '-');
}


/**
 * Thực hiện tìm kiếm nâng cao trên toàn bộ DATABASE.
 * @param {object} criteria - Đối tượng chứa các tiêu chí tìm kiếm.
 *   { universal: string, date: Date, status: string }
 * @returns {Array<Array<any>>} Mảng 2 chiều chứa các dòng kết quả đã được định dạng để ghi ra sheet.
 */
function service_performAdvancedSearch(criteria) {
  const allRecords = db_getAllDatabaseRecords();
  if (!allRecords || allRecords.length === 0) {
    return [];
  }

  // Chuẩn hóa tiêu chí tìm kiếm một lần để tối ưu, sử dụng quy tắc tiếng Việt
  const universalTerm = criteria.universal ? criteria.universal.toString().trim().toLocaleUpperCase('vi') : '';
  const searchDate = criteria.date ? new Date(criteria.date) : null;
  const searchStatus = criteria.status ? criteria.status.toString().trim().toUpperCase() : '';
  
  const searchDateString = searchDate ? Utilities.formatDate(searchDate, "GMT+7", "dd/MM/yyyy") : '';

  const filteredRecords = allRecords.filter(record => {
    let match = true;

    // 1. Lọc theo Tình trạng chất lượng (nếu có)
    if (searchStatus) {
      const recordStatus = record['Tình trạng chất lượng'] ? record['Tình trạng chất lượng'].toString().trim().toUpperCase() : '';
      if (recordStatus !== searchStatus) {
        match = false;
      }
    }

    // 2. Lọc theo Ngày (nếu có và các điều kiện trước đó vẫn đúng)
    if (match && searchDateString) {
      const recordProdDate = record['Ngày sản xuất'] ? record['Ngày sản xuất'].toString().trim() : '';
      const recordTransDate = record['Ngày nhập/xuất'] ? record['Ngày nhập/xuất'].toString().trim() : '';
      // Chỉ cần một trong hai ngày khớp
      if (recordProdDate !== searchDateString && !recordTransDate.startsWith(searchDateString)) {
        match = false;
      }
    }

    // 3. Lọc theo từ khóa đa năng (nếu có và các điều kiện trước đó vẫn đúng)
    if (match && universalTerm) {
      const fieldsToSearch = [
        record['Mã index'],
        record['Tên sản phẩm'],
        record['Viết tắt'],
        record['Mã lô'],
        record['Đơn vị sản xuất']
      ];
      
      const foundInFields = fieldsToSearch.some(field => {
        // Sử dụng toLocaleUpperCase để so sánh chuỗi chính xác hơn theo quy tắc tiếng Việt
        return field && field.toString().toLocaleUpperCase('vi').includes(universalTerm);
      });

      if (!foundInFields) {
        match = false;
      }
    }
    
    return match;
  });

  // Định dạng kết quả để ghi ra sheet
  return filteredRecords.map(record => {
    return [
      false, // Checkbox
      record['Mã index'],
      record['Viết tắt'],
      record['Quy cách'],
      record['Số lượng'],
      record['Ngày sản xuất'],
      record['Đơn vị sản xuất'],
      record['Mã lô'],
      record['Ngày nhập/xuất'],
      record['Mã kho'],
      record['Loại kho'],
      record['Khu vực'],
      record['Tên kho'],
      record['Tình trạng chất lượng'],
      record['Hạn sử dụng'],
      record['Nhập/xuất'],
      record['Ghi chú']
    ];
  });
}


/**
 * Lấy thông tin chi tiết của một mã index để hiển thị cho người dùng xác nhận.
 * @param {string} maIndex Mã index cần lấy thông tin.
 * @returns {string|null} Chuỗi thông tin đã định dạng để xác nhận, hoặc null nếu không tìm thấy.
 */
function service_getExportConfirmationDetails(maIndex) {
    const dbRecord = db_findRecordInDatabase(maIndex);
    if (!dbRecord) {
        return null;
    }

    // Định dạng chuỗi để hiển thị cho người dùng
    return `Vui lòng xác nhận thông tin xuất kho:\n\n` +
        `Mã index: ${dbRecord['Mã index']}\n` +
        `Tên sản phẩm (viết tắt): ${dbRecord['Viết tắt']}\n` +
        `Quy cách: ${dbRecord['Quy cách']}\n` +
        `Mã lô: ${dbRecord['Mã lô']}\n` +
        `Ngày sản xuất: ${Utilities.formatDate(new Date(dbRecord['Ngày sản xuất']), "GMT+7", "dd/MM/yyyy")}`;
}

/**
 * Lấy và định dạng các giao dịch gần đây để hiển thị trên UI.
 * @returns {Array<Array<any>>} Dữ liệu đã được định dạng.
 */
function service_getRecentTransactions() {
      const recentLogs = db_getRecentLogs(11); // Lấy 11 dòng gần nhất
      return recentLogs.map(log => [
        log[17], // Nhập/xuất
        log[3],  // Viết tắt
        log[4],  // Quy cách
        log[5],  // Số lượng
        log[6],  // Đơn vị
        log[7],  // Ngày sản xuất
        log[8],  // Đơn vị sản xuất
        log[11], // Mã kho
        log[15], // Tình trạng chất lượng
        log[18], // Ghi chú
        log[0],  // Mã index
        log[9]   // Mã lô
      ]);
    }


/**
 * Chuẩn hóa các keys của một đối tượng từ tiếng Việt sang camelCase.
 * Phiên bản này có khả năng gỡ lỗi và chống lỗi mạnh mẽ bằng cách loại bỏ dấu và chuẩn hóa.
 * @param {object} rawObject - Đối tượng có keys là tiếng Việt.
 * @returns {object} - Đối tượng mới với keys đã được chuẩn hóa.
 */
function normalizeObjectKeys(rawObject) {
  // Helper function to remove diacritics, trim, and convert to lowercase.
  const normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    // This will remove diacritics, make it lowercase, and trim whitespace.
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  };

  // Key map now uses normalized (diacritic-free, lowercase) keys for robust matching.
  const keyMap = {
    'nhap/xuat': 'loaiGiaoDich',
    'ten san pham': 'tenSanPham',
    'quy cach': 'quyCach',
    'so luong': 'soLuong',
    'ngay san xuat': 'ngaySanXuat',
    'noi san xuat': 'noiSanXuat',
    'ma kho': 'maKho',
    'ten kho': 'tenKho',
    'tinh trang chat luong': 'tinhTrangChatLuong',
    'ghi chu': 'ghiChu',
    'ma index': 'index',
    'ma lo': 'loSanXuat'
  };

  const normalizedObject = {};
  for (const originalKey in rawObject) {
    if (Object.prototype.hasOwnProperty.call(rawObject, originalKey)) {
      const normalizedKey = normalizeString(originalKey);
      const newKey = keyMap[normalizedKey] || originalKey; // Fallback to original key if no match found

      // Detailed logging for debugging purposes
      Logger.log(`[normalize] Key gốc: "${originalKey}" -> Key đã chuẩn hóa: "${normalizedKey}" -> Key mới: "${newKey}"`);
      
      normalizedObject[newKey] = rawObject[originalKey];
    }
  }
  return normalizedObject;
}
