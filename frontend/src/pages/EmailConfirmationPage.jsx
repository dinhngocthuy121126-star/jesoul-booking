import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/common/Spinner';
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle } from 'lucide-react';

export default function EmailConfirmationPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const action = searchParams.get('action') || 'go'; // 'go' | 'cancel'

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'cancelled' | 'error'
  const [ticketCode, setTicketCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleConfirm = async () => {
      try {
        const res = await api.get(`/tickets/confirm/${token}?action=${action}`);
        // If API returns HTML, we handle it or parse result
        if (action === 'go') {
          setStatus('success');
          setMessage('Xác nhận chuyến đi thành công! Tài xế đã nhận được xác nhận từ bạn.');
        } else {
          setStatus('cancelled');
          setMessage('Đã ghi nhận yêu cầu không đi. Vé xe đã được hủy và hoàn trả ghế lại cho hệ thống.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Liên kết xác nhận không hợp lệ hoặc đã hết hạn.');
      }
    };

    if (token) {
      handleConfirm();
    }
  }, [token, action]);

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
        {status === 'loading' && (
          <Spinner size="lg" text="Đang xử lý phản hồi từ email của bạn..." />
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              Xác nhận chuyến đi thành công!
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {message} Chúc quý khách có một chuyến đi vui vẻ và an toàn cùng JESOUL Bus!
            </p>
            <div className="pt-4">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-rose-700">
              Đã ghi nhận hủy chuyến đi
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {message}
            </p>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
              * Lưu ý: Không áp dụng hoàn tiền theo quy định của nhà xe JESOUL.
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Không thể xử lý liên kết
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {message}
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

