import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bus, Search, User, LogOut, Menu, X } from 'lucide-react';

export default function Header({ onOpenLogin }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const isInternal = user && (user.role === 'Driver' || user.role === 'Admin');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={isInternal ? "/driver" : "/"} className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-200 group-hover:scale-105 transition">
            J
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">JESOUL</span>
              <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full uppercase">
                Limousine
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium -mt-0.5">
              {isInternal ? 'Cổng điều hành nội bộ doanh nghiệp' : 'Đặt vé xe trực tuyến thông minh'}
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold">
          {isInternal ? (
            <Link
              to="/driver"
              className={`transition flex items-center space-x-1.5 ${isActive('/driver') ? 'text-orange-600' : 'text-slate-600 hover:text-orange-500'}`}
            >
              <Bus className="w-4 h-4" />
              <span>Bảng điều hành chuyến xe</span>
            </Link>
          ) : (
            <>
              <Link
                to="/"
                className={`transition flex items-center space-x-1.5 ${isActive('/') ? 'text-orange-600' : 'text-slate-600 hover:text-orange-500'
                  }`}
              >
                <span>Trang chủ</span>
              </Link>
              <Link
                to="/lookup"
                className={`transition flex items-center space-x-1.5 ${isActive('/lookup') ? 'text-orange-600' : 'text-slate-600 hover:text-orange-500'
                  }`}
              >
                <Search className="w-4 h-4" />
                <span>Tra cứu vé</span>
              </Link>
              <Link
                to="/driver"
                className={`transition flex items-center space-x-1.5 ${isActive('/driver') ? 'text-orange-600' : 'text-slate-600 hover:text-orange-500'
                  }`}
              >
                <Bus className="w-4 h-4" />
                <span>Giao diện Tài xế</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right side: User & Auth */}
        <div className="hidden md:flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 pl-3 pr-2 py-1.5 rounded-xl">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {user.fullName || user.role}
                </span>
                <span className="text-[10px] font-semibold text-orange-600 uppercase">
                  {user.role === 'Driver' ? 'Tài xế' : user.role === 'Admin' ? 'Chủ xe' : 'Khách hàng'}
                </span>
              </div>
              <button
                onClick={logout}
                title="Đăng xuất"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 hover:border-orange-500 hover:text-orange-600 px-4 py-2 rounded-xl transition shadow-xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center space-x-2">
          {user ? (
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
              {user.fullName || user.role}
            </span>
          ) : (
            <button
              onClick={onOpenLogin}
              className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg"
            >
              Đăng nhập
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2 text-sm font-semibold">
          {isInternal ? (
            <Link
              to="/driver"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-orange-600 font-bold"
            >
              Bảng điều hành chuyến xe
            </Link>
          ) : (
            <>
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-700 hover:text-orange-600"
              >
                Trang chủ
              </Link>
              <Link
                to="/lookup"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-700 hover:text-orange-600"
              >
                Tra cứu vé
              </Link>
              <Link
                to="/driver"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-700 hover:text-orange-600"
              >
                Giao diện Tài xế
              </Link>
            </>
          )}
          {user && (
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 text-rose-600 font-bold"
            >
              Đăng xuất
            </button>
          )}
        </div>
      )}
    </header>
  );
}
