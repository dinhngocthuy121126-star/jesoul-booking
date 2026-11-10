import React from 'react';
import Modal from './Modal';
import { AlertTriangle, AlertCircle } from 'lucide-react';

export default function CancelTicketModal({ isOpen, onClose, onConfirm, ticketCode, loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          Xác nhận hủy vé xe {ticketCode ? `#${ticketCode}` : ''}
        </h3>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left my-4 text-rose-900">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="font-bold text-rose-700 block mb-1">
                LƯU Ý QUAN TRỌNG: CHÍNH SÁCH KHÔNG HOÀN TIỀN
              </strong>
              Theo quy định dịch vụ của JESOUL, vé sau khi đã thanh toán <strong>SẼ KHÔNG ĐƯỢC HOÀN TIỀN</strong> dưới bất kỳ hình thức nào. Khi bấm hủy, vé của bạn sẽ bị thu hồi và số ghế sẽ được nhường cho hành khách khác.
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-6">
          Bạn có chắc chắn muốn tiếp tục thực hiện hành động hủy chuyến này không?
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
          >
            Giữ lại vé
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition flex items-center justify-center"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Tôi hiểu & Đồng ý Hủy'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

