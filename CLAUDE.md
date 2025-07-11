### 🔄 Project Awareness & Context
- **Always read `PLANNING.md`** at the start of a new conversation to understand the project's architecture, goals, and data structure.
- **Check `TASK.md`** before starting a new task. If the task isn’t listed, add it with a brief description.
- **Refer to `src/doc.js`** for detailed operational documentation and business logic rules.

### 🧱 Code Structure & Modularity (Google Apps Script)
- **Follow the existing 3-layer architecture:**
  - **`db.gs` (Data Layer):** Only for direct interaction with Google Sheets (reading/writing cell values). No business logic.
  - **`service.gs` (Service Layer):** Contains all business logic (calculations, data processing, generating SKUs, etc.). Does not interact directly with Sheets.
  - **`logic.js` (Bridge/UI Layer):** Acts as a bridge connecting the HTML frontend (`FormNhapLieu.html`) to the `service.gs`. Contains functions called directly by `google.script.run`.
  - **`config.js`:** For global constants (sheet names, menu items) and one-time setup functions (`onOpen`, `setupInitialStructure`).
- **Keep files focused on their layer.** Do not mix business logic in the `db.gs` or Sheet interactions in `service.gs`.
- **Use clear, descriptive function names** that indicate their purpose and layer (e.g., `db_getCategoryData`, `service_processTransaction`).

### ✅ Task Completion
- **Mark completed tasks in `TASK.md`** immediately after finishing them by checking the box `[x]`.
- Add new sub-tasks or TODOs discovered during development to `TASK.md` under a "Discovered During Work" section.

### 📎 Style & Conventions (Google Apps Script)
- **Use JavaScript (ES5 compatible)** as the primary language for `.gs` and `.js` files.
- **Use `@OnlyCurrentDoc`** at the top of every `.gs` and `.js` file to ensure the script is bound to the spreadsheet.
- **Use `const` for constants** (like sheet names) and `let` for variables.
- **Write JSDoc comments for every function** explaining its purpose, parameters (`@param`), and return values (`@returns`).
  ```javascript
  /**
   * Brief summary of the function.
   * @param {string} param1 - Description of the first parameter.
   * @param {object} param2 - Description of the second parameter.
   * @returns {boolean} Description of the return value.
   */
  function exampleFunction(param1, param2) {
    // ... function logic
  }
  ```
- **Use `SpreadsheetApp.getUi()`** for user-facing alerts and dialogs.
- **Use `Logger.log()`** for debugging; avoid using `console.log()` which doesn't work in all Apps Script contexts.
- **Use Semicolons in Formulas:** All spreadsheet formulas set via script (e.g., `setFormula()`) must use semicolons (`;`) as separators for arguments, not commas (`,`), to comply with the sheet's locale settings. Example: `=IF(A1>1; "Lớn hơn 1"; "Nhỏ hơn 1")`.

### 🧠 AI Behavior Rules
- **Never assume missing context. Ask questions if uncertain.**
- **Always confirm sheet names and cell ranges** by checking `config.js` or asking before writing code that interacts with them.
- **Do not modify the `LOG_GIAO_DICH_tbl` sheet directly.** All data should be appended via the `db.addTransactionToLog()` function.
- **Never delete or overwrite existing code** unless explicitly instructed to or as part of a refactoring task from `TASK.md`.
- **Build Self-Healing Functions:** User-facing functions (like menu items) should be robust. They must validate prerequisites and automatically fix structural issues (like a missing column) before proceeding. This avoids forcing the user to run multiple separate steps in the correct order.