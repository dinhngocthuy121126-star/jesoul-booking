import React from 'react';

export default function Spinner({ size = 'md', text = 'Đang tải...', className = '' }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-3',
    lg: 'w-10 h-10 border-4'
  };

  return (
    <div className={`flex flex-col items-center justify-center py-6 text-slate-500 ${className}`}>
      <div
        className={`${sizeMap[size] || sizeMap.md} border-orange-500 border-t-transparent rounded-full animate-spin`}
      />
      {text && <p className="mt-3 text-xs font-semibold text-slate-600">{text}</p>}
    </div>
  );
}

