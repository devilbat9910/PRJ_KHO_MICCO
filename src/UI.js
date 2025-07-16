/**
 * @OnlyCurrentDoc
 * TỆP GIAO DIỆN NGƯỜI DÙNG (UI)
 * Chứa các hàm được gọi trực tiếp từ giao diện người dùng như menu, nút bấm.
 */

/**
 * Hiển thị sidebar nhập liệu chính.
 */
function showSidebar() {
  const html = HtmlService.createTemplateFromFile('FormNhapLieu').evaluate().setTitle('📝 Form Nhập/Xuất Kho');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Hiển thị hộp thoại (dialog) tra cứu tồn kho.
 */
function showTraCuuDialog() {
  Logger.log("--- BẮT ĐẦU THỰC THI showTraCuuDialog ---");
  const html = HtmlService.createHtmlOutputFromFile('TraCuu')
    .setWidth(1200)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, '📊 Tra Cứu Tồn Kho');
}

/**
 * Xử lý dữ liệu từ bảng NHẬP THỦ CÔNG trên sheet INPUT.
 * Đọc dữ liệu dựa trên tiêu đề cột, giúp linh hoạt hơn khi thay đổi cấu trúc sheet.
 */
function processManualInputTable() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sheet = ss.getSheetByName(INPUT_SHEET_NAME);
  if (!sheet) {
    ui.alert('Lỗi: Không tìm thấy trang tính "INPUT". Vui lòng tạo sheet này.');
    return;
  }

  // Đọc vùng dữ liệu từ vùng được đặt tên 'INPUT_RANGE'
  const dataRange = ss.getRangeByName('INPUT_RANGE');
  if (!dataRange) {
    ui.alert('Lỗi: Không tìm thấy vùng được đặt tên "INPUT_RANGE". Vui lòng tạo vùng này.');
    return;
  }
  const values = dataRange.getValues();
  
  // Dòng đầu tiên của vùng dữ liệu là header
  const headers = values[0];
  Logger.log('Đã đọc các tiêu đề sau từ sheet INPUT: ' + JSON.stringify(headers));
  let processedCount = 0;
  let errorMessages = [];

  // Xóa màu nền và ghi chú lỗi cũ
  dataRange.setBackground(null).clearNote();
  const successfulRowNumbers = [];
  const dataToUpdate = []; // Mảng để lưu dữ liệu cần ghi ngược

  // Bắt đầu từ dòng 1 (dòng thứ 2 trong 'values' array) để bỏ qua header
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowNumber = dataRange.getRow() + i;

    // Bỏ qua dòng trống
    if (row.every(cell => cell === '')) continue;

    // Tạo object từ dữ liệu dòng dựa trên header
    const rowData = headers.reduce((obj, header, index) => {
      // Sửa lỗi: Luôn chuyển đổi header thành chuỗi trước khi trim
      if (header) obj[header.toString().trim()] = row[index];
      return obj;
    }, {});
    Logger.log('Đang xử lý dòng ' + rowNumber + ': ' + JSON.stringify(rowData));

    try {
      const txType = rowData['Nhập/xuất']; // THAY ĐỔI QUAN TRỌNG: khớp với tiêu đề trên ảnh
      Logger.log('Loại giao dịch (txType) được xác định là: ' + txType);
      if (!txType) {
        Logger.log('Bỏ qua dòng ' + rowNumber + ' vì không có loại giao dịch.');
        continue;
      }

      // Logic mới: Tự động lấy ngày hiện tại nếu ô ngày sản xuất trống
      const ngaySanXuat = rowData['Ngày Sản Xuất'] || new Date();

      // Xây dựng đối tượng thô để gửi đến service
      // Xây dựng đối tượng thô để gửi đến service, khớp chính xác với tiêu đề trên ảnh
      const formObject = {
        loaiGiaoDich: txType,
        tenSanPham: rowData['Tên sản phẩm'],
        quyCach: rowData['Quy cách'],
        soLuong: rowData['Số lượng'],
        ngaySanXuat: ngaySanXuat,
        phanXuong: rowData['Phân xưởng'],
        tenKho: rowData['Tên kho'], // Khớp với ảnh
        tinhTrangChatLuong: rowData['Tình trạng chất lượng'],
        ghiChu: rowData['Ghi chú'],
        index: rowData['Mã index'],
        loSanXuat: rowData['Mã lô'] || ''
      };

      // Xử lý logic đặc biệt cho 'Điều chuyển'
      if (txType === 'Điều chuyển') {
        if (!formObject.tenKho) throw new Error("Giao dịch 'Điều chuyển' yêu cầu 'Tên kho' (Kho đi).");
        if (!formObject.ghiChu) throw new Error("Giao dịch 'Điều chuyển' yêu cầu kho đến trong cột 'Ghi chú'.");
        
        // Ghi đè ghi chú để làm rõ hơn
        formObject.ghiChu = `Điều chuyển từ ${formObject.tenKho} đến ${formObject.ghiChu}`;
      }
      
      const result = service_processSingleTransaction(formObject);

      if (result.success) {
        const indexCol = headers.indexOf('Mã index');
        const loSxCol = headers.indexOf('Mã lô');

        if (indexCol !== -1) {
          dataToUpdate.push({
            range: sheet.getRange(rowNumber, indexCol + 1),
            value: result.generatedIndex
          });
        }
        if (loSxCol !== -1 && result.generatedLot) {
           dataToUpdate.push({
            range: sheet.getRange(rowNumber, loSxCol + 1),
            value: result.generatedLot
          });
        }
        
        successfulRowNumbers.push(rowNumber);
        processedCount++;
      } else {
        throw new Error(result.message); // Ném lỗi nếu service báo lỗi
      }
    } catch (e) {
      const errorMessage = e.message || 'Lỗi không xác định.';
      errorMessages.push(`Dòng ${rowNumber}: ${errorMessage}`);
      // Đánh dấu lỗi trên sheet để người dùng dễ thấy
      sheet.getRange(rowNumber, 1).setBackground("#f4cccc").setNote(`Lỗi: ${errorMessage}`);
    }
  }

  // Tối ưu hóa: Thực hiện tất cả các thao tác ghi và xóa trong một lần
  if (dataToUpdate.length > 0) {
      dataToUpdate.forEach(item => item.range.setValue(item.value));
  }
  
  if (successfulRowNumbers.length > 0) {
    SpreadsheetApp.flush(); // Đảm bảo các giá trị được ghi trước khi xóa
    const rangesToClear = successfulRowNumbers.map(rowNum =>
      sheet.getRange(rowNum, 1, 1, dataRange.getNumColumns()).getA1Notation()
    );
    sheet.getRangeList(rangesToClear).clearContent();
  }

  // Tạo thông báo kết quả cho người dùng
  let summaryMessage = `Hoàn tất xử lý!\n\n- ${processedCount} giao dịch đã được xử lý thành công và xóa khỏi sheet.`;
  if (errorMessages.length > 0) {
    summaryMessage += `\n\n- Các lỗi hoặc cảnh báo sau đã xảy ra (xem ghi chú ở ô đầu tiên của dòng lỗi):\n${errorMessages.join('\n')}`;
  }
  ui.alert(summaryMessage);

  // Cập nhật dashboard nếu có giao dịch thành công
  if (processedCount > 0) {
    updateDashboardRecentTransactions();
  }
}