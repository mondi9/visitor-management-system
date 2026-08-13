import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CheckInForm from './components/CheckInForm';
import DigitalBadge from './components/DigitalBadge';
import AdminDashboard from './components/AdminDashboard';
import FrequentVisitorsDashboard from './components/FrequentVisitorsDashboard';
import StayMonitor from './components/StayMonitor';
import AdminRoute from './components/AdminRoute';
import ResetPassword from './components/ResetPassword';
import AdminVisitors from './components/AdminVisitors';
import AdminPreRegistrations from './components/AdminPreRegistrations';
import AdminHosts from './components/AdminHosts';
import AdminContractors from './components/AdminContractors';
import AdminDeliveries from './components/AdminDeliveries';
import AdminReports from './components/AdminReports';
import AdminSettings from './components/AdminSettings';
import AdminUsers from './components/AdminUsers';
import AdminNotifications from './components/AdminNotifications';
import { AuthProvider } from './context/AuthContext';
import { ROLES } from './lib/roles';

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

const allRoles = [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.SECURITY_OFFICER];
const deskRoles = [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST];

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen font-sans bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <StayMonitor />
          <Routes>
            {/* Public kiosk */}
            <Route path="/" element={<CheckInFlow />} />

            {/* Admin portal */}
            <Route path="/admin" element={<AdminRoute roles={allRoles}><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/visitors" element={<AdminRoute roles={allRoles}><AdminVisitors /></AdminRoute>} />
            <Route path="/admin/frequent-visitors" element={<AdminRoute roles={deskRoles}><FrequentVisitorsDashboard /></AdminRoute>} />
            <Route path="/admin/pre-registrations" element={<AdminRoute roles={deskRoles}><AdminPreRegistrations /></AdminRoute>} />
            <Route path="/admin/hosts" element={<AdminRoute roles={deskRoles}><AdminHosts /></AdminRoute>} />
            <Route path="/admin/contractors" element={<AdminRoute roles={deskRoles}><AdminContractors /></AdminRoute>} />
            <Route path="/admin/deliveries" element={<AdminRoute roles={deskRoles}><AdminDeliveries /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute roles={allRoles}><AdminReports /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute roles={[ROLES.SUPER_ADMIN]}><AdminSettings /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute roles={[ROLES.SUPER_ADMIN]}><AdminUsers /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute roles={allRoles}><AdminNotifications /></AdminRoute>} />

            {/* Public password-recovery page reached from the reset email link */}
            <Route path="/admin/reset-password" element={<ResetPassword />} />

            {/* Fallback: unknown admin route */}
            <Route path="/admin/*" element={<AdminRoute roles={allRoles}><AdminDashboard /></AdminRoute>} />

            {/* Fallback: unknown public route */}
            <Route path="*" element={<CheckInFlow />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;