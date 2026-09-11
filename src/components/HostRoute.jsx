import { Loader2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminLogin from './AdminLogin';
import { ROLES } from '../lib/roles';

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0B192C]">
    <div className="flex flex-col items-center text-slate-400">
      <Loader2 size={40} className="animate-spin mb-4 text-teal-400" />
      <span className="font-medium">Checking session…</span>
    </div>
  </div>
);

const AccessDenied = ({ role }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6] p-6">
    <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center border border-slate-100">
      <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-5">
        <ShieldAlert size={26} className="text-rose-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
      <p className="text-slate-500 text-sm mb-6">
        The Host Portal is only for accounts with the Host role. Ask a Super Admin to assign it in User Management.
      </p>
      {role === ROLES.HOST ? (
        <Link
          to="/host"
          className="inline-flex px-6 py-3 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-semibold transition-colors"
        >
          Open Host Portal
        </Link>
      ) : (
        <Link
          to="/admin"
          className="inline-flex px-6 py-3 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-semibold transition-colors"
        >
          Back to Admin Portal
        </Link>
      )}
    </div>
  </div>
);

const HostRoute = ({ children }) => {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AdminLogin />;
  if (role !== ROLES.HOST) return <AccessDenied role={role} />;
  return children;
};

export default HostRoute;