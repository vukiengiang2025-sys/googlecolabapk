# Elite OS v6.0: Hệ Điều Hành AI Tự Hành (Autonomous AI Brain)

Elite OS v6.0 là một nền tảng mô phỏng hệ điều hành AI tiên tiến, được thiết kế để quản lý các tiến trình AI phức tạp, tối ưu hóa tài nguyên hệ thống và cung cấp khả năng tạo mã nguồn thông qua trí tuệ nhân tạo (Gemini AI).

---

## 🌟 Tính Năng Chính

### 1. Trung Tâm Điều Khiển (Hub - Workload Matrix)
Đây là trái tim của hệ thống, nơi bạn quản lý toàn bộ các tác vụ AI:
- **Ma Trận Công Việc**: Theo dõi danh sách các tác vụ đang chạy, đang chờ hoặc đã hoàn thành.
- **Trạng Thái Nút (Node Status)**: Hệ thống tự động điều phối công việc giữa các nút nội bộ (Local) hoặc nút từ xa (Remote/Federated) dựa trên yêu cầu VRAM và mức độ ưu tiên.
- **Bảng Hệ Thống (Integrity Panel)**: Hiển thị các điểm kiểm soát (Checkpoints) và các chỉ số hội tụ (Convergence) của bộ não AI.

### 2. Lò AI (Pipeline Forge)
Sử dụng sức mạnh của Google Gemini API để hiện thực hóa các ý tưởng của bạn:
- **Nhập ý định**: Bạn chỉ cần nhập mô tả yêu cầu bằng ngôn ngữ tự nhiên (ví dụ: "Tạo script nhận diện khuôn mặt").
- **Tự động tạo mã**: Elite OS sẽ "dệt" các hướng dẫn thần kinh và tạo ra mã nguồn Python hoàn chỉnh, sẵn sàng để sao chép vào bộ nhớ đệm của bạn.

### 3. Thư Viện Module (Modules/Library)
Nơi lưu trữ các đoạn mã nguồn ưu tú (Elite Snippets) và các module hệ thống đã được tối ưu hóa.

### 4. Tham Số Hệ Thống (System Parameters)
Kiểm soát chuyên sâu các hoạt động của nhân hệ thống:
- **Tối ưu hóa Nhân (Kernel Optimization)**: Tự động dọn dẹp các nút ưu tiên thấp khi hệ thống bị quá tải CPU/RAM.
- **Xóa Bộ Nhớ Đệm (Flush Cache)**: Làm sạch bộ nhớ đệm thần kinh để giải phóng tài nguyên.
- **Giao thức Điều khiển**: Bật/tắt các tính năng nâng cao như "Cô lập thích ứng" hoặc "Di cư mạng thần kinh".

---

## 🛠️ Hướng Dẫn Sử Dụng

### Bước 1: Khởi Chạy Tác Vụ
Tại tab **Trung tâm**, bạn có thể nhấn vào nút **ĐĂNG_KÝ_NÚT** để tạo một tác vụ mô phỏng mới. Hệ thống sẽ tự cấp phát ID và gán mức độ ưu tiên.

### Bước 2: Quản Lý Tác Vụ
- **Vuốt Sang Phải (hoặc nhấn START)**: Để bắt đầu thực thi một tác vụ đang xếp hàng.
- **Vuốt Sang Trái**: Để dọn sạch tác vụ đã hoàn thành hoặc hủy bỏ tác vụ đang chạy (yêu cầu xác nhận hoàn tác).
- **Trạng thái**:
    - `XẾP_HÀNG`: Đang chờ tài nguyên.
    - `ĐANG_CHẠY`: Đang thực thi xử lý dữ liệu.
    - `THÀNH_CÔNG`: Tác vụ hoàn tất và đã tối ưu hóa.

### Bước 3: Sử Dụng Lò AI
Chuyển sang tab **Lò AI**, nhập yêu cầu của bạn vào khung văn bản và nhấn **KHỞI CHẠY PIPELINE**. Chờ trong giây lát để AI biên dịch ý tưởng thành mã nguồn.

### Bước 4: Tình Huống Khẩn Cấp
Nếu hệ thống báo động đỏ (`DỰ_BÁO_SỤP_ĐỔ`), hãy vào tab **Hệ thống** và:
1. Nhấn **Tối ưu hóa Nhân**.
2. Nếu vẫn không hiệu quả, sử dụng **Ghi đè Hủy diệt (TERMINATE)** để dọn sạch toàn bộ phiên làm việc.

---

## 🚀 Công Nghệ Sử Dụng

- **Frontend**: React 18, Vite, TypeScript.
- **Styling**: Tailwind CSS (Thiết kế Cyberpunk/Futuristic).
- **Animations**: Framer Motion (hiệu ứng chuyển cảnh và haptic simulation).
- **Core AI**: Google Gemini AI SDK.
- **Icons**: Lucide React.

---

## ⚠️ Lưu Ý Quan Trọng
Ứng dụng yêu cầu biến môi trường `GEMINI_API_KEY` để hoạt động đầy đủ tính năng trong phần **Lò AI**. Vui lòng cấu hình khóa API trong phần cài đặt bí mật của AI Studio.

---
*Phát triển bởi Google AI Studio Build - 2026*
