# Project Tasks: Dashboard Implementation

This file tracks the development tasks for the new Inventory Dashboard.

## Phase 1: Setup Google Sheets Environment

- [ ] Create a new sheet named `Database`.
- [ ] Define the required columns in the `Database` sheet: `ItemID`, `Mã Hàng`, `Tên Hàng`, `Số Lượng`, `Đơn Vị Tính`, `Kho`, `Khu V vực`, `Ngày Nhập`, `Ghi Chú`, `IsVisible`.
- [ ] Create a new sheet named `Dashboard`.
- [ ] In the `Database` sheet, add the formula `=SUBTOTAL(103, A2)` to cell `J2` (IsVisible column) and ensure it applies to all data rows.

## Phase 2: Implement Dashboard & Data Display

- [ ] Add Slicers for `Kho` and `Khu Vực` based on the `Database` sheet data.
- [ ] Move the Slicers from the `Database` sheet to the `Dashboard` sheet for user access.
- [ ] Design a search box on the `Dashboard` sheet (e.g., at cell `C2`).
- [ ] Implement the dynamic `QUERY` formula on the `Dashboard` sheet to display data, linking it to the search box and the `IsVisible` column for Slicer compatibility.

## Phase 3: Develop Backend Logic (Apps Script)

- [ ] **`config.js`**: Update the `onOpen()` function to add a menu item `Mở Bảng Nhập Liệu` which calls `showInputDialog`.
- [ ] **`logic.js`**: Create a new function `showInputDialog()` to serve the `InputForm.html` file as a modal dialog.
- [ ] **`logic.js`**: Create a bridge function `saveData(formData)` that calls the corresponding service layer function.
- [ ] **`service.js`**: Create the main business logic function `service_saveData(formData)` which will:
    -   Generate a unique `ItemID`.
    -   Prepare the data row for storage.
    -   Call the database layer to save the data.
    -   Return a success or error object.
- [ ] **`db.js`**: Create the data access function `db_saveNewItem(itemData)` to append a new row to the `Database` sheet.

## Phase 4: Develop Frontend (HTML Input Form)

- [ ] Create a new HTML file named `InputForm.html`.
- [ ] Add the HTML structure for all required form fields (`Mã Hàng`, `Tên Hàng`, etc.).
- [ ] Style the form using Bootstrap CSS.
- [ ] Add client-side JavaScript to handle form submission.
- [ ] Implement the `google.script.run` call to pass form data to the backend `saveData` function.
- [ ] Implement the `withSuccessHandler` and `withFailureHandler` to display a response message to the user within the form.

## Phase 5: Integration and Final Touches

- [ ] On the `Dashboard` sheet, create a clickable "INPUT" button using a drawing.
- [ ] Assign the `showInputDialog` script to the "INPUT" button.
- [ ] Conduct a full test of the input-to-display flow.
- [ ] Update `PLANNING.md` to reflect the new `Dashboard` and `Database` architecture.