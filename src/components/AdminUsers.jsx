import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import {
  UserCog, Loader2, AlertCircle, ShieldCheck, Shield, Eye,
  Info, UserRound
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '../context/AuthContext';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS } from '../lib/roles';

const roleOptions = [
  { value: ROLES.SUPER_ADMIN, label: ROLE_LABELS[ROLES.SUPER_ADMIN], desc: ROLE_DESCRIPTIONS[ROLES.SUPER_ADMIN] },
  { value: ROLES.RECEPTIONIST, label: ROLE_LABELS[ROLES.RECEPTIONIST], desc: ROLE_DESCRIPTIONS[ROLES.RECEPTIONIST] },
  { value: ROLES.SECURITY_OFFICER, label: ROLE_LABELS[ROLES.SECURITY_OFFICER], desc: ROLE_DESCRIPTIONS[ROLES.SECURITY_OFFICER] },
];

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [updated, setUpdated] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Users read error:', err);
      setLoading(false);
      setActionError('Could not load users. The users collection is restricted to Super Admins in Firestore rules.');
    });
    return () => unsub();
  }, []);

  const handleRoleChange = async (uid, newRole) => {
    setUpdatingId(uid);
    setActionError('');
    setUpdated('');
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        roleLabel: ROLE_LABELS[newRole],
        updatedAt: new Date(),
      });
      setUpdated('Role updated.');
      setTimeout(() => setUpdated(''), 3000);
    } catch (err) {
      console.error('Role update error:', err);
      setActionError('Failed to update the role. Ensure this user has a users/{uid} document and the security rules allow the change.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout
      title="User Management"
      subtitle="Assign roles to admin portal accounts"
      icon={<UserCog size={20} className="text-indigo-600" />}
    >
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{actionError}</p>
        </div>
      )}

      {updated && (
        <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r flex items-start space-x-3">
          <Shield size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{updated}</p>
        </div>
      )}

      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl flex items-start space-x-3">
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <p className="text-sm">
          Every admin portal account appears here once signed in. Each role controls which modules that person can open. Super Admin can also create the first account from the login screen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {roleOptions.map((role) => (
          <div key={role.value} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[role.value]}`}>{role.label}</span>
              <span className="text-xs text-slate-400">{users.filter((u) => u.role === role.value).length} accounts</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{role.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="font-bold text-slate-800">Accounts</h2>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{users.length}</span>
          </div>
          {loading && <Loader2 size={18} className="animate-spin text-slate-400" />}
        </div>

        {!loading && users.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            <UserRound size={40} className="mx-auto mb-3 text-slate-200" />
            No admin accounts yet. Sign in once from the login page to register your account here.
          </div>
        )}

        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Account</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Role</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Assign Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((account) => (
                  <tr key={account.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-indigo-600">{account.email?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{account.email}</p>
                          {account.id === user?.uid && (
                            <span className="text-xs text-blue-600 font-medium">This is you</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${ROLE_COLORS[account.role]}`}>
                        {account.role === ROLES.SUPER_ADMIN && <ShieldCheck size={12} className="mr-1" />}
                        {account.role === ROLES.SECURITY_OFFICER && <Eye size={12} className="mr-1" />}
                        {ROLE_LABELS[account.role] || account.role || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <select
                          value={account.role || ''}
                          onChange={(e) => handleRoleChange(account.id, e.target.value)}
                          disabled={updatingId === account.id}
                          className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-500 bg-white disabled:opacity-50"
                        >
                          <option value="" disabled>Select role…</option>
                          {roleOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {updatingId === account.id && <Loader2 size={16} className="animate-spin text-slate-400" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;