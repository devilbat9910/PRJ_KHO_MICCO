# Project Tasks

This file tracks the status of development tasks.

## To Do
- [x] Bug: Sửa lỗi công thức `SUM` trong `config.js` để áp dụng cho toàn bộ cột, không chỉ một hàng.
- [x] Bug: Viết lại `setupInitialStructure` để bảo toàn dữ liệu hiện có khi tái cấu trúc sheet, tránh mất mát dữ liệu.
- [x] Bug: Sửa lại cú pháp công thức trong code, thay thế dấu phẩy (`,`) bằng dấu chấm phẩy (`;`) để tương thích với cài đặt Google Sheets.
- [x] Cập nhật `CLAUDE.md` để ghi nhớ quy tắc sử dụng dấu chấm phẩy trong công thức.
- [x] Tái cấu trúc `TON_KHO_tonghop` để tự động hóa việc quản lý cột kho và thêm cột "Tổng SL".
- [x] Implement logic to automatically delete rows with zero total inventory from `TON_KHO_tonghop` after each transaction.
- [x] Bug: Dialog tra cứu đang báo lỗi `service_performSearch is not defined`.
- [x] Nâng cấp Dialog Tra cứu: Thêm trường tìm kiếm theo INDEX và xử lý logic tìm kiếm thông minh.
- [x] Lọc Tồn Kho: Ẩn các sản phẩm có tổng tồn kho bằng 0 khỏi kết quả tra cứu.
- [x] Bug: When using an INDEX for an export transaction, the 'Quy cách' field is not populated, causing a validation error.
- [x] Fix recurring bug: Dropdown lists in the sidebar are stuck on "Loading...".
- [x] Implement `createMonthlySnapshot()` function in `logic.js` to work with the new data structure.
- [x] Implement `generateMonthlyReport()` function in `logic.js` to work with the new data structure.

## In Progress
-

## Done
- [x] Setup initial project structure.
- [x] Refactor project documentation and rules (`CLAUDE.md`, `PLANNING.md`).
- [x] Refactor `displayRecentTransactions()` to read from `LOG_GIAO_DICH_tbl` via service layer.
- [x] Refactor `processManualEntry()` to use the service layer.
- [x] Fix dropdown loading bug by refactoring `getCategoryData` and service calls.