import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Spinner from '../components/common/Spinner';
import Badge from '../components/common/Badge';
import { cleanText } from '../utils/textUtils';
import { Search, Ticket, ArrowRight, AlertCircle, Calendar, MapPin, Bus, ShieldAlert, LogIn, RefreshCw } from 'lucide-react';

export default function LookupTicketPage({ onOpenLogin }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [myTickets, setMyTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const isCustomer = user && user.role === 'Customer';
  const isInternal = user && (user.role === 'Driver' || user.role === 'Admin');

  useEffect(() => {
    if (isCustomer) {
      fetchMyTickets();
    }
  }, [user]);

  const fetchMyTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/tickets/my/list');
      setMyTickets(res.data.data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách vé:', err);
      setError(err.response?.data?.message || 'Không thể tải danh sách vé. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 1. Trường hợp là Khách vãng lai (Chưa đăng nhập) -> Chặn tính năng và yêu cầu đăng nhập
  if (!user) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pt-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
            <Ticket className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Tra cứu & Quản lý vé xe</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hệ thống bảo vệ quyền riêng tư hành khách. Khách vãng lai cần đăng nhập tài khoản Khách hàng để tra cứu thông tin vé.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-5">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs text-left leading-relaxed">
            <strong className="block font-bold text-amber-800 mb-1">
              🔒 TẠI SAO PHẢI ĐĂNG NHẬP ĐỂ TRA CỨU VÉ?
            </strong>
            Để bảo mật thông tin hành trình và ngăn chặn việc người khác biết mã vé tự ý tra cứu hoặc hủy vé của bạn, JESOUL yêu cầu hành khách đăng nhập bằng số điện thoại đã đặt vé.
          </div>

          <button
            onClick={onOpenLogin}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-orange-200 transition flex items-center justify-center space-x-2"
          >
            <LogIn className="w-4 h-4" />
            <span>ĐĂNG NHẬP KHÁCH HÀNG ĐỂ XEM VÉ CỦA BẠN</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Trường hợp là Tài khoản nội bộ (Tài xế / Chủ xe)
  if (isInternal) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pt-6">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Khu vực dành cho Khách hàng
          </h2>
          <p className="text-xs text-slate-600">
            Bạn đang đăng nhập với vai trò <strong className="text-orange-600">{user.role === 'Admin' ? 'Chủ xe' : 'Tài xế'}</strong>. Vui lòng chuyển sang bảng điều hành để quản lý chuyến xe.
          </p>
          <button
            onClick={() => navigate('/driver')}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Đến bảng điều hành chuyến xe
          </button>
        </div>
      </div>
    );
  }

  // 3. Trường hợp là Khách hàng đã đăng nhập -> Hiển thị "Vé xe của tôi"
  const filteredTickets = myTickets.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.TicketCode.toLowerCase().includes(term) ||
      t.Origin.toLowerCase().includes(term) ||
      t.Destination.toLowerCase().includes(term) ||
      t.BookingCode.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
            <span>Vé xe của tôi</span>
            <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2.5 py-0.5 rounded-full">
              {myTickets.length} vé
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách tất cả các vé xe bạn đã đặt trên hệ thống JESOUL (Khách hàng: <strong>{user.fullName}</strong> - {user.phoneNumber})
          </p>
        </div>

        <button
          onClick={fetchMyTickets}
          disabled={loading}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Search Input for fast filtering */}
      {myTickets.length > 0 && (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Lọc theo mã vé (JS-XXXXX-01), điểm đón, điểm đến..."
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 pl-11 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <Spinner size="md" text="Đang tải danh sách vé xe của bạn..." />
        </div>
      )}

      {!loading && myTickets.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Bạn chưa có đơn đặt vé nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy tìm kiếm chuyến xe phù hợp và tiến hành đặt vé trực tuyến ngay hôm nay!
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-200 transition inline-block"
          >
            Tìm chuyến xe ngay
          </button>
        </div>
      )}

      {!loading && filteredTickets.length > 0 && (
        <div className="space-y-4">
          {filteredTickets.map((t) => (
            <div
              key={t.TicketID || t.TicketCode}
              className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-xs hover:border-orange-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="font-black text-lg text-slate-900 font-mono tracking-tight">
                    #{t.TicketCode}
                  </span>
                  <Badge status={t.TicketStatus} />
                </div>

                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                  <span>{cleanText(t.Origin)}</span>
                  <span className="text-slate-400">→</span>
                  <span>{cleanText(t.Destination)}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 font-medium">{formatDate(t.DepartureTime)} lúc {formatTime(t.DepartureTime)}</span>
                </div>

                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <span>Xe: <strong className="text-slate-700">{t.BusType} ({t.PlateNumber})</strong></span>
                  <span>•</span>
                  <span>Tài xế: <strong className="text-slate-700">{cleanText(t.DriverName)}</strong></span>
                </div>
              </div>

              <div className="flex items-center justify-between md:flex-col md:items-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-left md:text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Đơn giá</span>
                  <span className="text-base font-black text-orange-600">
                    {Number(t.TotalAmount || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <button
                  onClick={() => navigate(`/ticket/${t.TicketCode}`)}
                  className="mt-2 px-5 py-2.5 bg-slate-900 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                >
                  <span>Xem chi tiết vé</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
