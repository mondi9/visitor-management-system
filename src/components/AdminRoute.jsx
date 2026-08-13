import { Loader2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLogin from './AdminLogin';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0B192C]">
    <div className="flex flex-col items-center text-slate-400">
      <Loader2 size={40} className="animate-spin mb-4 text-blue-400" />
      <span className="font-medium">Checking session…</span>
    </div>
  </div>
);

const AccessDenied = ({ allowedLabels }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6] p-6">
    <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center border border-slate-100">
      <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-5">
        <ShieldAlert size={26} className="text-rose-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
      <p className="text-slate-500 text-sm mb-6">
        Your role does not have permission to open this page. It is limited to {allowedLabels}. Ask a Super Admin to adjust your role in User Management.
      </p>
      <Link
        to="/admin"
        className="inline-flex px-6 py-3 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-semibold transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  </div>
);

const AdminRoute = ({ children, roles }) => {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AdminLogin />;
  if (roles && !roles.includes(role)) {
    const allowedLabels = roles.join(', ');
    return <AccessDenied allowedLabels={allowedLabels} />;
  }
  return children;
};

export default AdminRoute;