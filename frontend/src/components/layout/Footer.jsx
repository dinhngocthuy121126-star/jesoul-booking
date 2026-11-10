import React from 'react';
import { ShieldCheck, PhoneCall, Clock, AlertTriangle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 mt-20 border-t border-slate-800 text-xs">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white font-black flex items-center justify-center text-base">
                J
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">JESOUL BUS LINES</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Hệ thống đặt vé xe trực tuyến hiện đại theo quy trình BPMN To-Be chuẩn hóa. Tự động giữ chỗ trong 10 phút, xác nhận 1 chạm qua Gmail 30 phút trước xuất bến và quản lý trực tiếp qua web tài xế.
            </p>
            <div className="flex items-center space-x-2 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/50 p-2.5 rounded-xl">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Chính sách minh bạch: Vé sau khi đã thanh toán không áp dụng hoàn tiền khi hủy.</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Hỗ trợ khách hàng</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li className="flex items-center space-x-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-orange-400" />
                <span>Hotline: <strong className="text-white">1900 6868</strong> (24/7)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>Thời gian hỗ trợ: 24/7</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Thanh toán VietQR an toàn</span>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Tuyến đường trọng điểm</h4>
            <ul className="space-y-1 text-slate-400 text-xs">
              <li>Bình Định ⇄ Quy Nhơn</li>
              <li>Xe Limousine cao cấp 16 chỗ</li>
              <li>Tài xế chuyên nghiệp, đúng giờ</li>
              <li>Cam kết chất lượng dịch vụ</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <p>© 2026 JESOUL Bus Lines. Bảo lưu mọi quyền.</p>
          <p>Tuân thủ chuẩn quy trình BPMN To-Be & Kiến trúc 3 tầng (ReactJS + Node.js + SQL Server).</p>
        </div>
      </div>
    </footer>
  );
}
