import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NeonBackground from './NeonBackground';
import Header from './Header';
import Sidebar from './Sidebar';
import LoadingSpinner from './LoadingSpinner';
import WolfChat from './WolfChat';

const Layout = () => {
  const { isAuthenticated, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <NeonBackground />
        <LoadingSpinner size="lg" text="Initializing WolfHost..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <NeonBackground />
      
      <div className="relative z-10">
        <Header 
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
          isSidebarOpen={isSidebarOpen}
        />
        
        <div className="flex">
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />
          
          <main className="flex-1 min-w-0 p-2 sm:p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
            <Outlet />
          </main>
        </div>
      </div>
      <WolfChat />
    </div>
  );
};

export default Layout;
