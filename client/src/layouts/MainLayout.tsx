import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="flex flex-col min-h-screen bg-brand-white text-brand-black">
      <Navbar />
      <main className={`flex-grow flex flex-col ${isHomePage ? 'pt-0' : 'pt-24'}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
