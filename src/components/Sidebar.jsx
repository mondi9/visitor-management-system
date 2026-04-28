import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Shield, 
  Bell, 
  X, 
  ChevronRight,
  UserPlus
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Visitor List', icon: Users, path: '/admin/visitors' },
    { name: 'New Registration', icon: UserPlus, path: '/' },
    { name: 'Notifications', icon: Bell, path: '/admin/notifications' },
    { name: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50 transition-all duration-300 ease-in-out
        ${isOpen ? 'w-72' : 'w-0 lg:w-24 overflow-hidden'}
        lg:relative lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          
          {/* Logo Section */}
          <div className="p-6 flex items-center justify-between">
            <div className={`flex items-center space-x-3 transition-opacity duration-300 ${!isOpen && 'lg:opacity-0 lg:hidden'}`}>
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                <Shield className="text-white" size={20} />
              </div>
              <span className="font-bold text-slate-800 text-lg whitespace-nowrap">SecurePass</span>
            </div>
            
            {/* Collapse Toggle (Desktop) */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            >
              <ChevronRight className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={18} />
            </button>

            {/* Close Button (Mobile) */}
            <button 
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 space-y-2 py-4">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 group
                  ${isActive(item.path) 
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <item.icon size={22} className={`transition-colors ${isActive(item.path) ? 'text-indigo-600' : 'group-hover:text-indigo-500'}`} />
                <span className={`font-bold transition-all duration-300 whitespace-nowrap ${!isOpen && 'lg:opacity-0 lg:hidden'}`}>
                  {item.name}
                </span>
                {isActive(item.path) && isOpen && (
                  <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                )}
              </Link>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 mt-auto">
            <div className={`mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all duration-300 ${!isOpen && 'lg:opacity-0 lg:hidden'}`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  AD
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 leading-tight">Admin User</p>
                  <p className="text-xs text-slate-500">Security Head</p>
                </div>
              </div>
            </div>

            <button className={`
              flex items-center space-x-3 w-full px-4 py-3 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all group
            `}>
              <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
              <span className={`font-bold transition-all duration-300 ${!isOpen && 'lg:opacity-0 lg:hidden'}`}>
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
