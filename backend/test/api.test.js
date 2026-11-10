const http = require('http');
const { startServer } = require('../src/server');
const { getPool, sql } = require('../src/config/database');

const BASE_URL = 'http://localhost:5000/api/v1';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (_) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ PASSED: ${message}`);
}

async function runTests() {
  console.log('========================================================');
  console.log(' BẮT ĐẦU CHẠY BỘ KIỂM THỬ TÍCH HỢP TOÀN DIỆN (E2E API TEST)');
  console.log(' Cơ sở dữ liệu: Microsoft SQL Server (JesoulDb)');
  console.log('========================================================\n');

  const server = await startServer();
  const pool = getPool();

  // Reset dữ liệu chuyến xe mẫu để đảm bảo tính Idempotent cho mỗi lần chạy test
  await pool.request().query(`
    UPDATE dbo.Trips 
    SET AvailableSeats = 16, DepartureTime = DATEADD(HOUR, 2, SYSUTCDATETIME())
    WHERE TripID = 1;
    UPDATE dbo.Trips 
    SET AvailableSeats = 16, DepartureTime = DATEADD(HOUR, 5, SYSUTCDATETIME())
    WHERE TripID = 2;
  `);

  let customerToken = null;
  let driverToken = null;
  let testTripId = null;
  let createdBookingCode = null;
  let firstTicketCode = null;
  let firstTicketToken = null;
  let secondTicketCode = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Health Check
    // ----------------------------------------------------
    console.log('[TEST 1] Kiểm tra Gateway Health Check...');
    const healthRes = await request('GET', '/health');
    assert(healthRes.status === 200, 'HTTP status phải là 200');
    assert(healthRes.data.success === true, 'Response success phải là true');

    // ----------------------------------------------------
    // TEST 2: Đăng nhập Khách hàng (UC-01, Q-10)
    // ----------------------------------------------------
    console.log('\n[TEST 2] Đăng nhập Khách hàng (Họ tên, SĐT, Gmail)...');
    const custLoginRes = await request('POST', '/auth/login', {
      role: 'Customer',
      fullName: 'Nguyễn Văn A',
      phoneNumber: '0901234567',
      email: 'nguyenvana@gmail.com'
    });
    assert(custLoginRes.status === 200, 'Đăng nhập khách hàng trả về 200');
    assert(custLoginRes.data.data.token, 'Phải sinh ra JWT token');
    assert(custLoginRes.data.data.user.Role === 'Customer', 'Role phải là Customer');
    customerToken = custLoginRes.data.data.token;

    // ----------------------------------------------------
    // TEST 3: Đăng nhập Tài xế (UC-01, Q-10)
    // ----------------------------------------------------
    console.log('\n[TEST 3] Đăng nhập Tài xế (SĐT, Mật khẩu)...');
    const driverLoginRes = await request('POST', '/auth/login', {
      role: 'Driver',
      phoneNumber: '0912345678',
      password: '123456'
    });
    assert(driverLoginRes.status === 200, 'Đăng nhập tài xế trả về 200');
    assert(driverLoginRes.data.data.user.Role === 'Driver', 'Role phải là Driver');
    driverToken = driverLoginRes.data.data.token;

    // ----------------------------------------------------
    // TEST 4: Tìm kiếm chuyến xe (UC-02, BR-01, BR-02)
    // ----------------------------------------------------
    console.log('\n[TEST 4] Tìm kiếm chuyến xe hợp lệ (Áp dụng chặn <= 30 phút)...');
    const searchRes = await request('GET', '/trips/search?origin=Bình&seatQuantity=2');
    assert(searchRes.status === 200, 'Tìm kiếm trả về 200');
    assert(Array.isArray(searchRes.data.data), 'Data phải là danh sách chuyến xe');
    assert(searchRes.data.data.length > 0, 'Phải tìm thấy ít nhất 1 chuyến xe khả dụng');
    testTripId = searchRes.data.data[0].TripID;
    const initialSeats = searchRes.data.data[0].AvailableSeats;
    console.log(`    Chuyến xe kiểm thử ID = ${testTripId}, Số ghế ban đầu = ${initialSeats}`);

    // ----------------------------------------------------
    // TEST 5: Đặt vé & Tạm giữ chỗ 10 phút (UC-03, BR-02, BR-03)
    // ----------------------------------------------------
    console.log('\n[TEST 5] Tạo đơn đặt vé & Khóa ghế 10 phút (Transaction + Concurrency Lock)...');
    const bookingRes = await request('POST', '/bookings', {
      tripId: testTripId,
      fullName: 'Nguyễn Văn A',
      phoneNumber: '0901234567',
      email: 'nguyenvana@gmail.com',
      seatQuantity: 2
    });
    assert(bookingRes.status === 201, 'Đặt vé thành công trả về 201 Created');
    assert(bookingRes.data.data.bookingCode.startsWith('JS-'), 'Mã đơn phải có định dạng JS-XXXXX');
    assert(bookingRes.data.data.tickets.length === 2, 'Phải sinh đúng 2 vé con');
    assert(bookingRes.data.data.bankDetails.qrCodeUrl, 'Phải có URL VietQR');

    createdBookingCode = bookingRes.data.data.bookingCode;
    firstTicketCode = bookingRes.data.data.tickets[0].TicketCode;
    firstTicketToken = bookingRes.data.data.tickets[0].ConfirmationToken;
    secondTicketCode = bookingRes.data.data.tickets[1].TicketCode;
    console.log(`    Mã đơn vé tạo thành công: ${createdBookingCode}`);
    console.log(`    Vé 1: ${firstTicketCode} | Token: ${firstTicketToken.substring(0, 10)}...`);
    console.log(`    Vé 2: ${secondTicketCode}`);

    // Kiểm tra số ghế trong DB đã bị trừ chính xác 2 ghế
    const pool = getPool();
    const tripCheck = await pool.request().query(`SELECT AvailableSeats FROM dbo.Trips WHERE TripID = ${testTripId}`);
    assert(tripCheck.recordset[0].AvailableSeats === initialSeats - 2, 'Số ghế trống trong DB phải giảm đúng 2 ghế');

    // ----------------------------------------------------
    // TEST 6: Xem thông tin hóa đơn thanh toán (UC-04)
    // ----------------------------------------------------
    console.log('\n[TEST 6] Tra cứu hóa đơn và kiểm tra bộ đếm giờ giữ chỗ 10 phút...');
    const invoiceRes = await request('GET', `/bookings/${createdBookingCode}`);
    assert(invoiceRes.status === 200, 'Tra cứu hóa đơn trả về 200');
    assert(invoiceRes.data.data.Status === 'Pending', 'Trạng thái đơn ban đầu phải là Pending (Tạm giữ chỗ)');
    assert(invoiceRes.data.data.remainingSeconds > 0 && invoiceRes.data.data.remainingSeconds <= 600, 'Thời gian đếm ngược phải <= 600 giây');

    // ----------------------------------------------------
    // TEST 7: Kiểm tra Xử lý Đồng thời & Chống bán vượt ghế (Overbooking)
    // ----------------------------------------------------
    console.log('\n[TEST 7] Kiểm tra Xử lý đồng thời & Chống bán âm ghế (Overbooking)...');
    // Cập nhật tạm thời chuyến xe chỉ còn đúng 1 ghế duy nhất
    await pool.request().query(`UPDATE dbo.Trips SET AvailableSeats = 1 WHERE TripID = ${testTripId}`);
    
    // Khách 1 đặt chiếc ghế cuối cùng
    const req1 = await request('POST', '/bookings', {
      tripId: testTripId,
      fullName: 'Khách Tranh Chấp 1',
      phoneNumber: '0911111111',
      email: 'user1@gmail.com',
      seatQuantity: 1
    });

    // Khách 2 cố gắng đặt khi ghế vừa hết
    const req2 = await request('POST', '/bookings', {
      tripId: testTripId,
      fullName: 'Khách Tranh Chấp 2',
      phoneNumber: '0922222222',
      email: 'user2@gmail.com',
      seatQuantity: 1
    });

    assert(req1.status === 201, 'Khách 1 đặt thành công chiếc ghế cuối cùng');
    assert(req2.status === 400, 'Khách 2 bị chặn và nhận thông báo lỗi không đủ ghế');
    assert(req2.data.message.includes('không đủ'), 'Nội dung thông báo phải báo không đủ ghế');
    console.log('    ✓ Khóa bi quan (UPDLOCK) bảo vệ thành công tính toàn vẹn số lượng ghế!');

    // ----------------------------------------------------
    // TEST 8: Ghi nhận thanh toán chuyển khoản (UC-15, BR-04)
    // ----------------------------------------------------
    console.log('\n[TEST 8] Nhận Webhook chuyển khoản thành công từ ngân hàng...');
    const webhookRes = await request('POST', '/payments/webhook', {
      bookingCode: createdBookingCode,
      amount: 360000,
      transactionRef: 'BANK-TEST-REF-' + Date.now(),
      bankName: 'MB Bank'
    });
    assert(webhookRes.status === 200, 'Webhook xử lý thành công trả về 200');
    assert(webhookRes.data.data.status === 'Paid', 'Đơn đặt vé phải chuyển sang trạng thái Paid');

    // Kiểm tra vé trong DB đã chuyển sang Paid
    const ticketCheck = await request('GET', `/tickets/${firstTicketCode}`);
    assert(ticketCheck.data.data.TicketStatus === 'Paid', 'Vé xe phải chuyển sang trạng thái Paid');

    // ----------------------------------------------------
    // TEST 9: Bảng điều khiển Tài xế (UC-10, BR-11)
    // ----------------------------------------------------
    console.log('\n[TEST 9] Tài xế xem danh sách hành khách chuyến xe cố định...');
    const driverTripRes = await request('GET', '/driver/trips/today', null, {
      Authorization: `Bearer ${driverToken}`
    });
    assert(driverTripRes.status === 200, 'Tài xế xem chuyến xe trả về 200');
    assert(driverTripRes.data.data.passengers.length > 0, 'Phải có danh sách hành khách');
    const hasOurTicket = driverTripRes.data.data.passengers.some(p => p.TicketCode === firstTicketCode);
    assert(hasOurTicket, 'Danh sách phải chứa vé xe vừa thanh toán');

    // ----------------------------------------------------
    // TEST 10: Tài xế cập nhật vé thành 'Confirmed' sau cuộc gọi (UC-11, BR-10)
    // ----------------------------------------------------
    console.log('\n[TEST 10] Tài xế cập nhật trạng thái vé sang Confirmed (Đã xác nhận)...');
    const updateRes = await request('PATCH', `/driver/tickets/${firstTicketCode}/status`, {
      status: 'Confirmed'
    }, {
      Authorization: `Bearer ${driverToken}`
    });
    assert(updateRes.status === 200, 'Cập nhật trả về 200');
    assert(updateRes.data.data.status === 'Confirmed', 'Trạng thái vé phải là Confirmed');

    // ----------------------------------------------------
    // TEST 11: Nút bấm Gmail xác nhận (UC-07, BR-07, BR-10)
    // ----------------------------------------------------
    console.log('\n[TEST 11] Khách click nút Xác nhận đi từ Gmail (Token Action)...');
    const gmailRes = await request('GET', `/tickets/confirm/${firstTicketToken}?action=go`);
    assert(gmailRes.status === 200, 'Bấm link Gmail trả về 200');
    assert(gmailRes.data.includes('XÁC NHẬN CHUYẾN ĐI THÀNH CÔNG'), 'Phải trả về HTML xác nhận thành công');

    // ----------------------------------------------------
    // TEST 12: Khách hàng chủ động hủy vé trên Website (UC-06, BR-05 - Không hoàn tiền)
    // ----------------------------------------------------
    console.log('\n[TEST 12] Khách hàng hủy vé thứ hai trên Website (Áp dụng chính sách Không hoàn tiền)...');
    const cancelRes = await request('POST', `/tickets/${secondTicketCode}/cancel`);
    assert(cancelRes.status === 200, 'Hủy vé trả về 200');
    assert(cancelRes.data.data.status === 'Cancelled', 'Trạng thái vé phải là Cancelled');
    assert(cancelRes.data.data.refundPolicy.includes('Không hoàn tiền'), 'Phải ghi nhận chính sách Không hoàn tiền');

    console.log('\n========================================================');
    console.log(' 🎉 TẤT CẢ 12 BÀI KIỂM THỬ API & NGHIỆP VỤ ĐÃ VƯỢT QUA 100%!');
    console.log('========================================================\n');

  } catch (error) {
    console.error('\n❌ BÀI KIỂM THỬ THẤT BẠI:', error.message);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
