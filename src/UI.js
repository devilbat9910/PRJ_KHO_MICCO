/**
 * @OnlyCurrentDoc
 * TỆP GIAO DIỆN NGƯỜI DÙNG (UI)
 * Chứa các hàm được gọi trực tiếp từ giao diện người dùng như menu, nút bấm.
 */


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
  let values = dataRange.getValues();
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

      // --- START: Refactoring Data Handling ---
      // Logic xác nhận cho giao dịch 'Xuất' vẫn được giữ lại
      if (txType === 'Xuất') {
        const maIndex = rowData['Mã index'];
        const maKho = rowData['Mã kho']; // SỬA LỖI: Đọc đúng tên cột 'Mã kho'
        const soLuong = rowData['Số lượng'];
        rowData['Mã kho'] = maKho; // GÁN LẠI ĐỂ SERVICE NHẬN ĐÚNG

        if (!maIndex || !maKho || !soLuong) {
          throw new Error("'Xuất' yêu cầu nhập đủ 'Mã index', 'Tên kho' (là Mã kho), và 'Số lượng'.");
        }

        const confirmationDetails = service_getExportConfirmationDetails(maIndex);
        if (!confirmationDetails) {
          throw new Error(`Không tìm thấy thông tin cho Mã Index "${maIndex}" để xác nhận.`);
        }

        const response = ui.alert(
          'Xác Nhận Xuất Kho',
          `${confirmationDetails}\n\nSỐ LƯỢNG XUẤT: ${soLuong}\nKHO XUẤT: ${maKho}\n\nBạn có muốn tiếp tục không?`,
          ui.ButtonSet.OK_CANCEL
        );

        if (response !== ui.Button.OK) {
          throw new Error("Người dùng đã hủy thao tác xuất kho.");
        }
      }
      
      // Logic đặc biệt cho 'Điều chuyển'
      if (txType === 'Điều chuyển') {
          if (!rowData['Tên kho']) throw new Error("Giao dịch 'Điều chuyển' yêu cầu 'Tên kho' (Kho đi).");
          if (!rowData['Ghi chú']) throw new Error("Giao dịch 'Điều chuyển' yêu cầu kho đến trong cột 'Ghi chú'.");
          // Ghi đè ghi chú để làm rõ hơn
          rowData['Ghi chú'] = `Điều chuyển từ ${rowData['Tên kho']} đến ${rowData['Ghi chú']}`;
      }

      // Truyền trực tiếp đối tượng rowData thô vào service layer.
      // Logic chuẩn hóa key sẽ được thực hiện trong service_processSingleTransaction.
      const result = service_processSingleTransaction(rowData);
      // --- END: Refactoring Data Handling ---

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

/**
 * Thực thi tìm kiếm dựa trên tiêu chí từ sheet và hiển thị kết quả.
 * Được gán cho nút/ảnh tra cứu.
 */
function UI_executeSearch() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('INPUT');
  const ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Lỗi: Không tìm thấy sheet "INPUT".');
    return;
  }

  try {
    // 1. Đọc tiêu chí tìm kiếm từ L5:N5
    const searchInputRange = sheet.getRange('L5:N5');
    const searchValues = searchInputRange.getValues()[0];
    const searchCriteria = {
      universal: searchValues[0], // L5
      date: searchValues[1],      // M5
      status: searchValues[2]     // N5
    };

    // 2. Gọi service để thực hiện tìm kiếm
    const results = service_performAdvancedSearch(searchCriteria);

    // 3. Xóa kết quả cũ
    // Bắt đầu từ hàng 3, cột O (15) đến cột AF (32)
    const resultStartRow = 3;
    const resultStartCol = 15; // Cột O
    const numCols = 18; // O -> AF
    const lastRow = sheet.getLastRow();
    if (lastRow >= resultStartRow) {
      sheet.getRange(resultStartRow, resultStartCol, lastRow - resultStartRow + 1, numCols).clearContent();
    }
    
    // 4. Ghi kết quả mới nếu có
    if (results.length > 0) {
      // Ghi dữ liệu vào sheet, bắt đầu từ O3
      sheet.getRange(resultStartRow, resultStartCol, results.length, results[0].length).setValues(results);
      // Thêm checkbox vào cột O
      const checkboxRange = sheet.getRange(resultStartRow, resultStartCol, results.length, 1);
      checkboxRange.insertCheckboxes();
      
      ui.alert(`Tìm thấy ${results.length} kết quả.`);
    } else {
      ui.alert('Không tìm thấy kết quả nào phù hợp.');
    }
    

  } catch (e) {
    Logger.log(e);
    ui.alert('Đã xảy ra lỗi trong quá trình tìm kiếm: ' + e.message);
  }
}

/**
 * Cập nhật bảng giao dịch gần đây trên sheet INPUT.
 */
function updateDashboardRecentTransactions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('INPUT');
  const recentNamedRange = ss.getRangeByName('INPUT_RECENT');
  if (!recentNamedRange) {
    Logger.log('Cảnh báo: Không tìm thấy vùng được đặt tên "INPUT_RECENT".');
    return;
  }

  // Xác định vùng dữ liệu (bỏ qua dòng header)
  const dataRange = sheet.getRange(
    recentNamedRange.getRow() + 1,
    recentNamedRange.getColumn(),
    recentNamedRange.getNumRows() - 1,
    recentNamedRange.getNumColumns()
  );
  
  const recentData = service_getRecentTransactions();
  
  // Chỉ xóa nội dung của vùng dữ liệu
  dataRange.clearContent();
  
  if (recentData.length > 0) {
    // Ghi dữ liệu mới vào vùng dữ liệu
    sheet.getRange(
      dataRange.getRow(),
      dataRange.getColumn(),
      recentData.length,
      recentData[0].length
    ).setValues(recentData);
  }
  Logger.log(`Đã cập nhật ${recentData.length} giao dịch gần đây vào vùng INPUT_RECENT.`);
}

/**
 * Tạo dữ liệu mẫu cho giao dịch 'Nhập' trên sheet INPUT để kiểm thử.
 * Tìm dòng trống đầu tiên trong vùng INPUT_RANGE và điền dữ liệu.
 */
function test_createNhapInput() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('INPUT');
  const ui = SpreadsheetApp.getUi();
  const inputRange = ss.getRangeByName('INPUT_RANGE');

  if (!inputRange) {
    ui.alert('Lỗi: Không tìm thấy vùng được đặt tên "INPUT_RANGE".');
    return;
  }

  // --- Bắt đầu logic tạo dữ liệu ngẫu nhiên ---
  const products = ['NTLT', 'NTLĐ', 'NTR08', 'NTR10', 'NTLT2'];
  const factories = ['ĐT', 'CP', 'QN'];
  const warehouses = ['VLN-ĐT-K7', 'VLN-ĐT-K8', 'VLN-CP-K3', 'VLN-CP-K4', 'VLN-ĐT-K5'];
  
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  const randomSpec = (Math.random() > 0.5 ? 'D' : 'B') + (Math.floor(Math.random() * 200) + 10);
  const randomQty = Math.floor(Math.random() * 5000) + 100;
  const randomFactory = factories[Math.floor(Math.random() * factories.length)];
  const randomWarehouse = warehouses[Math.floor(Math.random() * warehouses.length)];

  const testData = [
    'Nhập',
    randomProduct,
    randomSpec,
    randomQty,
    '', // Cột trống
    '', // Cột trống
    randomFactory,
    randomWarehouse,
    'Đạt'
  ];
  // --- Kết thúc logic tạo dữ liệu ngẫu nhiên ---

  const rangeValues = inputRange.getValues();
  let emptyRow = -1;

  // Bỏ qua header, tìm dòng trống đầu tiên
  for (let i = 1; i < rangeValues.length; i++) {
    if (rangeValues[i][0] === '') {
      emptyRow = inputRange.getRow() + i;
      break;
    }
  }

  if (emptyRow !== -1) {
    sheet.getRange(emptyRow, inputRange.getColumn(), 1, testData.length).setValues([testData]);
    sheet.getRange(emptyRow, inputRange.getColumn()).activate(); // Kích hoạt ô để người dùng thấy
  } else {
    ui.alert('Không tìm thấy dòng trống trong vùng INPUT_RANGE để điền dữ liệu test.');
  }
}