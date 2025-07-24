/**
 * @OnlyCurrentDoc
 * TỆP CẤU HÌNH VÀ THIẾT LẬP
 * Chứa các biến toàn cục và các hàm chạy một lần.
 */

// --- BIẾN CẤU HÌNH ---
const CONFIG_SHEET_NAME = 'DANH MUC';
const INVENTORY_SHEET_NAME = 'TON_KHO_HIEN_TAI';
const HISTORY_SHEET_PREFIX = 'LichSu_';
const SNAPSHOT_SHEET_PREFIX = 'Snapshot_';
const REPORT_SHEET_NAME = 'BaoCaoTonKho';
const MAIN_SHEET_NAME = 'Trang Chính';
const VIEW_INVENTORY_SHEET_NAME = 'vw_tonkho'; // Tên sheet View
const LOG_SHEET_NAME = 'LOG_GIAO_DICH_tbl';
const INPUT_SHEET_NAME = 'INPUT';

// --- Tọa độ bảng trên Trang Chính & Sheet INPUT ---
const RECENT_TRANSACTIONS_RANGE = 'A27:K38'; // Header ở dòng 27, 11 dòng data (28-38) trên sheet INPUT
const MANUAL_INPUT_RANGE = 'A2:K23';      // Vùng nhập liệu thủ công trên sheet INPUT. Header ở dòng 2.

