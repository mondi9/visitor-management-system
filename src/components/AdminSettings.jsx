import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Settings, Loader2, AlertCircle, CheckCircle2, ShieldCheck,
  Database, Mail, Building2, Clock, Save
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '../context/AuthContext';
import { isEmailConfigured } from '../lib/email';
import { DURATION_OPTIONS } from '../lib/visitUtils';

const SETTINGS_DOC = doc(db, 'appSettings', 'general');

const AdminSettings = () => {
  const { user, role } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    organizationName: '',
    address: '',
    supportEmail: '',
    defaultVisitDuration: '30 Minutes',
  });

  useEffect(() => {
    const unsub = onSnapshot(SETTINGS_DOC, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings(data);
        setForm({
          organizationName: data.organizationName || '',
          address: data.address || '',
          supportEmail: data.supportEmail || '',
          defaultVisitDuration: data.defaultVisitDuration || '30 Minutes',
        });
      }
      setLoading(false);
    }, (err) => {
      console.error('Settings read error:', err);
      setLoading(false);
      setError('Could not load settings. Ensure the appSettings/general document is accessible via Firestore rules.');
    });
    return () => unsub();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await setDoc(SETTINGS_DOC, {
        ...form,
        updatedBy: user?.email || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Settings save error:', err);
      setError('Failed to save settings. Check your Firestore rules — writing appSettings may require a Super Admin role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Settings"
      subtitle="Organization details and system configuration"
      icon={<Settings size={20} className="text-slate-600" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {saved && (
            <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r flex items-start space-x-3">
              <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm">Settings saved successfully.</p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-3">
              <Building2 size={18} className="text-blue-600" />
              <h2 className="font-bold text-slate-800">Organization</h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  name="organizationName"
                  value={form.organizationName}
                  onChange={handleChange}
                  placeholder="Acme Corporation"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="12 Innovation Drive, Lagos"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Support Email</label>
                <input
                  type="email"
                  name="supportEmail"
                  value={form.supportEmail}
                  onChange={handleChange}
                  placeholder="support@acme.com"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Default Visit Duration</label>
                <select
                  name="defaultVisitDuration"
                  value={form.defaultVisitDuration}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
                >
                  {DURATION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center px-6 py-3 bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* System status column */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-3">
              <Database size={18} className="text-blue-600" />
              <h2 className="font-bold text-slate-800">Integrations</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Database size={16} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Firestore</p>
                    <p className="text-xs text-slate-400">Visitor records</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${settings ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {settings ? 'Connected' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
                    <Mail size={16} className="text-rose-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Email (EmailJS)</p>
                    <p className="text-xs text-slate-400">Confirmations & reminders</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isEmailConfigured() ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {isEmailConfigured() ? 'Configured' : 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <ShieldCheck size={16} className="text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Your Role</p>
                    <p className="text-xs text-slate-400 capitalize">{role || '—'}</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                  {role === 'super-admin' ? 'Super Admin' : role === 'receptionist' ? 'Receptionist' : 'Security'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-3">
              <Clock size={18} className="text-blue-600" />
              <h2 className="font-bold text-slate-800">Badge Footer</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-3">
                The printed badge footer shows the organization name:
              </p>
              <p className="text-xs font-medium px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
                {form.organizationName || 'Powered by VisitorPro Management'}
              </p>
              <p className="text-xs text-slate-400 mt-3">
                Set the organization name above and it replaces the default footer on visitor badges. The default visit duration is also used as the starting option at the kiosk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;