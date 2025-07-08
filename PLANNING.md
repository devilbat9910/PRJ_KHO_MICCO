# Project Planning: All-In-Sheets Inventory Management

This document outlines the architecture, components, and technical direction for this project.

## Project Architecture
The system is built using a 3-layer architecture within the Google Apps Script environment, designed for maintainability and performance.

*   **Data Layer:** Direct interaction with the Google Sheets database.
*   **Service Layer:** Core business logic and data processing.
*   **UI/Bridge Layer:** Connects the user interface with the service layer.

## Core Components
*   **Google Sheets:** Acts as the database and primary user interface.
    *   `DANH MUC`: User-managed sheet for all dropdowns and business rules.
    *   `LOG_GIAO_DICH_tbl`: Immutable raw data log for all transactions.
    *   `TON_KHO_tonghop`: A "Matrix Inventory" sheet that acts as the central database for inventory levels. Each row represents a unique product batch (SKU), and each column represents a physical warehouse, creating a powerful matrix for querying and reporting. This sheet is managed entirely by the script.
    *   `Trang Chính`: The main dashboard for user interaction.
*   **Google Apps Script:** The runtime environment for all backend code.
*   **HTML Service:** Used to create the sidebar user interface (`FormNhapLieu.html`).

## Coding Conventions
*   All backend code is written in ES5-compatible JavaScript.
*   JSDoc comments are required for all functions.
*   Strict adherence to the 3-layer architecture is mandatory.
*   Global constants are defined in `config.js`.

## File Structure
The project follows a layered structure within the `src/` directory:
*   `src/config.js`: Global configuration, constants, and UI menu setup.
*   `src/db.gs`: **Data Layer.** Functions for reading from and writing to Google Sheets.
*   `src/service.gs`: **Service Layer.** Business logic, calculations, and data manipulation.
*   `src/logic.js`: **UI/Bridge Layer.** Connects the HTML form to the service layer.
*   `src/doc.js`: Logic for generating the project's user documentation.
*   `src/FormNhapLieu.html`: The HTML, CSS, and client-side JavaScript for the data entry form.