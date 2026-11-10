import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';
import Badge from '../components/common/Badge';
import { cleanText } from '../utils/textUtils';
import {
  Bus, Phone, Check, X, AlertTriangle, User, RefreshCw,
  MapPin, Clock, ShieldCheck, PhoneCall
} from 'lucide-react';

export default function DriverDashboardPage({ onOpenLogin }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const isDriver = user && (user.role === 'Driver' || user.role === 'Admin');

  const fetchDriverTrip = async (targetTripId = null) => {
    try {
      setLoading(true);
      setError('');
      const tid = targetTripId || searchParams.get('tripId');
      const url = tid ? `/driver/trips/today?tripId=${tid}` : '/driver/trips/today';
      const res = await api.get(url);
      setData(res.data.data);
    } catch (err) {
      console.error('Lỗi tải danh sách chuyến của tài xế:', err);
      setError(
        err.response?.data?.message || 'Không thể tải thông tin chuyến xe của tài xế. Vui lòng kiểm tra lại quyền truy cập.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDriver) {
      fetchDriverTrip();
    } else {
      setLoading(false);
    }
  }, [user, searchParams.get('tripId')]);

  // Tự động làm mới dữ liệu sau mỗi 10 giây để nhận khách đặt vé mới ngay lập tức
  useEffect(() => {
    if (!isDriver) return;
    const interval = setInterval(() => {
      const tid = searchParams.get('tripId');
      const url = tid ? `/driver/trips/today?tripId=${tid}` : '/driver/trips/today';
      api.get(url).then((res) => {
        if (res.data.data) setData(res.data.data);
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [isDriver, searchParams.get('tripId')]);

  const handleUpdateStatus = async (ticketCode, status, reason = null) => {
    const confirmText = status === 'Confirmed'
      ? `Xác nhận hành khách vé #${ticketCode} CÓ ĐI?`
      : `Xác nhận hành khách vé #${ticketCode} KHÔNG ĐI (HỦY VÉ & GIẢI PHÓNG GHẾ)?`;

    if (!window.confirm(confirmText)) return;

    try {
      setUpdatingTicket(ticketCode);
      const res = await api.patch(`/driver/tickets/${ticketCode}/status`, {
        status,
        reason: reason || (status === 'Cancelled' ? 'Tài xế xác nhận khách không đi / không liên lạc được' : undefined)
      });
      setSuccessMsg(res.data.message || `Đã cập nhật vé ${ticketCode} sang ${status}`);
      setTimeout(() => setSuccessMsg(''), 4000);
      await fetchDriverTrip(data?.trip?.TripID);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái.');
    } finally {
      setUpdatingTicket(null);
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
      month: '2-digit'
    });
  };

  // If user is not logged in as Driver
  if (!isDriver) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xs text-center space-y-5 my-12">
        <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center">
          <Bus className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Khu vực dành cho Tài xế</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Vui lòng đăng nhập với tài khoản Tài xế để quản lý danh sách hành khách chuyến xe cố định của bạn.
          </p>
          <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 text-left">
            <strong>Tài khoản Demo Tài xế:</strong>
            <div>SĐT: <code className="font-bold">0912345678</code> | Mật khẩu: <code className="font-bold">123456</code></div>
          </div>
        </div>
        <button
          onClick={onOpenLogin}
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-200 transition"
        >
          ĐĂNG NHẬP VAI TRÒ TÀI XẾ
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 max-w-xl mx-auto shadow-xs border border-slate-200">
        <Spinner size="lg" text="Đang tải danh sách hành khách chuyến xe hôm nay..." />
      </div>
    );
  }

  const trip = data?.trip;
  const tripsList = data?.tripsList || [];
  const passengers = data?.passengers || [];

  const noReplyPassengers = passengers.filter((p) => p.TicketStatus === 'NoReply');
  const otherPassengers = passengers.filter((p) => p.TicketStatus !== 'NoReply');
  const confirmedCount = passengers.filter((p) => p.TicketStatus === 'Confirmed').length;
  const cancelledCount = passengers.filter((p) => p.TicketStatus === 'Cancelled').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Driver Header Card (Mobile-first) */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-orange-500 text-white font-bold px-2.5 py-0.5 rounded-full uppercase">
                Giao diện Tài xế
              </span>
              <span className="text-xs text-slate-400">
                Mã xe: <strong className="text-white font-mono">{trip?.PlateNumber || '51B-123.45'}</strong>
              </span>
            </div>
            <h2 className="text-2xl font-black">
              Bác tài: {cleanText(user?.fullName || 'Trần Văn B')}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>{cleanText(trip?.Origin)} → {cleanText(trip?.Destination)}</span>
              <span>•</span>
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>Khởi hành: <strong>{formatTime(trip?.DepartureTime)}</strong></span>
            </div>
          </div>

          <button
            onClick={fetchDriverTrip}
            className="flex items-center space-x-1.5 self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới danh sách</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-center">
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Tổng hành khách</span>
            <span className="text-xl font-black text-white">{passengers.length}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-blue-400 uppercase font-bold block">Đã xác nhận</span>
            <span className="text-xl font-black text-blue-400">{confirmedCount}</span>
          </div>
          <div className="bg-amber-950/40 p-3 rounded-2xl border border-amber-800/60">
            <span className="text-[10px] text-amber-400 uppercase font-bold block">Cần gọi điện</span>
            <span className="text-xl font-black text-amber-400">{noReplyPassengers.length}</span>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
            <span className="text-[10px] text-rose-400 uppercase font-bold block">Đã hủy</span>
            <span className="text-xl font-black text-rose-400">{cancelledCount}</span>
          </div>
        </div>
      </div>

      {/* Trip Selector Toolbar */}
      {tripsList && tripsList.length > 0 && (
        <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  Chọn chuyến xe điều phối:
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {tripsList.length} chuyến khả dụng
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                Chuyển đổi giữa các chuyến xe để kiểm tra danh sách hành khách theo từng khung giờ
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <select
              value={trip?.TripID || ''}
              onChange={(e) => {
                const newTripId = e.target.value;
                setSearchParams({ tripId: newTripId });
                fetchDriverTrip(newTripId);
              }}
              className="w-full md:w-96 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition shadow-inner"
            >
              {tripsList.map((t) => (
                <option key={t.TripID} value={t.TripID}>
                  #{t.TripID} • {formatDate(t.DepartureTime)} lúc {formatTime(t.DepartureTime)}: {cleanText(t.Origin)} → {cleanText(t.Destination)} ({t.PassengerCount} khách)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Success banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SECTION 1: NO REPLY PASSENGERS (HIGHLIGHTED YELLOW) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-slate-900">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <h3 className="font-extrabold text-base">
            DANH SÁCH KHÁCH CHƯA PHẢN HỒI GMAIL ({noReplyPassengers.length})
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Hành khách chưa nhấn nút trong Gmail sau 10 phút. Bác tài vui lòng gọi điện thoại trực tiếp để chốt danh sách đón.
        </p>

        {noReplyPassengers.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-xs text-slate-500">
            ✓ Tuyệt vời! Hiện không có hành khách nào ở trạng thái "Chưa phản hồi".
          </div>
        ) : (
          <div className="space-y-4">
            {noReplyPassengers.map((p) => (
              <div
                key={p.TicketID || p.TicketCode}
                className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-5 md:p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-lg text-slate-900 font-mono">
                        #{p.TicketCode}
                      </span>
                      <Badge status="NoReply" />
                    </div>
                    <div className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span>{cleanText(p.PassengerName)}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-emerald-600 font-semibold font-mono">Đón khách</span>
                    </div>
                  </div>

                  <a
                    href={`tel:${p.PassengerPhone}`}
                    className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-blue-200 transition flex items-center justify-center space-x-2 flex-shrink-0"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>GỌI ĐIỆN: {p.PassengerPhone}</span>
                  </a>
                </div>

                <div className="pt-3 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-amber-900">
                    Cập nhật kết quả sau khi trao đổi với khách:
                  </span>

                  <div className="grid grid-cols-2 gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={updatingTicket === p.TicketCode}
                      onClick={() => handleUpdateStatus(p.TicketCode, 'Confirmed')}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>KHÁCH CÓ ĐI</span>
                    </button>

                    <button
                      type="button"
                      disabled={updatingTicket === p.TicketCode}
                      onClick={() => handleUpdateStatus(p.TicketCode, 'Cancelled')}
                      className="px-5 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
                    >
                      <X className="w-4 h-4" />
                      <span> KHÔNG ĐI / HỦY</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ALL OTHER PASSENGERS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
          <span>Danh sách toàn bộ hành khách ({otherPassengers.length})</span>
          <span className="text-xs font-normal text-slate-400">
            Chuyến {cleanText(trip?.Origin)} → {cleanText(trip?.Destination)}
          </span>
        </h3>

        {otherPassengers.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 italic">
            Chưa có hành khách nào khác trong chuyến này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="p-3">Mã vé</th>
                  <th className="p-3">Họ và tên</th>
                  <th className="p-3">Số điện thoại</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {otherPassengers.map((p) => (
                  <tr key={p.TicketID || p.TicketCode} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">#{p.TicketCode}</td>
                    <td className="p-3 text-slate-800 font-semibold">{cleanText(p.PassengerName)}</td>
                    <td className="p-3 font-mono text-slate-600">
                      <a href={`tel:${p.PassengerPhone}`} className="hover:text-blue-600 hover:underline">
                        {p.PassengerPhone}
                      </a>
                    </td>
                    <td className="p-3">
                      <Badge status={p.TicketStatus} size="sm" />
                    </td>
                    <td className="p-3 text-right space-x-1.5">
                      {p.TicketStatus !== 'Confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(p.TicketCode, 'Confirmed')}
                          disabled={updatingTicket === p.TicketCode}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 transition text-[11px]"
                        >
                          Xác nhận đi
                        </button>
                      )}
                      {p.TicketStatus !== 'Cancelled' && (
                        <button
                          onClick={() => handleUpdateStatus(p.TicketCode, 'Cancelled')}
                          disabled={updatingTicket === p.TicketCode}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition text-[11px]"
                        >
                          Hủy vé
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
