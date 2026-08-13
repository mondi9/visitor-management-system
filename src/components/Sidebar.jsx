import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  X,
  ChevronRight,
  ClipboardCheck,
  UserCheck,
  Package,
  FileText,
  UserCog,
  Shield,
  HardHat,
  Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, getRoleAccess } from '../lib/roles';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { user, role, signOut } = useAuth();

  const allMenuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Visitors', icon: Users, path: '/admin/visitors' },
    { name: 'Frequent Visitors', icon: Star, path: '/admin/frequent-visitors' },
    { name: 'Pre-Registrations', icon: ClipboardCheck, path: '/admin/pre-registrations' },
    { name: 'Hosts', icon: UserCheck, path: '/admin/hosts' },
    { name: 'Contractors', icon: HardHat, path: '/admin/contractors' },
    { name: 'Deliveries', icon: Package, path: '/admin/deliveries' },
    { name: 'Reports', icon: FileText, path: '/admin/reports' },
    { name: 'Settings', icon: Settings, path: '/admin/settings' },
    { name: 'User Management', icon: UserCog, path: '/admin/users' },
  ];

  const menuItems = allMenuItems.filter((item) => {
    if (!role) return true;
    return getRoleAccess(item.path).includes(role);
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0B192C]/50 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-full border-r border-[#1e293b] z-50 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-0 lg:w-20 overflow-hidden'} lg:relative lg:translate-x-0`}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="flex flex-col h-full text-white">

          {/* Logo Section */}
          <div className="p-6 flex items-center justify-between border-b border-[#1e293b]/50">
            <div className={`flex items-center space-x-3 transition-opacity duration-300 ${!isOpen && 'lg:opacity-0 lg:hidden'}`}>
              <div className="flex items-center justify-center text-white">
                <Shield size={28} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl leading-none tracking-wide text-white">
                  VMS
                </span>
                <span className="text-[9px] text-slate-400 whitespace-nowrap mt-1">Visitor Management System</span>
              </div>
            </div>

            {/* Collapse Toggle (Desktop) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-slate-800 text-slate-400 hover:text-white ml-auto"
            >
              <ChevronRight className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={18} />
            </button>

            {/* Close Button (Mobile) */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group"
                style={{
                  background: isActive(item.path) ? 'var(--primary-blue)' : 'transparent',
                  color: isActive(item.path) ? '#ffffff' : '#94a3b8',
                }}
              >
                <div className="flex items-center justify-center min-w-[24px]">
                  <item.icon size={20} className={isActive(item.path) ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'} />
                </div>
                <span className={`font-medium text-sm transition-all duration-300 whitespace-nowrap group-hover:text-white ${!isOpen && 'lg:opacity-0 lg:hidden'}`}>
                  {item.name}
                </span>
              </Link>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-[#1e293b]/50">
            <div className={`mb-2 flex items-center space-x-3 p-2 transition-all duration-300 ${!isOpen && 'lg:opacity-0 lg:hidden'}`}>
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700 flex-shrink-0">
                {user?.email?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.email || 'Admin'}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{ROLE_LABELS[role] || 'Staff'}</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center space-x-3 w-full px-3 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all group"
            >
              <div className="flex items-center justify-center min-w-[24px]">
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
              </div>
              <span className={`font-medium text-sm transition-all duration-300 ${!isOpen && 'lg:opacity-0 lg:hidden'}`}>
                Sign Out
              </span>
            </button>
          </div>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;
