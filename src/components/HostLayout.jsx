import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut, LayoutDashboard, UserPlus, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/roles';

const navItems = [
  { name: 'Dashboard', path: '/host', icon: LayoutDashboard },
  { name: 'Register Visitor', path: '/host/register', icon: UserPlus },
];

const HostLayout = ({ title, subtitle, children }) => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/host');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6]">
      {/* Header */}
      <header className="bg-[#0B192C] text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 flex items-center justify-center">
              <Shield size={22} className="text-teal-300" />
            </div>
            <div>
              <p className="font-bold text-lg leading-none tracking-wide">VMS Host Portal</p>
              <p className="text-[11px] text-slate-400 mt-1">Visitor Management System</p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/host'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <item.icon size={16} />
                <span className="hidden sm:inline">{item.name}</span>
              </NavLink>
            ))}
            <div className="hidden md:flex items-center space-x-3 ml-3 pl-4 border-l border-white/15">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Calendar size={14} />
                <span>{format(now, 'dd MMM yyyy')}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Clock size={14} />
                <span>{format(now, 'hh:mm:ss a')}</span>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* User bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-[#0B192C] flex items-center gap-2">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-sm font-semibold text-slate-700">{user?.email || 'Host'}</span>
              <span className="text-[10px] font-bold uppercase text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                {ROLE_LABELS[role] || 'Host'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-white hover:bg-[#0B192C] transition-colors border border-slate-200"
            >
              <LogOut size={16} />
              Sign Out
            </button>
            <Link to="/" className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              Kiosk
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
};

export default HostLayout;