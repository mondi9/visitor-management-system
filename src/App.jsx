import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import CheckInForm from './components/CheckInForm';
import DigitalBadge from './components/DigitalBadge';
import AdminDashboard from './components/AdminDashboard';
import { Users, UserPlus } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-slate-200 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
            <UserPlus size={20} />
          </div>
          <span className="font-black text-slate-800 tracking-tight text-lg">SecurePass</span>
        </div>
        
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl">
          <Link 
            to="/" 
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${location.pathname === '/' ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <UserPlus size={18} />
            <span className="text-sm">Check-In</span>
          </Link>
          <Link 
            to="/admin" 
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${isAdmin ? 'bg-white text-indigo-600 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Users size={18} />
            <span className="text-sm">Admin</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

const CheckInFlow = () => {
  const [currentVisitor, setCurrentVisitor] = useState(null);

  if (currentVisitor) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col p-4 pt-24">
        <div className="my-auto w-full">
          <DigitalBadge visitor={currentVisitor} onBack={() => setCurrentVisitor(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 pt-24">
      <div className="my-auto w-full">
        <CheckInForm onCheckInSuccess={setCurrentVisitor} />
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Routes>
          <Route path="/" element={<CheckInFlow />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/visitors" element={<AdminDashboard />} />
          <Route path="/admin/notifications" element={<AdminDashboard />} />
          <Route path="/admin/settings" element={<AdminDashboard />} />
        </Routes>
        <Navigation />
      </div>
    </Router>
  );
}

export default App;
