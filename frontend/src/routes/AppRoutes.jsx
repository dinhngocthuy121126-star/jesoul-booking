import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import SearchResultsPage from '../pages/SearchResultsPage';
import BookingPage from '../pages/BookingPage';
import PaymentPage from '../pages/PaymentPage';
import TicketDetailPage from '../pages/TicketDetailPage';
import LookupTicketPage from '../pages/LookupTicketPage';
import DriverDashboardPage from '../pages/DriverDashboardPage';
import EmailConfirmationPage from '../pages/EmailConfirmationPage';

function NotFoundPage() {
  return (
    <div className="text-center py-20 space-y-4">
      <h1 className="text-6xl font-black text-slate-300">404</h1>
      <h2 className="text-xl font-bold text-slate-800">Không tìm thấy trang yêu cầu</h2>
      <p className="text-xs text-slate-500">Đường dẫn bạn truy cập không tồn tại hoặc đã thay đổi.</p>
      <Link
        to="/"
        className="inline-block px-6 py-2.5 bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md hover:bg-orange-600 transition"
      >
        Về trang chủ
      </Link>
    </div>
  );
}

export default function AppRoutes({ onOpenLogin }) {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchResultsPage />} />
      <Route path="/booking" element={<BookingPage />} />
      <Route path="/payment/:bookingCode" element={<PaymentPage />} />
      <Route path="/ticket/:ticketCode" element={<TicketDetailPage onOpenLogin={onOpenLogin} />} />
      <Route path="/lookup" element={<LookupTicketPage onOpenLogin={onOpenLogin} />} />
      <Route path="/driver" element={<DriverDashboardPage onOpenLogin={onOpenLogin} />} />
      <Route path="/tickets/confirm/:token" element={<EmailConfirmationPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
