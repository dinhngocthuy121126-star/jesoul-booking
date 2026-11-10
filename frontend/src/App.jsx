import React, { useState } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import AppRoutes from './routes/AppRoutes';
import LoginModal from './components/common/LoginModal';

export default function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      {/* Header with sticky navigation */}
      <Header onOpenLogin={() => setShowLoginModal(true)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-10">
        <AppRoutes onOpenLogin={() => setShowLoginModal(true)} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Role-based Login Modal (UI-SCR-03) */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
