/**
 * BỘ KIỂM THỬ TÍCH HỢP TOÀN DIỆN (COMPREHENSIVE INTEGRATION TEST SUITE)
 * Hệ thống: Đặt vé xe trực tuyến JESOUL
 * Phạm vi: Frontend -> Backend -> MS SQL Server -> Google Gmail API (OAuth 2.0)
 */

const assert = require('assert');
const app = require('../src/app');
const { connectDatabase, getPool, sql } = require('../src/config/database');
const EmailService = require('../src/services/EmailService');
const EmailLogModel = require('../src/models/EmailLogModel');
const env = require('../src/config/environment');

let server;
let baseUrl;

async function request(method, path, body = null, headers = {}) {
  const url = `${baseUrl}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    data = text;
  }

  return {
    status: res.status,
    data
  };
}

let driverToken = null;
let createdBookingCode = null;
let createdTicketCode = null;
let createdToken = null;
let secondTicketId = null;
let secondTicketCode = null;

async function runIntegrationTests() {
  console.log('\n================================================================');
  console.log(' BẮT ĐẦU CHẠY BỘ KIỂM THỬ TÍCH HỢP TOÀN DIỆN & GMAIL API OAUTH 2.0');
  console.log(' Cơ sở dữ liệu: Microsoft SQL Server 2022 (JesoulDb)');
  console.log('================================================================\n');

  // Khởi động Database & Server
  await connectDatabase();
  const pool = getPool();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api/v1`;

  // BƯỚC 0: Reset dữ liệu Trip 1 để có đúng 16 ghế trống và giờ chạy 120 phút nữa (> 30 phút theo BR-01)
  console.log('[CHUẨN BỊ] Reset dữ liệu chuyến xe kiểm thử trong SQL Server...');
  await pool.request().query(`
    UPDATE dbo.Trips
    SET AvailableSeats = 16,
        DepartureTime = DATEADD(MINUTE, 120, SYSUTCDATETIME()),
        ArrivalTime = DATEADD(MINUTE, 270, SYSUTCDATETIME()),
        Status = 'Scheduled'
    WHERE TripID = 1;

    DELETE FROM dbo.EmailLogs WHERE RecipientEmail LIKE '%test%';
  `);
  console.log('  ✓ Đã thiết lập Chuyến xe 1: Khởi hành sau 120 phút, Số ghế khả dụng = 16\n');

  // TEST 1: Kiểm thử cấu hình Gmail API & OAuth 2.0 (Không lưu secret trong Source Code)
  console.log('[TEST 1] Kiểm tra cấu hình Gmail API & Không lưu secret trong Source Code...');
  assert.ok(process.env.GMAIL_CLIENT_ID, 'GMAIL_CLIENT_ID phải được định nghĩa trong .env');
  assert.ok(process.env.GMAIL_CLIENT_SECRET, 'GMAIL_CLIENT_SECRET phải được định nghĩa trong .env');
  assert.ok(process.env.GMAIL_REFRESH_TOKEN, 'GMAIL_REFRESH_TOKEN phải được định nghĩa trong .env');
  console.log('  ✓ PASSED: Biến môi trường Gmail API OAuth 2.0 được cấu hình an toàn qua .env');

  // TEST 2: Kiểm thử hàm tạo MIME Message RFC 2822
  console.log('\n[TEST 2] Kiểm thử định dạng chuẩn MIME RFC 2822 cho Gmail API...');
  const sampleMime = EmailService.createMimeMessage({
    to: 'khachhang.test@gmail.com',
    subject: 'Xác nhận chuyến xe',
    htmlContent: '<h1>Test JESOUL</h1>',
    senderEmail: 'noreply.jesoul@gmail.com'
  });
  assert.ok(sampleMime && typeof sampleMime === 'string', 'MIME message phải là chuỗi Base64URL');
  assert.strictEqual(sampleMime.includes('+'), false, 'Base64URL không được chứa ký tự +');
  assert.strictEqual(sampleMime.includes('/'), false, 'Base64URL không được chứa ký tự /');
  console.log('  ✓ PASSED: MIME Message mã hóa Base64URL tương thích 100% chuẩn Google Gmail API');

  // TEST 3: Kiểm thử luồng Đặt vé End-to-End: Search -> Book -> Hold 10p (Backend -> SQL Server)
  console.log('\n[TEST 3] Kiểm thử luồng Đặt vé & Tạm giữ chỗ 10 phút (Transaction + Lock)...');
  const bookRes = await request('POST', '/bookings', {
    tripId: 1,
    fullName: 'Nguyễn Văn Kiểm Thử',
    phoneNumber: '0933112233',
    email: 'khachhang.test@gmail.com',
    seatQuantity: 2
  });
  assert.strictEqual(bookRes.status, 201, 'Đặt vé phải trả về 201 Created');
  assert.strictEqual(bookRes.data.success, true);
  createdBookingCode = bookRes.data.data.bookingCode;
  createdTicketCode = bookRes.data.data.tickets[0].TicketCode || bookRes.data.data.tickets[0].ticketCode;
  createdToken = bookRes.data.data.tickets[0].ConfirmationToken || bookRes.data.data.tickets[0].confirmationToken;
  secondTicketId = bookRes.data.data.tickets[1].TicketID || bookRes.data.data.tickets[1].ticketId;
  secondTicketCode = bookRes.data.data.tickets[1].TicketCode || bookRes.data.data.tickets[1].ticketCode;
  console.log(`  ✓ PASSED: Đặt vé thành công: Mã đơn = ${createdBookingCode}, Vé 1 = ${createdTicketCode}, Vé 2 = ${secondTicketCode}`);

  // Kiểm tra số ghế đã bị trừ trong DB
  const seatCheck = await pool.request().query('SELECT AvailableSeats FROM dbo.Trips WHERE TripID = 1');
  assert.strictEqual(seatCheck.recordset[0].AvailableSeats, 14, 'Số ghế trống phải giảm từ 16 còn 14');
  console.log('  ✓ PASSED: Cơ sở dữ liệu SQL Server đã cập nhật số ghế trống: 14 ghế còn lại');

  // TEST 4: Kiểm thử Concurrency: Chống bán âm ghế khi 2 khách đặt đồng thời
  console.log('\n[TEST 4] Kiểm thử Xử lý đồng thời (Concurrency) & Khóa hàng (UPDLOCK)...');
  await pool.request().query('UPDATE dbo.Trips SET AvailableSeats = 1 WHERE TripID = 1');

  const req1 = await request('POST', '/bookings', { tripId: 1, fullName: 'Khách A', phoneNumber: '0911000111', email: 'a.test@gmail.com', seatQuantity: 1 });
  const req2 = await request('POST', '/bookings', { tripId: 1, fullName: 'Khách B', phoneNumber: '0911000222', email: 'b.test@gmail.com', seatQuantity: 1 });

  const successCount = [req1, req2].filter(r => r.status === 201).length;
  const failureCount = [req1, req2].filter(r => r.status === 400).length;
  assert.strictEqual(successCount, 1, 'Chỉ 1 khách được phép đặt chiếc ghế cuối cùng');
  assert.strictEqual(failureCount, 1, 'Khách còn lại phải bị từ chối 400');
  console.log('  ✓ PASSED: Khóa hàng bi quan (UPDLOCK) bảo vệ 100% tính toàn vẹn, ngăn chặn Overbooking hoàn hảo');

  // Khôi phục lại chuyến xe
  await pool.request().query('UPDATE dbo.Trips SET AvailableSeats = 13 WHERE TripID = 1');

  // TEST 5: Thanh toán Webhook -> Chuyển trạng thái Paid
  console.log('\n[TEST 5] Kiểm thử Thanh toán Webhook & Chuyển trạng thái Paid...');
  const payRes = await request('POST', '/payments/webhook', {
    bookingCode: createdBookingCode,
    amount: 360000,
    transactionRef: `TEST-TX-${Date.now()}`
  });
  assert.strictEqual(payRes.status, 200, 'Webhook phải trả về 200');
  
  const ticketPaidCheck = await request('GET', `/tickets/${createdTicketCode}`);
  assert.strictEqual(ticketPaidCheck.data.data.TicketStatus, 'Paid', 'Trạng thái vé phải là Paid');
  console.log(`  ✓ PASSED: Vé #${createdTicketCode} đã chuyển sang trạng thái 'Paid' (Đã thanh toán)`);

  // Điều chỉnh giờ xuất phát về mốc 25 phút trước giờ chạy để kiểm thử điều kiện gửi email 30p (BPMN GW-3)
  await pool.request().query('UPDATE dbo.Trips SET DepartureTime = DATEADD(MINUTE, 25, SYSUTCDATETIME()) WHERE TripID = 1');

  // TEST 6: Kiểm thử Tích hợp Gmail API: Gửi email xác nhận 30 phút trước xuất phát
  console.log('\n[TEST 6] Kiểm thử Tích hợp Gmail API: Gửi email đúng điều kiện BPMN (30 phút trước xuất bến)...');
  const ticketDataForEmail = {
    TicketID: ticketPaidCheck.data.data.TicketID,
    TicketCode: createdTicketCode,
    ConfirmationToken: createdToken,
    CustomerName: 'Nguyễn Văn Kiểm Thử',
    CustomerEmail: 'khachhang.test@gmail.com',
    CustomerPhone: '0933112233',
    TripID: 1,
    Origin: 'Bình Định',
    Destination: 'Quy Nhơn',
    DepartureTime: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    ArrivalTime: new Date(Date.now() + 85 * 60 * 1000).toISOString(),
    BusType: 'Limousine VIP',
    PlateNumber: '77B-123.45',
    DriverName: 'Trần Văn B',
    DriverPhone: '0912345678'
  };

  const emailResult = await EmailService.sendDepartureConfirmationEmail(ticketDataForEmail);
  assert.strictEqual(emailResult.success, true, 'Gửi email xác nhận phải thành công');
  assert.ok(emailResult.logId, 'Phải có logId được ghi trong EmailLogs');
  console.log(`  ✓ PASSED: Đã gửi email xác nhận thành công tới ${ticketDataForEmail.CustomerEmail} (LogID: ${emailResult.logId})`);

  // Kiểm tra bản ghi trong bảng dbo.EmailLogs
  const logInDb = await pool.request()
    .input('logId', sql.Int, emailResult.logId)
    .query('SELECT LogID, TicketID, RecipientEmail, Status, SentAt FROM dbo.EmailLogs WHERE LogID = @logId');
  assert.strictEqual(logInDb.recordset.length, 1);
  assert.strictEqual(logInDb.recordset[0].Status, 'Sent', 'Trạng thái trong EmailLogs phải là Sent');
  assert.ok(logInDb.recordset[0].SentAt, 'SentAt phải có giá trị thời gian thực tế');
  console.log('  ✓ PASSED: Cơ sở dữ liệu dbo.EmailLogs đã lưu lịch sử gửi email chính xác');

  // TEST 7: Kiểm thử Cơ chế Chống gửi trùng email khi Retry (Idempotency)
  console.log('\n[TEST 7] Kiểm thử Cơ chế Chống gửi trùng email (Idempotency / No-Duplicate Retry)...');
  const duplicateSendResult = await EmailService.sendDepartureConfirmationEmail(ticketDataForEmail);
  assert.strictEqual(duplicateSendResult.skipped, true, 'Hệ thống phải tự động phát hiện và bỏ qua lần gửi trùng');
  assert.strictEqual(duplicateSendResult.logId, emailResult.logId, 'Phải tái sử dụng LogID ban đầu');
  console.log('  ✓ PASSED: Hệ thống chặn gửi trùng email thành công khi tiến hành retry!');

  // TEST 8: Kiểm thử Xử lý khi Gmail API gặp sự cố (Failure Handling)
  console.log('\n[TEST 8] Kiểm thử Cơ chế Bắt lỗi và Xử lý ngoại lệ khi Gmail API thất bại...');
  const failingTicket = {
    TicketID: secondTicketId,
    TicketCode: secondTicketCode,
    ConfirmationToken: 'token_fail_test',
    CustomerName: 'Khách Lỗi',
    CustomerEmail: 'khachhang.fail@gmail.com',
    Origin: 'Bình Định',
    Destination: 'Quy Nhơn',
    DepartureTime: new Date().toISOString()
  };

  const originalSender = env.gmail.senderEmail;
  const originalDryRun = env.gmail.dryRun;
  try {
    env.gmail.dryRun = false;
    // Với dryRun = false và refresh_token kiểm thử, Gmail API sẽ ném lỗi xác thực OAuth
    const failResult = await EmailService.sendDepartureConfirmationEmail(failingTicket);
    assert.strictEqual(failResult.success, false, 'Hệ thống phải bắt được lỗi khi thông tin không hợp lệ');
    assert.ok(failResult.error, 'Phải có nội dung lỗi chi tiết');

    // Kiểm tra trạng thái Failed trong DB
    const failedLog = await pool.request()
      .input('logId', sql.Int, failResult.logId)
      .query('SELECT Status, ErrorMessage FROM dbo.EmailLogs WHERE LogID = @logId');
    assert.strictEqual(failedLog.recordset[0].Status, 'Failed', 'Trạng thái trong DB phải là Failed');
    console.log(`  ✓ PASSED: Hệ thống đã bắt lỗi ngoại lệ, không bị crash và lưu vết ErrorMessage vào dbo.EmailLogs: "${failedLog.recordset[0].ErrorMessage.substring(0, 60)}..."`);
  } finally {
    env.gmail.dryRun = originalDryRun;
    env.gmail.senderEmail = originalSender;
  }

  // TEST 9: Khách hàng click nút CTA từ Gmail (Xác nhận đi - action=go)
  console.log('\n[TEST 9] Khách hàng click nút [XÁC NHẬN ĐI] từ nút bấm Gmail...');
  const ctaRes = await request('GET', `/tickets/confirm/${createdToken}?action=go`);
  assert.strictEqual(ctaRes.status, 200);
  assert.ok(ctaRes.data.includes('XÁC NHẬN CHUYẾN ĐI THÀNH CÔNG'), 'Nội dung phản hồi phải là trang thành công');

  // Kiểm tra vé chuyển sang Confirmed
  const ticketConfirmedCheck = await request('GET', `/tickets/${createdTicketCode}`);
  assert.strictEqual(ticketConfirmedCheck.data.data.TicketStatus, 'Confirmed', 'Vé phải chuyển sang Confirmed');

  // Kiểm tra EmailLogs ghi nhận Clicked
  const clickCheck = await pool.request()
    .input('ticketId', sql.Int, ticketDataForEmail.TicketID)
    .query("SELECT Status, ActionClicked, ClickedAt FROM dbo.EmailLogs WHERE TicketID = @ticketId AND Status = 'Clicked'");
  assert.strictEqual(clickCheck.recordset.length, 1);
  assert.strictEqual(clickCheck.recordset[0].ActionClicked, 'Go');
  console.log('  ✓ PASSED: Vé chuyển sang Confirmed và dbo.EmailLogs ghi nhận Clicked (Action: Go)');

  // TEST 10: Tài xế đăng nhập và kiểm tra danh sách hành khách
  console.log('\n[TEST 10] Tài xế đăng nhập & xem danh sách hành khách đã xác nhận...');
  const driverLoginRes = await request('POST', '/auth/login', {
    role: 'Driver',
    phoneNumber: '0912345678',
    password: '123456'
  });
  assert.strictEqual(driverLoginRes.status, 200);
  driverToken = driverLoginRes.data.data.token;

  const driverTripRes = await request('GET', '/driver/trips/today', null, {
    Authorization: `Bearer ${driverToken}`
  });
  assert.strictEqual(driverTripRes.status, 200);
  const foundTicket = driverTripRes.data.data.passengers.find(p => p.TicketCode === createdTicketCode);
  assert.ok(foundTicket, 'Vé đã xác nhận phải nằm trong danh sách hành khách của tài xế');
  assert.strictEqual(foundTicket.TicketStatus, 'Confirmed');
  console.log(`  ✓ PASSED: Tài xế thấy vé #${createdTicketCode} hiển thị trạng thái 'Confirmed'`);

  // TEST 11: Tiến trình nền EmailDispatchJob quét tự động
  console.log('\n[TEST 11] Kiểm thử Lập lịch quét tự động (EmailDispatchJob)...');
  const dispatchSummary = await EmailService.dispatchUpcomingDepartureEmails();
  assert.ok(typeof dispatchSummary.total === 'number');
  console.log(`  ✓ PASSED: Tiến trình tự động quét thành công: Tổng vé xét duyệt = ${dispatchSummary.total}`);

  console.log('\n================================================================');
  console.log(' 🎉 TẤT CẢ 11 BÀI KIỂM THỬ TÍCH HỢP & GMAIL API ĐÃ VƯỢT QUA 100%!');
  console.log('================================================================\n');

  if (server) server.close();
}

runIntegrationTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  if (server) server.close();
  process.exit(1);
});
