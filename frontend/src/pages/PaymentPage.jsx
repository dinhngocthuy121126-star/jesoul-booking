import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/common/Spinner';
import { useCountdown } from '../hooks/useCountdown';
import { Clock, Copy, Check, QrCode, AlertTriangle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export default function PaymentPage() {
  const { bookingCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  // Fetch or poll booking data
  const fetchBooking = async () => {
    try {
      const res = await api.get(`/bookings/${bookingCode}`);
      const data = res.data.data;
      setBooking(data);

      // If already paid, navigate to ticket detail
      if (data.Status === 'Paid') {
        const firstTicket = data.BookingCode ? `${data.BookingCode}-01` : null;
        if (firstTicket) {
          navigate(`/ticket/${firstTicket}`);
        }
      }
    } catch (err) {
      console.error('Lỗi tải hóa đơn đặt vé:', err);
      setError(err.response?.data?.message || 'Không tìm thấy thông tin đơn đặt vé.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();

    // Poll status every 3.5 seconds to detect webhook or payment completion
    const pollInterval = setInterval(() => {
      fetchBooking();
    }, 3500);

    return () => clearInterval(pollInterval);
  }, [bookingCode]);

  // Hook for 10-minute countdown
  const { formattedTime, isExpired, remainingSeconds } = useCountdown(
    booking?.holdExpiresAt || booking?.HoldExpiresAt || (booking?.remainingSeconds ? booking.remainingSeconds : 600)
  );

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Simulate payment webhook trigger (BR-04 simulation)
  const handleSimulatePayment = async () => {
    try {
      setSimulatingPayment(true);
      await api.post('/payments/webhook', {
        bookingCode,
        amount: booking.totalAmount || booking.TotalAmount,
        transactionRef: `DEMO-BANK-${Date.now()}`
      });

      // Refetch immediately
      await fetchBooking();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi mô phỏng thanh toán.');
    } finally {
      setSimulatingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 max-w-xl mx-auto shadow-xs border border-slate-200">
        <Spinner size="lg" text="Đang tải thông tin hóa đơn thanh toán..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
        <h3 className="font-bold text-slate-900 text-lg">Lỗi tải hóa đơn</h3>
        <p className="text-xs text-rose-700">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const isCancelledOrExpired = isExpired || booking?.Status === 'Cancelled';
  const totalAmount = Number(booking?.totalAmount || booking?.TotalAmount || 0);
  const bankDetails = booking?.bankDetails || {
    bankName: 'MB Bank',
    accountNo: '0987654321',
    accountName: 'CONG TY JESOUL BUS',
    amount: totalAmount,
    transferContent: bookingCode,
    qrCodeUrl: `https://api.vietqr.io/image/970422-0987654321-compact.jpg?amount=${totalAmount}&addInfo=${encodeURIComponent(bookingCode)}&accountName=CONG%20TY%20JESOUL%20BUS`
  };

  if (isCancelledOrExpired) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-rose-200 shadow-md text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
          <Clock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-rose-700">Hết thời gian giữ chỗ (Timeout)</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Đã quá thời hạn 10 phút thanh toán. Đơn đặt vé <strong>#{bookingCode}</strong> đã tự động bị hủy và các ghế đã được giải phóng lại vào hệ thống để nhường cho hành khách khác.
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          VỀ TRANG CHỦ ĐẶT LẠI
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 10-Minute Countdown Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 md:p-5 rounded-3xl shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-100 block">
              Thời gian tạm giữ chỗ còn lại (10 phút)
            </span>
            <p className="text-xs text-orange-50 mt-0.5">
              Vui lòng chuyển khoản trước khi đồng hồ đếm ngược về 00:00
            </p>
          </div>
        </div>

        <div className="bg-slate-950/40 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/20 text-center font-mono font-black text-2xl tracking-widest text-amber-300">
          ⏱ {formattedTime}
        </div>
      </div>

      {/* Main Payment Container */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs space-y-8">
        {/* Invoice Summary Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-3">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Hóa đơn đặt vé</span>
            <h2 className="text-2xl font-black text-slate-900 mt-0.5">
              Mã đơn: <span className="text-orange-600 font-mono">#{bookingCode}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hành khách: <strong>{booking.fullName || booking.FullName}</strong> • Số lượng: <strong>{booking.seatQuantity || booking.SeatQuantity} vé</strong>
            </p>
          </div>

          <div className="text-left sm:text-right bg-orange-50 border border-orange-100 px-5 py-3 rounded-2xl">
            <span className="text-[11px] font-semibold text-orange-700 block">Tổng tiền thanh toán</span>
            <span className="text-2xl font-black text-orange-600">
              {totalAmount.toLocaleString('vi-VN')} <span className="text-xs font-bold">VNĐ</span>
            </span>
          </div>
        </div>

        {/* Payment Grid: QR Code (Left) + Transfer Info (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* VietQR Code Card */}
          <div className="md:col-span-5 flex flex-col items-center text-center p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
              <QrCode className="w-4 h-4 text-orange-500" />
              <span>Quét mã VietQR (Tự động điền)</span>
            </div>

            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-[240px]">
              <img
                src={bankDetails.qrCodeUrl}
                alt="VietQR Chuyển khoản"
                className="w-full h-auto rounded-lg"
              />
            </div>

            <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
              Mở ứng dụng ngân hàng bất kỳ để quét mã QR. Số tiền và nội dung sẽ tự động được điền chính xác.
            </p>
          </div>

          {/* Bank Transfer Details with 1-click Copy */}
          <div className="md:col-span-7 space-y-3.5">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Thông tin tài khoản ngân hàng</span>
            </h3>

            {/* Bank Name */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ngân hàng</span>
                <span className="text-sm font-bold text-slate-800">{bankDetails.bankName} (Quân Đội)</span>
              </div>
            </div>

            {/* Account Number */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Số tài khoản</span>
                <span className="text-base font-black text-slate-900 font-mono tracking-wider">{bankDetails.accountNo}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(bankDetails.accountNo, 'accountNo')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-300 hover:border-orange-500 rounded-xl text-xs font-bold text-slate-700 hover:text-orange-600 transition shadow-xs"
              >
                {copiedField === 'accountNo' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* Account Holder */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Chủ tài khoản</span>
                <span className="text-sm font-bold text-slate-800">{bankDetails.accountName}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between p-3.5 bg-orange-50/60 rounded-2xl border border-orange-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-orange-600 block">Số tiền cần chuyển</span>
                <span className="text-base font-black text-orange-700">{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(String(totalAmount), 'amount')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-300 hover:border-orange-500 rounded-xl text-xs font-bold text-slate-700 hover:text-orange-600 transition shadow-xs"
              >
                {copiedField === 'amount' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* Transfer Content */}
            <div className="flex items-center justify-between p-3.5 bg-amber-50/70 rounded-2xl border border-amber-300">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Nội dung chuyển khoản (Bắt buộc ghi đúng)
                </span>
                <span className="text-base font-black text-slate-900 font-mono tracking-widest">{bookingCode}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(bookingCode, 'content')}
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-amber-400 hover:border-orange-500 rounded-xl text-xs font-bold text-amber-900 hover:text-orange-600 transition shadow-xs"
              >
                {copiedField === 'content' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Waiting status indicator */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="text-xs text-slate-600">
              <strong className="text-slate-800">Hệ thống đang tự động lắng nghe giao dịch chuyển khoản...</strong>
              <p className="text-[11px] text-slate-400">Trang sẽ tự động chuyển sang vé xe điện tử ngay khi ngân hàng xác nhận.</p>
            </div>
          </div>

          {/* Quick Simulation Button for Testing Demo */}
          <button
            type="button"
            disabled={simulatingPayment}
            onClick={handleSimulatePayment}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition flex-shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{simulatingPayment ? 'Đang xử lý...' : 'Mô phỏng Chuyển khoản thành công'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

