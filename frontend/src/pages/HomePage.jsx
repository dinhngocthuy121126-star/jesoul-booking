import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Search, ShieldCheck, MailCheck, QrCode, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { cleanText } from '../utils/textUtils';

const DEFAULT_CITIES = ['Bình Định', 'Quy Nhơn'];

export default function HomePage() {
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const [originOptions, setOriginOptions] = useState(DEFAULT_CITIES);
  const [destOptions, setDestOptions] = useState(['Quy Nhơn', 'Bình Định']);

  const [origin, setOrigin] = useState('Bình Định');
  const [destination, setDestination] = useState('Quy Nhơn');
  const [departureDate, setDepartureDate] = useState(today);
  const [seatQuantity, setSeatQuantity] = useState(1);
  const [validationError, setValidationError] = useState('');

  // Automatically fetch active routes from real backend API
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await api.get('/trips/search');
        const trips = res.data.data || [];
        if (trips.length > 0) {
          const origins = Array.from(new Set(trips.map((t) => t.Origin)));
          const destinations = Array.from(new Set(trips.map((t) => t.Destination)));
          setOriginOptions(origins);
          setDestOptions(destinations);
          setOrigin(origins[0]);
          setDestination(destinations.find(d => d !== origins[0]) || destinations[0]);
        }
      } catch (err) {
        // Fallback to default enterprise routes
        setOriginOptions(['Bình Định', 'Quy Nhơn']);
        setDestOptions(['Quy Nhơn', 'Bình Định']);
        setOrigin('Bình Định');
        setDestination('Quy Nhơn');
      }
    };

    fetchRoutes();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setValidationError('');

    if (origin && destination && origin === destination) {
      setValidationError('Điểm đón và Điểm đến không được trùng nhau.');
      return;
    }

    if (seatQuantity < 1 || seatQuantity > 10) {
      setValidationError('Số lượng ghế phải từ 1 đến 10.');
      return;
    }

    navigate(
      `/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
        destination
      )}&seats=${seatQuantity}&departureDate=${departureDate}`
    );
  };

  return (
    <div className="space-y-12">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-8 md:p-14 text-white shadow-xl shadow-orange-500/10">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-bold tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Tuyến xe liên tỉnh Bình Định - Quy Nhơn</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Đặt vé dễ dàng – <br />
            Đồng hành an toàn cùng JESOUL
          </h1>

          <p className="text-orange-100 text-sm md:text-base leading-relaxed max-w-xl">
            Trải nghiệm dịch vụ xe Limousine hiện đại tuyến Bình Định ⇄ Quy Nhơn. Tạm giữ chỗ an toàn trong 10 phút, thanh toán VietQR tiện lợi và xác nhận chuyến 1 chạm qua Gmail trước giờ khởi hành.
          </p>
        </div>

        <div className="absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </section>

      {/* Search Card */}
      <div className="relative z-20 -mt-16 md:-mt-20 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 md:p-8">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>
              <span>Tìm chuyến xe Bình Định ⇄ Quy Nhơn</span>
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              Chỉ chọn số lượng ghế (BR-02)
            </span>
          </div>

          {validationError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Origin */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  <span>Điểm đón</span>
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                >
                  {originOptions.map((orig) => (
                    <option key={`orig-${orig}`} value={orig}>
                      {cleanText(orig)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" />
                  <span>Điểm đến</span>
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                >
                  {destOptions.map((dest) => (
                    <option key={`dest-${dest}`} value={dest}>
                      {cleanText(dest)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" />
                  <span>Ngày đi</span>
                </label>
                <input
                  type="date"
                  value={departureDate}
                  min={today}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                />
              </div>

              {/* Seat Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-orange-500" />
                  <span>Số lượng ghế</span>
                </label>
                <div className="flex items-center justify-between border border-slate-200 rounded-xl bg-slate-50 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setSeatQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition flex items-center justify-center shadow-xs"
                  >
                    -
                  </button>
                  <span className="font-bold text-sm text-slate-800 px-3">
                    {seatQuantity} ghế
                  </span>
                  <button
                    type="button"
                    onClick={() => setSeatQuantity((q) => Math.min(10, q + 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition flex items-center justify-center shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 gap-4">
              <div className="text-xs text-slate-500 flex items-center space-x-1.5">
                <span className="text-orange-500 font-bold">*</span>
                <span>
                  <strong>Quy định nghiệp vụ (BR-01):</strong> Đóng cổng đặt vé trước giờ khởi hành 30 phút.
                </span>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-300/40 hover:shadow-orange-400/50 transition flex items-center justify-center space-x-2"
              >
                <Search className="w-4 h-4" />
                <span>TÌM CHUYẾN XE</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Service Commitments */}
      <section className="pt-4">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h3 className="text-xl font-bold text-slate-900">Cam kết dịch vụ từ JESOUL</h3>
          <p className="text-xs text-slate-500 mt-1">
            Quy trình khép kín đảm bảo trải nghiệm đặt vé nhanh gọn, minh bạch và chính xác.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-orange-200 transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Thanh toán VietQR tiện lợi</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mã QR tự động sinh với đúng số tiền và cú pháp. Tạm giữ chỗ an toàn trong 10 phút để bạn an tâm chuyển khoản.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-orange-200 transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MailCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Xác nhận 1 chạm qua Gmail</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Trước giờ xe xuất bến 30 phút, hệ thống gửi email xác nhận với 2 nút bấm [Xác nhận đi] và [Không đi] tiện lợi.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-orange-200 transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Chính sách rõ ràng, minh bạch</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tài xế quản lý danh sách hành khách cố định trên web. Áp dụng quy định không hoàn tiền khi hủy vé nhằm bảo đảm lịch trình.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
