import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Spinner from '../components/common/Spinner';
import { cleanText } from '../utils/textUtils';
import { ArrowRight, Clock, Bus, User, MapPin, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInternal = user && (user.role === 'Driver' || user.role === 'Admin');

  const origin = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';
  const seats = parseInt(searchParams.get('seats') || '1', 10);
  const departureDate = searchParams.get('departureDate') || '';

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTrips();
  }, [origin, destination, seats, departureDate]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/trips/search', {
        params: {
          origin: origin || undefined,
          destination: destination || undefined,
          seatQuantity: seats,
          departureDate: departureDate || undefined
        }
      });
      setTrips(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tìm kiếm chuyến xe:', err);
      setError(err.response?.data?.message || 'Không thể tải danh sách chuyến xe. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Criteria Bar */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
          <div className="flex items-center space-x-1.5 font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl">
            <MapPin className="w-3.5 h-3.5 text-orange-600" />
            <span>{cleanText(origin) || 'Tất cả điểm đón'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span>{cleanText(destination) || 'Tất cả điểm đến'}</span>
          </div>

          {departureDate && (
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{departureDate}</span>
            </div>
          )}

          <div className="bg-orange-50 text-orange-700 font-bold px-3 py-1.5 rounded-xl border border-orange-200">
            {seats} ghế
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center space-x-1"
        >
          <span>Đổi tìm kiếm</span>
        </button>
      </div>

      {/* Main Heading */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">
          Kết quả tìm chuyến xe
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Danh sách chuyến xe khả dụng (xuất phát sau thời điểm hiện tại tối thiểu 30 phút).
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-xs">
          <Spinner size="lg" text="Đang tìm kiếm chuyến xe phù hợp..." />
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">{error}</h3>
          <button
            onClick={fetchTrips}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && trips.length === 0 && (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-orange-50 text-orange-500 mx-auto flex items-center justify-center">
            <Bus className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Không tìm thấy chuyến xe phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              Không có chuyến xe nào thỏa mãn lộ trình hoặc các chuyến xe đã đủ khách hoặc cách giờ xuất phát dưới 30 phút (theo quy định nghiệp vụ BR-01).
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Chọn ngày hoặc tuyến khác
          </button>
        </div>
      )}

      {/* Success State: Trips List */}
      {!loading && !error && trips.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500">
            Tìm thấy <strong className="text-slate-800">{trips.length}</strong> chuyến xe phù hợp
          </div>

          {trips.map((trip) => {
            const unitPrice = Number(trip.BasePrice) || 0;
            const totalPrice = unitPrice * seats;

            return (
              <div
                key={trip.TripID}
                className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-orange-400 hover:shadow-lg transition flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Left: Schedule & Route */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-black text-slate-900">
                        {formatTime(trip.DepartureTime)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <span className="text-lg font-bold text-slate-600">
                        {formatTime(trip.ArrivalTime)}
                      </span>
                    </div>

                    <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg">
                      {trip.BusType || 'Limousine'}
                    </span>

                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Còn {trip.AvailableSeats} ghế trống
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    <span>{cleanText(trip.Origin)}</span>
                    <span className="text-slate-400">→</span>
                    <span>{cleanText(trip.Destination)}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{formatDate(trip.DepartureTime)}</span>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                    <div className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tài xế: <strong className="text-slate-700">{cleanText(trip.DriverName)}</strong></span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <Bus className="w-3.5 h-3.5 text-slate-400" />
                      <span>Biển số: <strong className="text-slate-700">{trip.PlateNumber}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Right: Pricing & CTA */}
                <div className="flex items-center justify-between md:flex-col md:items-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Đơn giá: {unitPrice.toLocaleString('vi-VN')} đ / vé
                    </span>
                    <span className="text-xl md:text-2xl font-black text-orange-600">
                      {totalPrice.toLocaleString('vi-VN')} <span className="text-sm font-semibold">đ</span>
                    </span>
                    {seats > 1 && (
                      <span className="text-[10px] text-slate-400 block">
                        (Tổng cộng cho {seats} vé)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (isInternal) {
                        navigate(`/driver?tripId=${trip.TripID}`);
                      } else {
                        navigate(`/booking?tripId=${trip.TripID}&seats=${seats}`);
                      }
                    }}
                    className={`mt-3 px-6 py-3 font-bold text-xs rounded-xl shadow-md transition ${
                      isInternal
                        ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200'
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200'
                    }`}
                  >
                    {isInternal ? 'XEM ĐIỀU HÀNH CHUYẾN' : 'CHỌN CHUYẾN NÀY'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
