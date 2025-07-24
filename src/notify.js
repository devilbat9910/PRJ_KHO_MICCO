/**
 * @OnlyCurrentDoc
 * TỆP THÔNG BÁO (NOTIFY LAYER)
 * Chứa hàm để gửi thông báo email và tạo sự kiện lịch khi tình trạng chất lượng là 'Mẫu lưu'.
 * Gọi hàm notifyMauLuu(logObject) từ service_processSingleTransaction sau khi ghi log/database.
 */

// --- BIẾN CẤU HÌNH ---
const EMAIL_RECIPIENTS = [
  'tuquynh.le.1209@gmail.com',
  'nytq910@gmail.com',
  'nhatvinhgiang@gmail.com',
  'haipd@micco.com.vn'
];

const CALENDAR_ID = 'lynx.9297.3007@gmail.com'; // ID chính xác
const TIME_ZONE = 'GMT+7';
const HSD_MONTHS = 6; // Fixed 6 tháng như yêu cầu
const MIN_DAYS_BETWEEN = 28;
const MAX_DAYS_BETWEEN = 32;
const USE_DEFAULT_CALENDAR_FALLBACK = false; // Bật true nếu cần fallback
const SEND_INVITES_FOR_TEST = true; // Set false để test mà không invite

/**
 * Gửi thông báo email và tạo sự kiện lịch cho giao dịch 'Mẫu lưu'.
 * @param {object} logObject - Đối tượng log đã được làm giàu từ service.
 */
function notifyMauLuu(logObject) {
  if (logObject.tinhTrangChatLuong !== 'Mẫu lưu') {
    Logger.log(`Bỏ qua thông báo: Giao dịch ${logObject.maIndex} không phải 'Mẫu lưu'.`);
    return;
  }

  const tenSanPham = logObject.tenSanPham || 'Không xác định';
  const vietTat = logObject.vietTat || tenSanPham; // Sử dụng viết tắt nếu có, nếu không thì tên đầy đủ
  const ngaySanXuat = logObject.ngaySanXuat || 'Không xác định';
  const maIndex = logObject.maIndex || 'Không xác định';

  // Parse ngày nhập/xuất đúng format dd/MM/yyyy HH:mm:ss
  let baseDate;
  try {
    baseDate = Utilities.parseDate(logObject.ngayNhapXuat, TIME_ZONE, 'dd/MM/yyyy HH:mm:ss');
    if (isNaN(baseDate.getTime())) {
      throw new Error('Ngày nhập/xuất invalid sau parse.');
    }
    Logger.log(`Base date parsed thành công cho ${maIndex}: ${baseDate.toString()}`);
  } catch (e) {
    Logger.log(`Lỗi parse ngày nhập/xuất cho ${maIndex}: ${e.message}. Raw: ${logObject.ngayNhapXuat}`);
    // Gửi email lỗi parse
    const errorBody = `Lỗi parse ngày cho giao dịch ${maIndex}: ${e.message}. Raw date: ${logObject.ngayNhapXuat}`;
    EMAIL_RECIPIENTS.forEach(email => MailApp.sendEmail(email, 'Lỗi Notify Mau Luu', errorBody));
    return;
  }

  // --- Gửi email thông báo ngay (lần 1) ---
  const emailSubject = `Thông báo thử nổ lần 1 cho mẫu lưu ${vietTat} - ${maIndex}`;
  const emailBody = `
    Kính gửi,

    Có giao dịch 'Mẫu lưu' mới:
    - Tên sản phẩm: ${tenSanPham}
    - Viết tắt: ${vietTat}
    - Ngày sản xuất: ${ngaySanXuat}
    - Mã Index: ${maIndex}
    - Mã Lô: ${logObject.maLo}
    - Số lượng: ${logObject.soLuong}
    - Kho: ${logObject.tenKho}
    - Hạn sử dụng: ${logObject.hanSuDung || 'Không áp dụng'}
    - Ghi chú: ${logObject.ghiChu || 'Không có'}

    Đây là thông báo lần thứ 1 (ngay lập tức).

    Trân trọng,
    Hệ thống Quản Lý Kho
  `;

  EMAIL_RECIPIENTS.forEach(email => {
    try {
      MailApp.sendEmail({
        to: email,
        subject: emailSubject,
        body: emailBody,
        htmlBody: emailBody.replace(/\n/g, '<br>')
      });
      Logger.log(`Đã gửi email thông báo lần 1 cho ${email} về giao dịch ${maIndex}`);
    } catch (e) {
      Logger.log(`Lỗi gửi email cho ${email} về giao dịch ${maIndex}: ${e.message}`);
    }
  });

  // --- Tạo sự kiện lịch ---
  let calendar;
  try {
    calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      throw new Error(`Không tìm thấy calendar với ID: ${CALENDAR_ID}`);
    }
    Logger.log(`Truy cập thành công calendar ID: ${CALENDAR_ID}`);
  } catch (e) {
    Logger.log(`Lỗi truy cập calendar ${CALENDAR_ID}: ${e.message}`);
    if (USE_DEFAULT_CALENDAR_FALLBACK) {
      calendar = CalendarApp.getDefaultCalendar();
      Logger.log('Fallback: Sử dụng calendar mặc định.');
    } else {
      const errorEmailBody = `
        Kính gửi,

        Hệ thống không thể tạo sự kiện lịch cho giao dịch 'Mẫu lưu' do lỗi:
        - Lỗi: ${e.message}
        - Mã Index: ${maIndex}
        - Tên sản phẩm: ${tenSanPham}

        Vui lòng kiểm tra quyền chia sẻ calendar ${CALENDAR_ID}.

        Trân trọng,
        Hệ thống Quản Lý Kho
      `;
      EMAIL_RECIPIENTS.forEach(email => {
        try {
          MailApp.sendEmail({
            to: email,
            subject: `Lỗi: Không thể tạo sự kiện lịch cho giao dịch ${maIndex}`,
            body: errorEmailBody,
            htmlBody: errorEmailBody.replace(/\n/g, '<br>')
          });
          Logger.log(`Đã gửi email thông báo lỗi calendar cho ${email}`);
        } catch (emailError) {
          Logger.log(`Lỗi gửi email thông báo calendar cho ${email}: ${emailError.message}`);
        }
      });
      return;
    }
  }

  for (let monthOffset = 0; monthOffset < HSD_MONTHS; monthOffset++) {
    let notifyDate = new Date(baseDate);
    notifyDate.setMonth(notifyDate.getMonth() + monthOffset);

    // Điều chỉnh ngày
    if (monthOffset > 0) {
      const prevNotifyDate = new Date(baseDate);
      prevNotifyDate.setMonth(prevNotifyDate.getMonth() + monthOffset - 1);
      const daysDiff = (notifyDate - prevNotifyDate) / (1000 * 60 * 60 * 24);

      if (daysDiff < MIN_DAYS_BETWEEN) {
        notifyDate.setDate(notifyDate.getDate() + Math.ceil(MIN_DAYS_BETWEEN - daysDiff));
      } else if (daysDiff > MAX_DAYS_BETWEEN) {
        notifyDate.setDate(notifyDate.getDate() - Math.floor(daysDiff - MAX_DAYS_BETWEEN));
      }

      if (notifyDate.getDate() !== baseDate.getDate()) {
        notifyDate = new Date(notifyDate.getFullYear(), notifyDate.getMonth() + 1, 0);
      }
    }

    const formattedNotifyDate = Utilities.formatDate(notifyDate, TIME_ZONE, 'dd/MM/yyyy');
    Logger.log(`Notify date cho lần ${monthOffset + 1}: ${formattedNotifyDate} (raw: ${notifyDate.toString()})`);

    const eventTitle = `Thông báo thử nổ lần ${monthOffset + 1} cho mẫu lưu ${vietTat} - ${maIndex}`;
    const eventDescription = `
      Chi tiết thông báo lần thứ ${monthOffset + 1}:
      - Tên sản phẩm: ${tenSanPham}
      - Viết tắt: ${vietTat}
      - Ngày sản xuất: ${ngaySanXuat}
      - Ngày thông báo: ${formattedNotifyDate}
      - Mã Index: ${maIndex}
      - Mã Lô: ${logObject.maLo}
      - Số lượng: ${logObject.soLuong}
      - Kho: ${logObject.tenKho}
      - Hạn sử dụng: ${logObject.hanSuDung || 'Không áp dụng'}
      - Ghi chú: ${logObject.ghiChu || 'Không có'}
    `;

    try {
      const eventStart = new Date(notifyDate);
      eventStart.setHours(9, 0, 0);
      const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000);
      const eventOptions = {
        description: eventDescription,
        guests: EMAIL_RECIPIENTS.join(','),
        sendInvites: SEND_INVITES_FOR_TEST
      };
      calendar.createEvent(eventTitle, eventStart, eventEnd, eventOptions);
      Logger.log(`Đã tạo sự kiện lịch lần ${monthOffset + 1} cho ${maIndex} vào ${formattedNotifyDate}`);
    } catch (e) {
      Logger.log(`Lỗi tạo sự kiện lịch lần ${monthOffset + 1} cho ${maIndex}: ${e.message}`);
    }
  }
}