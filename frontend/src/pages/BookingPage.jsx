import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Spinner from '../components/common/Spinner';
import { cleanText } from '../utils/textUtils';
import { Bus, MapPin, Calendar, Clock, AlertCircle, ShieldAlert, ArrowRight, User } from 'lucide-react';

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();

  const tripIdParam = searchParams.get('tripId');
  const initialSeats = parseInt(searchParams.get('seats') || '1', 10);

  const [trip, setTrip] = useState(null);
  const [loadingTrip, setLoadingTrip] = useState(true);

  // Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [seatQuantity, setSeatQuantity] = useState(initialSeats);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch trip details from backend
  useEffect(() => {
    if (!tripIdParam) {
      navigate('/search');
      return;
    }

    const loadTripDetails = async () => {
      try {
        setLoadingTrip(true);
        const res = await api.get('/trips/search');
        const matched = (res.data.data || []).find((t) => String(t.TripID) === String(tripIdParam));
        if (matched) {
          setTrip(matched);
        } else {
          setErrorMessage('Không tìm thấy thông tin chuyến xe hoặc chuyến xe đã hết hạn.');
        }
      } catch (err) {
        setErrorMessage('Không thể tải thông tin chuyến xe.');
      } finally {
        setLoadingTrip(false);
      }
    };

    loadTripDetails();
  }, [tripIdParam, navigate]);

  // Sync user info if user logs in later
  useEffect(() => {
    if (user && user.role === 'Customer') {
      if (!fullName) setFullName(user.fullName || '');
      if (!phoneNumber) setPhoneNumber(user.phoneNumber || '');
      if (!email) setEmail(user.email || '');
    }
  }, [user]);

  const handleBooking = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Form Validation
    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên hành khách.');
      return;
    }
    if (!/^0\d{9}$/.test(phoneNumber.trim())) {
      setErrorMessage('Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0.');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
      setErrorMessage('Vui lòng nhập địa chỉ Gmail hợp lệ để nhận vé và xác nhận.');
      return;
    }
    if (seatQuantity < 1) {
      setErrorMessage('Số lượng vé tối thiểu là 1.');
      return;
    }
    if (trip && seatQuantity > trip.AvailableSeats) {
      setErrorMessage(`Chuyến xe chỉ còn ${trip.AvailableSeats} ghế trống.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/bookings', {
        tripId: parseInt(tripIdParam, 10),
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim().toLowerCase(),
        seatQuantity
      });

      const bookingData = res.data.data;
      if (bookingData.token && bookingData.user) {
        login(bookingData.user, bookingData.token);
      }
      navigate(`/payment/${bookingData.bookingCode}`, {
        state: { booking: bookingData }
      });
    } catch (err) {
      console.error('Lỗi đặt vé:', err);
      setErrorMessage(
        err.response?.data?.message || 'Đặt vé không thành công. Vui lòng kiểm tra lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loadingTrip) {
    return (
      <div className="bg-white rounded-3xl p-12 max-w-xl mx-auto shadow-xs border border-slate-200">
        <Spinner size="lg" text="Đang tải thông tin chuyến xe..." />
      </div>
    );
  }

  // Chặn tài khoản nội bộ (Tài xế / Chủ xe) đặt vé khách hàng
  if (user && (user.role === 'Driver' || user.role === 'Admin')) {
    return (
      <div className="bg-white rounded-3xl p-8 max-w-xl mx-auto shadow-xs border border-amber-200 text-center space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Tài khoản nội bộ không thể đặt vé
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Bạn đang đăng nhập với vai trò <strong className="text-orange-600">{user.role === 'Admin' ? 'Chủ xe' : 'Tài xế'}</strong>.
          Tài khoản nội bộ doanh nghiệp không được phép tạo đơn đặt vé khách hàng trên hệ thống công cộng.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/driver')}
            className="w-full sm:w-auto px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition shadow-xs"
          >
            Đến bảng điều hành chuyến xe
          </button>
          <button
            onClick={logout}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  const unitPrice = Number(trip?.BasePrice) || 0;
  const totalAmount = unitPrice * seatQuantity;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header breadcrumb */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-xs font-bold text-orange-600 hover:underline mb-1 inline-block"
        >
          ← Quay lại danh sách chuyến xe
        </button>
        <h2 className="text-2xl font-bold text-slate-900">
          Đặt vé & Nhập thông tin hành khách
        </h2>
        <p className="text-xs text-slate-500">
          Vui lòng kiểm tra kỹ thông tin trước khi tạm giữ chỗ. Chỗ sẽ được giữ trong vòng 10 phút.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xs">
          <form onSubmit={handleBooking} className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center space-x-2">
                <User className="w-4 h-4 text-orange-500" />
                <span>Thông tin người đặt vé</span>
              </h3>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Họ và tên hành khách <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ví dụ: 0901234567"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tài xế sẽ liên hệ số này nếu chưa thấy phản hồi xác nhận trước 20 phút xuất bến.
              </span>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Gmail nhận vé & email xác nhận <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ví dụ: nguyenvana@gmail.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Hệ thống sẽ gửi email chứa 2 nút [Xác nhận đi] / [Không đi] trước xuất bến 30 phút.
              </span>
            </div>

            {/* Seat Quantity Stepper */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Số lượng ghế cần đặt (BR-02)
              </label>
              <div className="flex items-center space-x-4 bg-slate-50 border border-slate-200 p-3 rounded-2xl max-w-xs">
                <button
                  type="button"
                  onClick={() => setSeatQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 font-black text-slate-800 text-lg hover:bg-slate-100 transition shadow-xs flex items-center justify-center"
                >
                  -
                </button>
                <div className="flex-1 text-center font-extrabold text-base text-slate-900">
                  {seatQuantity} ghế
                </div>
                <button
                  type="button"
                  disabled={trip && seatQuantity >= trip.AvailableSeats}
                  onClick={() => setSeatQuantity((q) => Math.min(trip ? trip.AvailableSeats : 10, q + 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 font-black text-slate-800 text-lg hover:bg-slate-100 disabled:opacity-40 transition shadow-xs flex items-center justify-center"
                >
                  +
                </button>
              </div>

              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Lưu ý:</strong> Quý khách chỉ chọn số lượng ghế. Hệ thống sẽ tự động chỉ định các ghế liền kề nhau để tối ưu chỗ ngồi.
                </span>
              </div>
            </div>

            {/* Submit button on Mobile */}
            <div className="lg:hidden pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-300/50 transition"
              >
                {submitting ? 'ĐANG TẠM GIỮ CHỖ...' : 'XÁC NHẬN & TẠM GIỮ CHỖ'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Order Summary (Sticky) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs lg:sticky lg:top-24 space-y-5">
          <h3 className="font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
            Tóm tắt hành trình
          </h3>

          {trip && (
            <div className="space-y-4 text-xs">
              {/* Route */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                  <span>{cleanText(trip.Origin)}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span>{cleanText(trip.Destination)}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(trip.DepartureTime)}</span>
                  <span>•</span>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-700">
                    {formatTime(trip.DepartureTime)} - {formatTime(trip.ArrivalTime)}
                  </span>
                </div>
              </div>

              {/* Vehicle & Driver */}
              <div className="space-y-1.5 px-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Dòng xe:</span>
                  <strong className="text-slate-800">{trip.BusType}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Biển số xe:</span>
                  <strong className="text-slate-800">{trip.PlateNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tài xế phụ trách:</span>
                  <strong className="text-slate-800">{cleanText(trip.DriverName)}</strong>
                </div>
              </div>

              {/* Price Calculation */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Đơn giá vé:</span>
                  <span>{unitPrice.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Số lượng vé:</span>
                  <span>x {seatQuantity}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-200">
                  <span className="font-bold text-slate-900 text-sm">Tổng thanh toán:</span>
                  <span className="text-2xl font-black text-orange-600">
                    {totalAmount.toLocaleString('vi-VN')} <span className="text-xs font-semibold">đ</span>
                  </span>
                </div>
              </div>

              {/* Policy Alert */}
              <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-500 leading-relaxed border border-slate-200">
                * Sau khi bấm nút xác nhận, hệ thống sẽ tạm giữ {seatQuantity} ghế trong <strong>10 phút</strong> để bạn thực hiện chuyển khoản ngân hàng.
              </div>

              {/* Primary CTA button on Desktop */}
              <div className="hidden lg:block pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleBooking}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-300/40 hover:shadow-orange-400/50 transition flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>XÁC NHẬN & TẠM GIỮ CHỖ</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
