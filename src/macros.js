/**
 * @OnlyCurrentDoc
 * This file contains functions that are intended to be run directly by the user 
 * from a custom menu in the Google Sheet, acting as macros.
 */

/**
 * Processes the data entered in the 'INPUT' sheet.
 * It reads each row, processes valid 'Nhập' transactions, 
 * and clears the processed rows.
 */
function processInputSheet() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('INPUT');
  
  if (!sheet) {
    ui.alert('Lỗi: Không tìm thấy trang tính có tên "INPUT". Vui lòng kiểm tra lại.');
    return;
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  let processedCount = 0;
  let errorMessages = [];

  // Start from row 1 to skip header
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowNumber = i + 1;

    // Create an object from the row data based on headers
    const rowData = headers.reduce((obj, header, index) => {
      obj[header] = row[index];
      return obj;
    }, {});

    // Skip empty rows
    if (row.every(cell => cell === '')) {
      continue;
    }

    const transactionType = rowData['Loại Giao Dịch'];

    if (transactionType === 'Nhập') {
      try {
        // Construct the formObject to be compatible with the existing service function
        const formObject = {
          loaiGiaoDich: 'Nhập',
          index: '', // Index is generated for 'Nhập'
          tenSanPham: rowData['Tên Sản Phẩm'],
          quyCach: rowData['Quy Cách'],
          soLuong: rowData['Số Lượng'],
          ngaySanXuat: rowData['Ngày Sản Xuất'],
          phanXuong: rowData['Đơn Vị Sản Xuất'],
          tinhTrangChatLuong: rowData['Tình Trạng Chất Lượng'],
          kho: rowData['Kho Nhận'],
          khoDi: '', // Not used for 'Nhập'
          ghiChu: rowData['Ghi Chú'],
          loSanXuat: '', // Let the service layer generate this
        };

        // Call the central processing function from the service layer
        const response = service_processSingleTransaction(formObject, false, null);

        if (response.success) {
          // Clear the processed row
          sheet.getRange(rowNumber, 1, 1, headers.length).clearContent();
          processedCount++;
        } else {
          errorMessages.push(`Dòng ${rowNumber}: ${response.message}`);
        }
      } catch (e) {
        errorMessages.push(`Dòng ${rowNumber}: Lỗi không xác định - ${e.message}`);
      }
    } else if (transactionType === 'Xuất' || transactionType === 'Điều chuyển') {
      // For now, we skip these types from the sheet macro
      errorMessages.push(`Dòng ${rowNumber}: Loại giao dịch '${transactionType}' chưa được hỗ trợ từ sheet INPUT.`);
    }
  }

  // Final report to the user
  let summaryMessage = `Hoàn tất xử lý!\n\n- ${processedCount} giao dịch 'Nhập' đã được xử lý thành công.`;
  if (errorMessages.length > 0) {
    summaryMessage += `\n\n- Các lỗi hoặc cảnh báo sau đã xảy ra:\n${errorMessages.join('\n')}`;
  }
  
  ui.alert(summaryMessage);
}