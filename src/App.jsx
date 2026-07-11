import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CheckInForm from './components/CheckInForm';
import DigitalBadge from './components/DigitalBadge';
import AdminDashboard from './components/AdminDashboard';
import FrequentVisitorsDashboard from './components/FrequentVisitorsDashboard';

const CheckInFlow = () => {
  const [currentVisitor, setCurrentVisitor] = useState(null);

  if (currentVisitor) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <div className="m-auto w-full max-w-lg">
          <DigitalBadge visitor={currentVisitor} onBack={() => setCurrentVisitor(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <CheckInForm onCheckInSuccess={setCurrentVisitor} />
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen font-sans bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Routes>
          <Route path="/" element={<CheckInFlow />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/visitors" element={<AdminDashboard />} />
          <Route path="/admin/notifications" element={<AdminDashboard />} />
          <Route path="/admin/settings" element={<AdminDashboard />} />
          <Route path="/admin/frequent-visitors" element={<FrequentVisitorsDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
