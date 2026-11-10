import React from 'react';

const statusConfig = {
  Paid: {
    label: 'Đã thanh toán',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  Confirmed: {
    label: 'Đã xác nhận',
    className: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  NoReply: {
    label: 'Chưa phản hồi',
    className: 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse font-semibold'
  },
  Cancelled: {
    label: 'Đã hủy',
    className: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  Hold: {
    label: 'Đang giữ chỗ',
    className: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  Pending: {
    label: 'Chờ thanh toán',
    className: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  Scheduled: {
    label: 'Sẵn sàng khởi hành',
    className: 'bg-slate-100 text-slate-700 border-slate-200'
  }
};

export default function Badge({ status, customLabel, size = 'md' }) {
  const conf = statusConfig[status] || {
    label: customLabel || status || 'Không rõ',
    className: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${sizeClass} ${conf.className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {customLabel || conf.label}
    </span>
  );
}

