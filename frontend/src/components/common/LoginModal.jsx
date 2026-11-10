import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User, Bus, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState('Customer'); // 'Customer' | 'Driver' | 'Admin'

  // Form fields
  const [fullName, setFullName] = useState('Nguyễn Văn A');
  const [phoneNumber, setPhoneNumber] = useState('0901234567');
  const [email, setEmail] = useState('nguyenvana@gmail.com');
  const [password, setPassword] = useState('123456');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrorMessage('');
    setSuccessMessage('');

    if (newRole === 'Customer') {
      setFullName('Nguyễn Văn A');
      setPhoneNumber('0901234567');
      setEmail('nguyenvana@gmail.com');
    } else if (newRole === 'Driver') {
      setPhoneNumber('0912345678');
      setPassword('123456');
    } else if (newRole === 'Admin') {
      setPhoneNumber('0988888888');
      setPassword('123456');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validation
    if (role === 'Customer') {
      if (!fullName.trim()) {
        setErrorMessage('Vui lòng nhập họ và tên.');
        return;
      }
      if (!/^0\d{9}$/.test(phoneNumber.trim())) {
        setErrorMessage('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0.');
        return;
      }
      if (!email.trim() || !/\S+@\S+\.\S+/.test(email.trim())) {
        setErrorMessage('Vui lòng nhập địa chỉ Gmail hợp lệ để nhận vé.');
        return;
      }
    } else {
      if (!phoneNumber.trim()) {
        setErrorMessage('Vui lòng nhập số điện thoại hoặc mã tài khoản.');
        return;
      }
      if (!password) {
        setErrorMessage('Vui lòng nhập mật khẩu.');
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        role,
        fullName: role === 'Customer' ? fullName.trim() : undefined,
        phoneNumber: phoneNumber.trim(),
        email: role === 'Customer' ? email.trim() : undefined,
        password: role !== 'Customer' ? password : undefined
      };

      const res = await api.post('/auth/login', payload);
      const { user, token } = res.data.data;
      login(user, token);
      setSuccessMessage(`Đăng nhập thành công với vai trò ${role === 'Customer' ? 'Khách hàng' : role === 'Driver' ? 'Tài xế' : 'Chủ xe'}!`);
      
      setTimeout(() => {
        onClose();
        if (role === 'Driver' || role === 'Admin') {
          navigate('/driver');
        }
      }, 700);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đăng nhập hệ thống JESOUL" maxWidth="max-w-md">
      <div>
        {/* Role Selector Tabs */}
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Chọn vai trò của bạn
        </p>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => handleRoleChange('Customer')}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition ${
              role === 'Customer'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Khách hàng</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('Driver')}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition ${
              role === 'Driver'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Tài xế</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('Admin')}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition ${
              role === 'Admin'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Chủ xe</span>
          </button>
        </div>

        {/* Error / Success alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            ✓ {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'Customer' ? (
            <>
              <p className="text-xs text-slate-500 italic mb-2">
                * Vui lòng nhập thông tin liên hệ chính xác để nhận vé điện tử và email xác nhận trước giờ khởi hành.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên hành khách <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại liên hệ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ví dụ: 0901234567"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gmail nhận vé & xác nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ví dụ: nguyenvana@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                />
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <strong>Gợi ý tài khoản demo:</strong>
                {role === 'Driver' ? (
                  <div>SĐT: <code className="font-bold">0912345678</code> | Mật khẩu: <code className="font-bold">123456</code></div>
                ) : (
                  <div>SĐT: <code className="font-bold">0988888888</code> | Mật khẩu: <code className="font-bold">123456</code></div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Nhập số điện thoại đã đăng ký"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                />
              </div>
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-200 transition flex items-center justify-center"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                role === 'Customer' ? 'XÁC NHẬN ĐĂNG NHẬP' : `ĐĂNG NHẬP ${role === 'Driver' ? 'TÀI XẾ' : 'QUẢN TRỊ'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

