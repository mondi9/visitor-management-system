import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import CheckInForm from './components/CheckInForm';
import DigitalBadge from './components/DigitalBadge';
import AdminDashboard from './components/AdminDashboard';
import { Users, Settings, UserPlus } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl text-white px-6 py-4 rounded-full shadow-2xl z-50 flex items-center space-x-8 border border-white/10">
      <Link 
        to="/" 
        className={`flex items-center space-x-2 transition-all ${!isAdmin ? 'text-indigo-400 scale-110' : 'text-slate-400 hover:text-white'}`}
      >
        <UserPlus size={20} />
        <span className="font-bold text-sm">Check-In</span>
      </Link>
      <div className="w-px h-6 bg-white/10"></div>
      <Link 
        to="/admin" 
        className={`flex items-center space-x-2 transition-all ${isAdmin ? 'text-indigo-400 scale-110' : 'text-slate-400 hover:text-white'}`}
      >
        <Users size={20} />
        <span className="font-bold text-sm">Dashboard</span>
      </Link>
    </nav>
  );
};

const CheckInFlow = () => {
  const [currentVisitor, setCurrentVisitor] = useState(null);

  if (currentVisitor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <DigitalBadge visitor={currentVisitor} onBack={() => setCurrentVisitor(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <CheckInForm onCheckInSuccess={setCurrentVisitor} />
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
        </Routes>
        <Navigation />
      </div>
    </Router>
  );
}

export default App;
