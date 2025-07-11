# Project Tasks: Inventory Management System

This file tracks the major features and refactoring efforts completed for the project. The original plan for a separate "Dashboard" has been superseded by integrating functionality directly into the main sheets and sidebar.

---

### Phase 1: Core System & Data Model (Completed)

- [x] **Initial Setup:** Cloned project from Google Apps Script and established `clasp` workflow.
- [x] **Refactor 1 (Data Model):** Migrated to a 3-layer architecture (UI - Service - DB).
- [x] **Refactor 2 (Inventory Model):** Implemented the "Inventory Matrix" model in the `TON_KHO_tonghop` sheet for robust querying.
- [x] **Data Integrity:** Introduced a unique `INDEX (SKU)` for all transactions.

---

### Phase 2: Core Features (Completed)

- [x] **Data Entry Form (`FormNhapLieu.html`):**
    - [x] Implemented data entry for "Nhập", "Xuất", and "Điều chuyển".
    - [x] Added dynamic lot number suggestion.
    - [x] Implemented client-side validation.
- [x] **Manual Bulk Entry:** Created a "Xử lý Bảng" feature to process multiple transactions from the main sheet.
- [x] **Reporting:**
    - [x] Implemented `createMonthlySnapshot` to archive monthly inventory.
    - [x] Implemented `generateMonthlyReport` to create summary reports.
- [x] **Search Dialog (`TraCuu.html`):** Created a dialog to search for inventory items.

---

### Phase 3: Dashboard & UI/UX (Completed)

- [x] **Integrated Dashboard:** Created a "Dashboard" sheet to view filtered inventory data.
- [x] **Slicer Replacement:** Replaced the unreliable `Slicer` with a robust Dropdown filter.
- [x] **Dynamic Filtering:** Implemented an `onEdit` trigger to filter data and dynamically hide/show relevant warehouse columns based on user selection.

---

### Phase 4: Data Integrity & Advanced Features (Completed)

- [x] **Sheet Protection:** Implemented a function to lock `LOG_GIAO_DICH_tbl` and `TON_KHO_tonghop` from manual edits.
- [x] **"Smart" Update Functionality:**
    - [x] Implemented a "Tra Cứu & Sửa" workflow.
    - [x] The system now fetches the original transaction from the LOG, not from the inventory sheet.
    - [x] The system intelligently detects if a change affects inventory or is just informational.
    - [x] The system now generates a detailed change log in the "Ghi Chú" field upon update.
- [x] **Self-Healing Structure:** The `setupInitialStructure` function was enhanced to automatically find and fix data validation rule inconsistencies on core sheets.

---

### Current Status

The system is feature-complete based on all requests to date. All core functionalities including data entry, reporting, dashboard filtering, and secure data updates are implemented and stable.