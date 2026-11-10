import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Spinner from '../components/common/Spinner';
import Badge from '../components/common/Badge';
import CancelTicketModal from '../components/common/CancelTicketModal';
import { cleanText } from '../utils/textUtils';
import { 
  Bus, MapPin, Calendar, Clock, User, Phone, Mail, 
  Printer, AlertTriangle, ArrowRight, ShieldCheck, CheckCircle2, Ticket 
} from 'lucide-react';

export default function TicketDetailPage({ onOpenLogin }) {
  const { ticketCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInternal = user && (user.role === 'Driver' || user.role === 'Admin');

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/tickets/${ticketCode}`);
      setTicket(res.data.data);
    } catch (err) {
      console.error('Lỗi lấy thông tin vé:', err);
      setError(err.response?.data?.message || 'Không tìm thấy thông tin vé xe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketCode]);

  const handleConfirmCancel = async () => {
    try {
      setCancelling(true);
      const res = await api.post(`/tickets/${ticketCode}/cancel`);
      setShowCancelModal(false);
      setCancelSuccessMsg(
        'Vé đã được hủy thành công. Chỗ trống đã được thu hồi và hoàn trả lại hệ thống. Áp dụng chính sách không hoàn tiền.'
      );
      fetchTicket();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể hủy vé. Vui lòng thử lại.');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-8 max-w-xl mx-auto shadow-xs border border-slate-200 text-center space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
          <Ticket className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Yêu cầu đăng nhập để xem vé
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Để bảo vệ dữ liệu cá nhân của hành khách và ngăn chặn việc can thiệp trái phép, bạn vui lòng đăng nhập tài khoản Khách hàng để xem chi tiết vé xe #{ticketCode}.
        </p>
        <button
          onClick={onOpenLogin}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          ĐĂNG NHẬP KHÁCH HÀNG
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 max-w-xl mx-auto shadow-xs border border-slate-200">
        <Spinner size="lg" text="Đang tải thông tin vé xe điện tử..." />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-white rounded-3xl p-8 max-w-md mx-auto border border-rose-200 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Không tìm thấy vé xe</h3>
        <p className="text-xs text-slate-500">{error || 'Mã vé không tồn tại trong hệ thống.'}</p>
        <button
          onClick={() => navigate('/lookup')}
          className="px-6 py-2.5 bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md"
        >
          Tra cứu mã vé khác
        </button>
      </div>
    );
  }

  const isCancelled = ticket.TicketStatus === 'Cancelled';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner Actions */}
      <div className="flex items-center justify-between no-print">
        <button
          onClick={() => navigate('/')}
          className="text-xs font-bold text-orange-600 hover:underline"
        >
          ← Về trang chủ
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/lookup')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Tra cứu vé khác
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-4 py-2 bg-white border border-slate-300 hover:border-orange-500 text-slate-800 font-bold text-xs rounded-xl transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>In / Tải vé</span>
          </button>
        </div>
      </div>

      {/* Cancel success message */}
      {cancelSuccessMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{cancelSuccessMsg}</span>
        </div>
      )}

      {/* Modern E-Ticket Boarding Pass Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-slate-400">
        {/* Ticket Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center font-black text-2xl text-white shadow-md shadow-orange-500/30">
              J
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400 block">
                Vé Xe Điện Tử JESOUL
              </span>
              <h2 className="text-xl md:text-2xl font-black font-mono tracking-wider">
                #{ticket.TicketCode}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Badge status={ticket.TicketStatus} size="lg" />
          </div>
        </div>

        {/* Ticket Main Details */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Route Section */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Origin */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold text-slate-400">Điểm đón khách</span>
              <h4 className="text-lg font-black text-slate-900">{cleanText(ticket.Origin)}</h4>
              <div className="flex items-center space-x-1.5 text-xs text-orange-600 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(ticket.DepartureTime)}</span>
                <span className="text-slate-400">•</span>
                <span>{formatDate(ticket.DepartureTime)}</span>
              </div>
            </div>

            {/* Travel Arrow */}
            <div className="hidden md:flex flex-col items-center px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Limousine VIP
              </span>
              <div className="flex items-center space-x-2 text-slate-300">
                <div className="w-12 border-t-2 border-dashed border-slate-300"></div>
                <Bus className="w-5 h-5 text-orange-500" />
                <div className="w-12 border-t-2 border-dashed border-slate-300"></div>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-1 md:text-right">
              <span className="text-[11px] uppercase font-bold text-slate-400">Điểm đến</span>
              <h4 className="text-lg font-black text-slate-900">{cleanText(ticket.Destination)}</h4>
              <div className="flex items-center md:justify-end space-x-1.5 text-xs text-slate-600 font-bold">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatTime(ticket.ArrivalTime)}</span>
                <span className="text-slate-400">•</span>
                <span>{formatDate(ticket.ArrivalTime)}</span>
              </div>
            </div>
          </div>

          {/* Passenger & Vehicle Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Passenger Info */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2.5">
              <h5 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200/60 flex items-center space-x-1.5">
                <User className="w-4 h-4 text-orange-500" />
                <span>Thông tin hành khách</span>
              </h5>

              <div className="flex justify-between">
                <span className="text-slate-500">Họ tên:</span>
                <strong className="text-slate-800">{cleanText(ticket.FullName)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <strong className="text-slate-800 font-mono">{ticket.PhoneNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gmail:</span>
                <strong className="text-slate-800">{ticket.Email}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số lượng ghế:</span>
                <strong className="text-orange-600 font-bold">{ticket.SeatQuantity} vé</strong>
              </div>
            </div>

            {/* Bus & Driver Info */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2.5">
              <h5 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200/60 flex items-center space-x-1.5">
                <Bus className="w-4 h-4 text-orange-500" />
                <span>Phương tiện & Tài xế</span>
              </h5>

              <div className="flex justify-between">
                <span className="text-slate-500">Dòng xe:</span>
                <strong className="text-slate-800">{ticket.BusType}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Biển số xe:</span>
                <strong className="text-slate-800 font-mono">{ticket.PlateNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tài xế đón:</span>
                <strong className="text-slate-800">{cleanText(ticket.DriverName)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn gốc:</span>
                <strong className="text-slate-600 font-mono">#{ticket.BookingCode}</strong>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-3">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold text-blue-800 block mb-0.5">Xác nhận chuyến đi 30 phút trước xuất bến:</strong>
              Hệ thống sẽ tự động gửi email thông báo kèm 2 nút bấm <strong>[Xác nhận đi]</strong> và <strong>[Không đi]</strong> tới hòm thư <u>{ticket.Email}</u>. Quý khách vui lòng kiểm tra và phản hồi trong vòng 10 phút để tài xế sắp xếp đón chu đáo.
            </div>
          </div>

          {/* Cancel Button Area (Hidden for internal Driver/Admin roles) */}
          {!isCancelled && !isInternal && (
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
              <div className="text-[11px] text-slate-400">
                Lưu ý: Hủy vé sẽ không được hoàn tiền theo quy định của nhà xe.
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 font-bold text-xs transition flex items-center justify-center space-x-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>HỦY VÉ XE NÀY</span>
              </button>
            </div>
          )}

          {isCancelled && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center text-xs text-rose-700 font-semibold">
              Vé xe này đã bị hủy. Ghế đã được hoàn trả lại cho hệ thống.
            </div>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <CancelTicketModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        ticketCode={ticket.TicketCode}
        loading={cancelling}
      />
    </div>
  );
}
