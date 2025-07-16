/**
 * @OnlyCurrentDoc
 * TỆP DỊCH VỤ (SERVICE LAYER) - KIẾN TRÚC NAMED RANGE
 * Nhiệm vụ: Nhận dữ liệu thô, gọi các hàm db để tra cứu từ các vùng được đặt tên,
 * làm giàu dữ liệu và ghi vào LOG.
 */

/**
 * Xử lý một giao dịch duy nhất từ sheet INPUT.
 * @param {object} formObject - Đối tượng dữ liệu thô từ sheet INPUT.
 * @returns {object} - Kết quả xử lý.
 */
function service_processSingleTransaction(formObject) {
  // --- 1. Xác thực dữ liệu đầu vào ---
  const soLuong = parseFloat(formObject.soLuong);
  if (isNaN(soLuong) || soLuong <= 0) throw new Error("Số lượng không hợp lệ.");
  if (!formObject.tenSanPham) throw new Error("Yêu cầu phải có Tên sản phẩm.");
  if (!formObject.tenKho) throw new Error("Yêu cầu phải có Tên kho.");
  if (!formObject.phanXuong) throw new Error("Yêu cầu phải có Phân xưởng (mã).");

  // --- 2. Tra cứu và làm giàu dữ liệu ---
  const productInfo = db_findProduct(formObject.tenSanPham);
  if (!productInfo) throw new Error(`Không tìm thấy sản phẩm: "${formObject.tenSanPham}".`);

  const warehouseInfo = db_findWarehouse(formObject.tenKho);
  if (!warehouseInfo) throw new Error(`Không tìm thấy kho: "${formObject.tenKho}".`);
  
  const factoryInfo = db_findFactory(formObject.phanXuong);
  if (!factoryInfo) throw new Error(`Không tìm thấy phân xưởng với mã: "${formObject.phanXuong}".`);

  // --- 3. Tạo đối tượng log hoàn chỉnh ---
  const timeZone = "GMT+7";
  const ngaySanXuatDate = new Date(formObject.ngaySanXuat);
  
  const hsdThang = parseInt(productInfo['HSD (tháng)'], 10);
  let hanSuDungDate = null;
  if (!isNaN(hsdThang)) {
    hanSuDungDate = new Date(ngaySanXuatDate);
    hanSuDungDate.setMonth(hanSuDungDate.getMonth() + hsdThang);
  }

  const logObject = {
    maIndex: formObject.index || generateSku(productInfo, factoryInfo, formObject),
    timestamp: Utilities.formatDate(new Date(), timeZone, "dd/MM/yyyy HH:mm:ss"),
    tenSanPham: productInfo['Tên sản phẩm'],
    vietTat: productInfo['Viết tắt'],
    quyCach: formObject.quyCach,
    soLuong: soLuong,
    ngaySanXuat: Utilities.formatDate(ngaySanXuatDate, timeZone, "dd/MM/yyyy"),
    donViSanXuat: formObject.phanXuong,
    maLo: formObject.loSanXuat || `${Utilities.formatDate(ngaySanXuatDate, "UTC", "MMyy")}${productInfo['Mã Lô/ Mã ngắn']}`,
    ngayNhapXuat: Utilities.formatDate(new Date(), timeZone, "dd/MM/yyyy HH:mm:ss"),
    maKho: warehouseInfo['Mã kho'],
    loaiKho: warehouseInfo['Loại kho'],
    khuVuc: warehouseInfo['Khu vực'],
    tenKho: warehouseInfo['Tên kho'],
    tinhTrangChatLuong: formObject.tinhTrangChatLuong,
    hanSuDung: hanSuDungDate ? Utilities.formatDate(hanSuDungDate, timeZone, "dd/MM/yyyy") : null,
    nhapXuat: formObject.loaiGiaoDich,
    ghiChu: formObject.ghiChu
  };

  // --- 4. Ghi vào Log & DATABASE ---
  addTransactionToLog(logObject);
  db_upsertToDatabase(logObject); // Cập nhật trạng thái vào DATABASE

  // --- 5. Trả về kết quả ---
  return {
    success: true,
    message: "Giao dịch đã được ghi vào LOG thành công!",
    generatedIndex: logObject.maIndex,
    generatedLot: logObject.maLo
  };
}

/**
 * Lấy dữ liệu giao dịch gốc từ DATABASE để chuẩn bị cho việc sửa.
 * @param {string} indexValue - Mã INDEX cần tra cứu.
 * @returns {object | null} - Dữ liệu chi tiết của giao dịch.
 */
function service_getOriginalTransactionForEdit(indexValue) {
  return db_getLatestState(indexValue);
}

/**
 * Xử lý việc cập nhật một giao dịch đã có.
 * @param {object} newData - Đối tượng chứa dữ liệu mới từ form.
 * @param {object} oldData - Đối tượng chứa dữ liệu gốc từ DATABASE.
 * @returns {object} - Kết quả xử lý.
 */
function service_updateTransaction(newData, oldData) {
  const timeZone = "GMT+7";
  let changesMade = 0;

  // Lặp qua các khóa trong dữ liệu mới để so sánh
  for (const key in newData) {
    if (newData.hasOwnProperty(key) && oldData.hasOwnProperty(key)) {
      // So sánh giá trị cũ và mới
      if (newData[key] !== oldData[key]) {
        changesMade++;
        
        // Tạo một logObject riêng cho sự thay đổi này
        const changeLogObject = { ...oldData }; // Bắt đầu với dữ liệu cũ
        changeLogObject.timestamp = Utilities.formatDate(new Date(), timeZone, "dd/MM/yyyy HH:mm:ss");
        changeLogObject.nhapXuat = `UPDATE:${key}`; // Loại giao dịch đặc biệt
        changeLogObject.ghiChu = `Thay đổi từ "${oldData[key]}" thành "${newData[key]}"`;
        
        // Cập nhật giá trị mới vào logObject
        changeLogObject[key] = newData[key];

        addTransactionToLog(changeLogObject);
      }
    }
  }

  if (changesMade === 0) {
    return { success: false, message: "Không có thay đổi nào được phát hiện." };
  }

  // Sau khi ghi tất cả các log thay đổi, cập nhật DATABASE với trạng thái cuối cùng
  const finalState = { ...oldData, ...newData };
  db_upsertToDatabase(finalState);

  return {
    success: true,
    message: `Cập nhật thành công! Đã ghi nhận ${changesMade} thay đổi vào LOG.`
  };
}

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
  
  const date = new Date(txInfo.ngaySanXuat);
  const dateString = Utilities.formatDate(date, "UTC", "ddMMyy");

  return `${maLo}-${quyCach}-${dateString}-${maPhanXuong}`.toUpperCase().replace(/ /g, '-');
}
