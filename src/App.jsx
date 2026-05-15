import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import CheckInForm from './components/CheckInForm';
import DigitalBadge from './components/DigitalBadge';
import AdminDashboard from './components/AdminDashboard';
import { Users, UserPlus, Moon, Sun } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

const Navigation = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 backdrop-blur-xl border-b z-50 transition-all duration-300"
      style={{
        background: 'var(--nav-bg)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="SecurePass Logo" className="w-10 h-10 rounded-xl shadow-lg" />
          <span className="font-black tracking-tight text-lg" style={{ color: 'var(--text-primary)' }}>
            SecurePass
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center space-x-1 p-1 rounded-2xl" style={{ background: 'var(--bg-subtle)' }}>
            <Link
              to="/"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-bold"
              style={{
                background: location.pathname === '/' ? 'var(--bg-card)' : 'transparent',
                color: location.pathname === '/' ? 'var(--accent-text)' : 'var(--text-muted)',
                boxShadow: location.pathname === '/' ? '0 1px 4px var(--shadow-color)' : 'none',
              }}
            >
              <UserPlus size={16} />
              <span>Check-In</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-bold"
                style={{
                  background: isAdmin ? 'var(--bg-card)' : 'transparent',
                  color: isAdmin ? 'var(--accent-text)' : 'var(--text-muted)',
                  boxShadow: isAdmin ? '0 1px 4px var(--shadow-color)' : 'none',
                }}
              >
                <Users size={16} />
                <span>Admin</span>
              </Link>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark
              ? <Sun size={18} className="text-amber-400" />
              : <Moon size={18} className="text-indigo-500" />
            }
          </button>
        </div>
      </div>
    </nav>
  );
};

const CheckInFlow = () => {
  const [currentVisitor, setCurrentVisitor] = useState(null);

  if (currentVisitor) {
    return (
      <div className="min-h-screen flex flex-col p-4 pt-24 transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
        <div className="my-auto w-full">
          <DigitalBadge visitor={currentVisitor} onBack={() => setCurrentVisitor(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 pt-24 transition-colors duration-300" style={{ background: 'var(--bg-primary)' }}>
      <div className="my-auto w-full">
        <CheckInForm onCheckInSuccess={setCurrentVisitor} />
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen font-sans transition-colors duration-300" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Navigation />
        <Routes>
          <Route path="/" element={<CheckInFlow />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/visitors" element={<AdminDashboard />} />
          <Route path="/admin/notifications" element={<AdminDashboard />} />
          <Route path="/admin/settings" element={<AdminDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
