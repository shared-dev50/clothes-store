import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const AdminLayout: React.FC = () => {
  const { isAuthenticated, isAdmin, logout } = useAuthStore();

  if (!isAuthenticated() || !isAdmin()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-brand-stone/10 font-sans text-brand-black">
      {/* Admin Sidebar/Header */}
      <header className="bg-brand-black text-brand-white p-4 flex justify-between items-center">
        <Link to="/admin" className="text-xl font-display font-bold tracking-widest uppercase">
          HBS Admin
        </Link>
        <div className="flex gap-4 items-center">
          <Link to="/admin/orders" className="text-sm uppercase tracking-wide hover:text-brand-taupe">
            Orders
          </Link>
          <Link to="/" className="text-sm uppercase tracking-wide hover:text-brand-taupe">
            Storefront
          </Link>
          <button 
            onClick={logout}
            className="text-sm uppercase tracking-wide bg-brand-white text-brand-black px-4 py-2 hover:bg-brand-stone transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
