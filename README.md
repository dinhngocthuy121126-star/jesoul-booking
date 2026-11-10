# HỆ THỐNG ĐẶT VÉ XE TRỰC TUYẾN JESOUL (BPMN TO-BE)
## Báo Cáo Kỹ Thuật, Hướng Dẫn Cài Đặt & Nghiệm Thu Toàn Diện

Hệ thống Đặt vé xe trực tuyến **JESOUL** được phát triển và chuẩn hóa theo quy trình nghiệp vụ **BPMN To-Be** đã được xác nhận (Q-01 → Q-11), áp dụng **Kiến trúc 3 tầng (3-tier Architecture)** nguyên khối dạng module (Modular Monolith):
- **Presentation Tier:** ReactJS 18 (JavaScript) + Vite + Tailwind CSS + Lucide Icons.
- **Application Tier:** Node.js 20 + Express.js (RESTful API, Schedulers node-cron).
- **Data Tier:** Microsoft SQL Server 2022 (Host: `127.0.0.1:1434`, Database: `JesoulDb`).
- **External Integration:** Google Gmail API (OAuth 2.0) gửi email xác nhận 30 phút trước xuất bến.

---

## 1. Cấu trúc Dự án (Directory Structure)

```
BPMN_Project(V2)/
├── backend/                              # Máy chủ Node.js + Express.js API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js               # MSSQL Connection Pool (max 20, min 2)
│   │   │   └── environment.js            # Nạp biến môi trường an toàn từ .env
│   │   ├── controllers/                  # Tiếp nhận Request, gọi Service & trả Response
│   │   ├── jobs/                         # Tiến trình Scheduler chạy ngầm (node-cron)
│   │   │   ├── seatReleaseJob.js         # Quét giải phóng giữ chỗ quá 10 phút
│   │   │   ├── noReplyTimeoutJob.js      # Quét chuyển vé sang 'NoReply' sau 10p gửi mail
│   │   │   └── emailDispatchJob.js       # Quét gửi Gmail xác nhận mốc 30 phút xuất bến
│   │   ├── middlewares/                  # Auth JWT Bearer, Joi Validation, ErrorHandler
│   │   ├── models/                       # Data Access Layer (MSSQL parameterized queries)
│   │   ├── routes/                       # Khai báo các RESTful Endpoints v1
│   │   ├── services/                     # Business Logic Layer (Transaction, Lock UPDLOCK)
│   │   │   ├── AuthService.js
│   │   │   ├── BookingService.js
│   │   │   ├── DriverService.js
│   │   │   ├── EmailService.js           # Google Gmail API OAuth 2.0 Integration
│   │   │   ├── PaymentService.js
│   │   │   ├── TicketService.js
│   │   │   └── TripService.js
│   │   ├── utils/                        # Winston Logger, Token generator
│   │   ├── validators/                   # Joi validation schemas
│   │   ├── app.js                        # Express App & Middlewares
│   │   └── server.js                     # Điểm khởi động máy chủ (Port 5000)
│   ├── test/
│   │   ├── api.test.js                   # 12 bài kiểm thử tích hợp E2E backend
│   │   ├── integration.test.js           # 11 bài kiểm thử tích hợp đa tầng & Gmail API
│   │   └── qa_executor.js                # Bộ runner tự động hóa kịch bản QA
│   ├── .env                              # Biến môi trường thực tế (Đã cấu hình)
│   ├── .env.example                      # Mẫu biến môi trường an toàn
│   └── package.json
│
├── frontend/                             # Giao diện người dùng ReactJS SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                   # Modal, Badge, Spinner, CancelTicketModal, LoginModal
│   │   │   └── layout/                   # Header (Navigation, Role), Footer
│   │   ├── context/                      # AuthContext (Role Customer / Driver / Admin)
│   │   ├── hooks/                        # useCountdown (Bộ đếm ngược 10 phút giữ chỗ)
│   │   ├── pages/
│   │   │   ├── HomePage.jsx              # UI-SCR-01: Trang chủ & Bộ lọc tìm chuyến
│   │   │   ├── SearchResultsPage.jsx     # UI-SCR-02: Kết quả tìm kiếm & Empty State
│   │   │   ├── BookingPage.jsx           # UI-SCR-04: Đặt vé & Nhập thông tin hành khách
│   │   │   ├── PaymentPage.jsx           # UI-SCR-05: Hóa đơn VietQR & Đếm ngược 10 phút
│   │   │   ├── TicketDetailPage.jsx      # UI-SCR-06: Vé xe điện tử Boarding Pass & Hủy vé
│   │   │   ├── DriverDashboardPage.jsx   # UI-SCR-09: Quản lý chuyến xe Tài xế (Gọi điện)
│   │   │   ├── LookupTicketPage.jsx      # Tra cứu nhanh vé xe
│   │   │   └── EmailConfirmationPage.jsx # UI-SCR-08: Landing page xác nhận từ Gmail
│   │   ├── routes/                       # React Router DOM v6
│   │   ├── services/                     # Axios API Client (baseURL: http://localhost:5000/api/v1)
│   │   ├── utils/                        # textUtils chuẩn hóa dữ liệu hiển thị tiếng Việt
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html                        # Google Font Plus Jakarta Sans
│   ├── tailwind.config.js                # Design System (Brand Orange #F97316)
│   └── package.json
│
├── database/
│   └── init.sql                          # DDL 8 bảng SQL Server, Ràng buộc FK & Seed data
│
├── Functional_Test_Cases.xlsx            # File Excel 30 Test Case Chức năng chi tiết
├── Integration_Test_Cases.xlsx           # File Excel 20 Test Case Tích hợp hệ thống
├── generate_test_cases.py                # Script sinh tài liệu Excel tự động bằng openpyxl
├── ToBe(Final).bpmn                      # Quy trình BPMN chuẩn nguồn
├── .gitignore
└── README.md
```

---

## 2. Quy tắc Nghiệp vụ (Business Rules - BPMN To-Be)

| Mã BR | Tên quy tắc | Nội dung nghiệp vụ & Cơ chế xử lý trong hệ thống |
|---|---|---|
| **BR-01** | Chặn đặt vé sát giờ | Hệ thống tự động chặn tìm kiếm và từ chối đặt vé đối với các chuyến xe xuất phát trong vòng **dưới hoặc bằng 30 phút** (`t.DepartureTime <= DATEADD(MINUTE, 30, SYSUTCDATETIME())`). |
| **BR-02** | Chọn số lượng ghế | Khách hàng chỉ chọn **số lượng ghế** (`[-] [N] [+]`, tối đa 10 ghế). Hệ thống tự động sắp xếp ghế liền kề, không hiển thị sơ đồ ghế. |
| **BR-03** | Tạm giữ chỗ 10 phút | Khi bấm xác nhận đặt vé, hệ thống dùng **Pessimistic Locking (`UPDLOCK, ROWLOCK`)** để trừ ghế và thiết lập thời hạn thanh toán 10 phút. Nếu quá 10 phút chưa chuyển khoản, `SeatReleaseJob` tự động hủy đơn và hoàn trả ghế. |
| **BR-04** | Thanh toán chuyển khoản | Hình thức thanh toán duy nhất là **Chuyển khoản ngân hàng (VietQR)**. Màn hình sinh mã QR động chứa đúng Số tiền và Cú pháp (`JS-XXXXX`). |
| **BR-05** | Chính sách không hoàn tiền | Vé xe sau khi đã thanh toán **KHÔNG ĐƯỢC HOÀN TIỀN** dưới bất kỳ hình thức nào. Khi khách hủy vé trên web hoặc từ chối qua Gmail, vé bị thu hồi, ghế được giải phóng để bán lại. |
| **BR-06** | Hủy vé trên Website | Khách chỉ được hủy vé trên website khi chuyến xe **còn trên 30 phút** trước giờ xuất phát. |
| **BR-07** | Email xác nhận 30 phút | Đúng **30 phút trước giờ xuất phát**, `EmailDispatchJob` tự động gửi email xác nhận chứa 2 nút bấm: `[Xác nhận đi]` và `[Tôi không đi nữa]`. |
| **BR-08** | Timer 10 phút phản hồi Gmail | Khách có **10 phút** để bấm nút xác nhận trong Gmail. Nếu không bấm, `NoReplyTimeoutJob` tự động chuyển trạng thái vé sang `NoReply` (Chưa phản hồi). |
| **BR-09** | Tài xế gọi điện xác nhận | Khi vé chuyển sang `NoReply`, thông tin hành khách hiển thị màu vàng trên Web tài xế. Tài xế bấm nút `[📞 Gọi điện]` trực tiếp để hỏi khách và cập nhật kết quả: `[✓ Khách đi]` (Confirmed) hoặc `[✕ Không đi]` (Cancelled). |
| **BR-10** | Phân quyền theo vai trò | Màn hình đăng nhập yêu cầu chọn Role trước: Khách hàng (Họ tên, SĐT, Gmail), Tài xế (SĐT, Mật khẩu), Quản trị (SĐT, Mật khẩu). |
| **BR-11** | Chuyến xe cố định của tài xế | Tài xế được phân công chuyến xe cố định trong CSDL, chỉ quản lý danh sách khách trên chuyến xe của mình. |

---

## 3. Hướng dẫn Cài đặt & Khởi chạy

### 3.1. Yêu cầu Tiên quyết
- **Node.js:** v18.0.0+ hoặc v20.x (Dự án đã kiểm thử trên Node v20.18.0).
- **Cơ sở dữ liệu:** Microsoft SQL Server 2019/2022 (Đã cấu hình tại `127.0.0.1:1434`).
- **Python:** v3.10+ (để chạy script sinh file Excel `openpyxl`).

### 3.2. Cấu hình Cơ sở dữ liệu (MS SQL Server)
1. Kết nối vào SQL Server Management Studio (SSMS) hoặc công cụ `sqlcmd`.
2. Chạy toàn bộ file kịch bản khởi tạo:
   ```bash
   sqlcmd -S 127.0.0.1,1434 -U jesoul_db_user -P JesoulPassword123! -i database/init.sql
   ```
3. Script sẽ tự động tạo cơ sở dữ liệu `JesoulDb`, 8 bảng quan hệ có ràng buộc khóa ngoại, chỉ mục (Index) và dữ liệu mẫu (Seed data).

### 3.3. Cài đặt & Khởi chạy Backend API
1. Di chuyển vào thư mục backend và cài đặt thư viện:
   ```bash
   cd backend
   npm install
   ```
2. Cấu hình file `.env` (đã có sẵn file cấu hình mẫu `.env.example`):
   ```env
   PORT=5000
   NODE_ENV=development
   DB_SERVER=127.0.0.1
   DB_PORT=1434
   DB_NAME=JesoulDb
   DB_USER=jesoul_db_user
   DB_PASSWORD=JesoulPassword123!
   JWT_SECRET=jesoul_super_secret_jwt_key_2026_production_grade
   GMAIL_DRY_RUN=true
   ```
3. Khởi chạy máy chủ Backend:
   ```bash
   npm start
   ```
   Máy chủ sẽ lắng nghe tại `http://localhost:5000`. Kiểm tra cổng tại `http://localhost:5000/api/v1/health`.

### 3.4. Cài đặt & Khởi chạy Frontend
1. Mở cửa sổ dòng lệnh thứ hai, di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   npm install
   ```
2. Khởi chạy máy chủ phát triển Vite:
   ```bash
   npm run dev
   ```
3. Truy cập ứng dụng tại: `http://localhost:3000`.

---

## 4. Hướng dẫn Cấu hình Google Gmail API (OAuth 2.0)

Để chuyển từ chế độ kiểm thử (`GMAIL_DRY_RUN=true`) sang chế độ gửi email thật qua Google Gmail API, thực hiện các bước sau:

1. **Tạo Project trên Google Cloud Console:**
   - Truy cập [Google Cloud Console](https://console.cloud.google.com/).
   - Tạo một Project mới (Ví dụ: `Jesoul-Bus-System`).
2. **Kích hoạt Gmail API:**
   - Điều hướng tới **APIs & Services** $\rightarrow$ **Library**.
   - Tìm kiếm `Gmail API` và nhấn **Enable**.
3. **Cấu hình OAuth Consent Screen:**
   - Chọn loại **External**.
   - Điền App name (`JESOUL Booking`), User support email và Developer contact email.
   - Thêm Scopes: `https://www.googleapis.com/auth/gmail.send`.
   - Trong mục **Test Users**, thêm các địa chỉ email kiểm thử được phép nhận thư.
4. **Tạo OAuth 2.0 Client ID:**
   - Vào **APIs & Services** $\rightarrow$ **Credentials** $\rightarrow$ **Create Credentials** $\rightarrow$ **OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URIs: thêm `https://developers.google.com/oauthplayground`.
   - Lưu lại `Client ID` và `Client Secret`.
5. **Lấy Refresh Token từ Google OAuth Playground:**
   - Mở [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
   - Bấm vào biểu tượng bánh răng góc trên bên phải, tích chọn **Use your own OAuth credentials**, nhập `Client ID` và `Client Secret` vừa tạo.
   - Ở Step 1: Chọn scope `https://www.googleapis.com/auth/gmail.send` và nhấn **Authorize APIs**.
   - Đăng nhập tài khoản Google và cho phép ứng dụng gửi mail.
   - Ở Step 2: Nhấn **Exchange authorization code for tokens**, sao chép giá trị `Refresh token`.
6. **Cập nhật vào file `backend/.env`:**
   ```env
   GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your_client_secret
   GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground
   GMAIL_REFRESH_TOKEN=your_refresh_token
   GMAIL_SENDER_EMAIL=your_email@gmail.com
   GMAIL_DRY_RUN=false
   ```
7. Khởi động lại Backend. Hệ thống sẽ tự động gửi email qua máy chủ Google Gmail API thật.

---

## 5. Tài liệu API Endpoints (API Specification)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
|---|---|---|---|
| `GET` | `/api/v1/health` | Public | Kiểm tra tình trạng cổng API Gateway & MSSQL Connection |
| `POST` | `/api/v1/auth/login` | Public | Đăng nhập theo vai trò (Customer / Driver / Admin) |
| `GET` | `/api/v1/trips/search` | Public | Tìm kiếm chuyến xe khả dụng (Tự động lọc chuyến $\le$ 30 phút) |
| `POST` | `/api/v1/bookings` | Public | Tạo đơn đặt vé, tạm giữ ghế trong 10 phút (Transaction + Lock) |
| `GET` | `/api/v1/bookings/:bookingCode` | Public | Lấy thông tin hóa đơn, mã VietQR và số giây giữ chỗ còn lại |
| `POST` | `/api/v1/payments/webhook` | Public | Tiếp nhận webhook thanh toán chuyển khoản từ ngân hàng |
| `GET` | `/api/v1/tickets/:ticketCode` | Public | Tra cứu chi tiết vé xe điện tử (Boarding Pass) |
| `POST` | `/api/v1/tickets/:ticketCode/cancel` | Public | Khách hàng hủy vé trước 30 phút xuất bến (Không hoàn tiền) |
| `GET` | `/api/v1/tickets/confirm/:token` | Token URL | Tiếp nhận hành động click nút Gmail (`?action=go` hoặc `?action=cancel`) |
| `GET` | `/api/v1/driver/trips/today` | Driver | Tài xế xem danh sách hành khách chuyến xe cố định hôm nay |
| `PATCH` | `/api/v1/driver/tickets/:code/status` | Driver | Tài xế cập nhật trạng thái vé (`Confirmed` / `Cancelled`) |

---

## 6. Kết quả Kiểm thử & Nghiệm thu (Test Reports)

Dự án đã xây dựng và thực thi 2 bộ kiểm thử chuyên biệt:
1. **`Functional_Test_Cases.xlsx`**: Bao gồm **30 Test Cases** kiểm thử toàn bộ Use Case, Business Rules và điều kiện rẽ nhánh Gateway theo BPMN.
   - Số lượng Pass: **30 / 30**
   - Tỷ lệ thành công: **100%**
2. **`Integration_Test_Cases.xlsx`**: Bao gồm **20 Test Cases** kiểm thử tích hợp đa tầng (Frontend ↔ Backend ↔ SQL Server ↔ Gmail API OAuth 2.0).
   - Số lượng Pass: **20 / 20**
   - Tỷ lệ thành công: **100%**

### Lệnh chạy Kiểm thử Tự động:
```bash
# Chạy bộ E2E API Test Suite (12 kịch bản)
cd backend && npm test

# Chạy bộ Kiểm thử Tích hợp & Gmail API OAuth 2.0 (11 kịch bản)
cd backend && node test/integration.test.js

# Chạy bộ kiểm thử tự động QA Executor
cd backend && node test/qa_executor.js

# Tái tạo 2 file Excel báo cáo kiểm thử
cd .. && python generate_test_cases.py
```

---

## 7. Tài khoản Kiểm thử Demo (Seed Accounts)

| Vai trò | Thông tin đăng nhập | Mục đích kiểm thử |
|---|---|---|
| **Khách hàng** | Họ tên: `Nguyễn Văn A`<br>SĐT: `0901234567`<br>Gmail: `nguyenvana@gmail.com` | Tìm chuyến, đặt vé, thanh toán VietQR, hủy vé trên web |
| **Tài xế** | SĐT: `0912345678`<br>Mật khẩu: `123456` | Đăng nhập tài xế, xem khách chuyến 51B-123.45, gọi điện khách NoReply |
| **Chủ xe / Quản trị** | SĐT: `0999888777`<br>Mật khẩu: `123456` | Quản trị viên theo dõi toàn bộ chuyến xe |
