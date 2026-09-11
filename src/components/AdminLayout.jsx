import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Sidebar from './Sidebar';

const AdminLayout = ({ title, subtitle, icon, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-[#f4f7f6] overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mr-4 lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg flex-shrink-0"
            >
              <Menu size={24} />
            </button>
            <Link
              to="/"
              className="mr-4 p-2 text-slate-500 hover:bg-slate-100 rounded-lg flex-shrink-0"
              title="Back to Home"
            >
              <ArrowLeft size={24} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#0B192C] flex items-center gap-2 truncate">
                {icon}
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-500 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600">
              <Calendar size={16} />
              <span>{format(now, 'dd MMM yyyy')}</span>
            </div>
            <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600">
              <Clock size={16} />
              <span>{format(now, 'hh:mm:ss a')}</span>
            </div>
            <Link
              to="/admin/notifications"
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 relative"
              title="Notifications"
            >
              <Bell size={20} />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;