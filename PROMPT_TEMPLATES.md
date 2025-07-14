# Các Mẫu Prompt Chuẩn Cho Dự Án

Tài liệu này chứa các mẫu prompt (câu lệnh) được thiết kế sẵn để bạn sử dụng, giúp tương tác với AI một cách hiệu quả và nhất quán theo đúng quy trình của dự án.

---

## 1. Prompt: Bắt Đầu Phiên Làm Việc Mới

**Mục đích:** Dùng prompt này khi bạn bắt đầu một phiên làm việc mới. Nó sẽ ra lệnh cho AI thực hiện các bước khởi tạo cần thiết để nắm bắt toàn bộ bối cảnh dự án trước khi bắt đầu công việc.

**Cách sử dụng:** Sao chép toàn bộ nội dung trong khối dưới đây và dán vào cửa sổ chat.

```markdown
**Bắt đầu phiên làm việc mới cho dự án [Tên dự án].**

Với vai trò là một chuyên gia AI, bạn cần tuân thủ nghiêm ngặt quy trình làm việc đã được định nghĩa trong dự án.

**Nhiệm vụ của bạn:**

1.  **Đọc và Phân tích (Theo đúng thứ tự):**
    *   `SPECIFICATION.md`: Để hiểu toàn bộ yêu cầu, kiến trúc, và các quy tắc nghiệp vụ của hệ thống. Đây là "nguồn sự thật" duy nhất.
    *   `WORKFLOW.md`: Để nắm vững quy trình phát triển hướng đặc tả và các mẹo tương tác hiệu quả.
    *   `dialog.md`: Để nắm được lịch sử các phiên làm việc trước, các vấn đề đã gặp và các quyết định đã được đưa ra.

2.  **Tóm tắt cho tôi:**
    *   Tình trạng hiện tại của dự án dựa trên các tài liệu trên.
    *   Các yêu cầu hoặc nhiệm vụ còn tồn đọng (nếu có).

3.  **Xác nhận:**
    *   "Tôi đã nạp và hiểu rõ các tài liệu cốt lõi, đặc biệt là `SPECIFICATION.md`. Tôi đã sẵn sàng để bắt đầu."

4.  **Hỏi mục tiêu:**
    *   Chủ động hỏi: "Mục tiêu chính của chúng ta trong phiên làm việc hôm nay là gì?"