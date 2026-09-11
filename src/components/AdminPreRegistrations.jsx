import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, query, where, addDoc, deleteDoc, doc,
  serverTimestamp, getDocs
} from 'firebase/firestore';
import {
  ClipboardCheck, Plus, X, Search, Trash2, Loader2, UserPlus,
  CalendarCheck, AlertCircle, Phone, Mail, UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import AdminLayout from './AdminLayout';
import { useAuth } from '../context/AuthContext';
import { DURATION_OPTIONS, DURATION_MINUTES, getExpectedCheckout, toDate } from '../lib/visitUtils';
import { generateBadgeNumber } from '../lib/badge';
import { sendVisitEmail, sendHostEmail } from '../lib/email';

const emptyForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  hostName: '',
  hostEmail: '',
  purpose: 'Business Meeting',
  scheduledTime: '',
  duration: '1 Hour',
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const AdminPreRegistrations = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [lastBadge, setLastBadge] = useState('');

  useEffect(() => {
    // Admin-created visits live in the shared `visitors` ledger as
    // Pre-Registered records so reception can retrieve them by badge number.
    const q = query(collection(db, 'visitors'), where('status', '==', 'Pre-Registered'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          expectedArrivalTime: toDate(data.expectedArrivalTime),
          expectedCheckoutTime: toDate(data.expectedCheckoutTime),
          registrationTime: toDate(data.registrationTime),
        };
      });
      list.sort((a, b) => (b.registrationTime?.getTime() || 0) - (a.registrationTime?.getTime() || 0));
      setItems(list);
      setLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      setLoading(false);
      setActionError('Could not load pre-registrations. Check your Firestore rules.');
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setActionError('Name and phone are required.');
      return;
    }
    if (!form.email.trim() || !isValidEmail(form.email.trim())) {
      setActionError('A valid visitor email is required so the badge can be sent.');
      return;
    }
    if (!form.scheduledTime) {
      setActionError('Visit date / arrival time is required.');
      return;
    }
    const arrival = new Date(form.scheduledTime);
    if (Number.isNaN(arrival.getTime())) {
      setActionError('Scheduled time must be a valid date and time.');
      return;
    }
    setSaving(true);
    setActionError('');
    setLastBadge('');
    try {
      let badgeNumber = '';
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const candidate = generateBadgeNumber();
        const existing = await getDocs(query(collection(db, 'visitors'), where('badgeNumber', '==', candidate)));
        if (existing.empty) { badgeNumber = candidate; break; }
      }
      if (!badgeNumber) {
        setActionError('Could not generate a unique badge number. Please try again.');
        return;
      }

      const expectedCheckoutTime = getExpectedCheckout(form.duration, arrival);
      const visitData = {
        name: form.name.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        purpose: form.purpose,
        duration: form.duration,
        durationMinutes: DURATION_MINUTES[form.duration] || 60,
        expectedArrivalTime: arrival,
        expectedCheckoutTime,
        badgeNumber,
        status: 'Pre-Registered',
        type: 'visitor',
        profileId: null,
        photoUrl: null,
        registeredBy: user?.uid || null,
        hostId: null,
        hostName: form.hostName.trim(),
        hostEmail: form.hostEmail.trim(),
        registrationTime: serverTimestamp(),
        registrationEmailSent: false,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'visitors'), visitData);

      const emailTarget = { ...visitData, id: ref.id, checkInTime: arrival, expectedCheckoutTime };
      const results = await Promise.allSettled([
        sendVisitEmail(emailTarget, {
          message: `Your visit has been pre-registered. Your badge number is ${badgeNumber}. Please present it at reception when you arrive.`,
        }),
        emailTarget.hostEmail
          ? sendHostEmail(emailTarget, {
              message: `You registered ${visitData.name} for a visit. Badge number ${badgeNumber}. Expected arrival ${format(arrival, 'MMM d, h:mm a')}.`,
            })
          : Promise.resolve(false),
      ]);
      const emailOk = results.every((r) => r.status === 'fulfilled' && r.value === true);

      setLastBadge(badgeNumber);
      setForm(emptyForm);
      setShowAdd(false);
      if (!emailOk) {
        setActionError(`Visitor registered with badge ${badgeNumber}, but one or more notification emails could not be sent.`);
      }
    } catch (err) {
      console.error('Add error:', err);
      setActionError(err?.code === 'permission-denied'
        ? 'Registration was blocked: Firestore security rules deny this write. Deploy firestore.rules.'
        : 'Failed to add the pre-registration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'visitors', id));
    } catch (err) {
      console.error('Delete error:', err);
      setActionError('Failed to delete the pre-registration. Only a Super Admin can delete visit records.');
    }
  };

  const filtered = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      item.name?.toLowerCase().includes(q) ||
      item.hostName?.toLowerCase().includes(q) ||
      item.badgeNumber?.toLowerCase().includes(q) ||
      item.phone?.includes(q)
    );
  });

  const pending = items.length;

  return (
    <AdminLayout
      title="Pre-Registrations"
      subtitle="Book visitors ahead of their arrival — badge emailed automatically"
      icon={<ClipboardCheck size={20} className="text-blue-600" />}
    >
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{actionError}</p>
        </div>
      )}

      {lastBadge && !showAdd && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold">
          Visitor registered. Badge number {lastBadge} was generated and emailed.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Total Bookings</p>
            <p className="text-3xl font-bold text-slate-800">{items.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <ClipboardCheck size={22} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Pending Arrival</p>
            <p className="text-3xl font-bold text-amber-600">{pending}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <CalendarCheck size={22} className="text-amber-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">How check-in works</p>
            <p className="text-sm font-semibold text-slate-600">Badge → Photo → Check In</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <UserCheck size={22} className="text-emerald-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, host, badge, phone…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => { setShowAdd(true); setActionError(''); setLastBadge(''); }}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} className="mr-1.5" /> New Pre-Registration
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            <span className="font-medium">Loading bookings…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No pre-registrations yet. Use "New Pre-Registration" to book a visitor ahead of time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Badge / Visitor</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Host</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Scheduled</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs text-blue-600 font-bold">{item.badgeNumber || '—'}</p>
                      <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {item.phone && <span className="flex items-center gap-1"><Phone size={10} /> {item.phone}</span>}
                        {item.email && <span className="flex items-center gap-1"><Mail size={10} /> {item.email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-600">{item.hostName || '—'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.purpose || ''}</p>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        {item.expectedArrivalTime
                          ? format(item.expectedArrivalTime, 'MMM d, hh:mm a')
                          : '—'}
                      </span>
                      {item.expectedCheckoutTime && (
                        <p className="text-xs text-slate-400">Ends {format(item.expectedCheckoutTime, 'hh:mm a')}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-600">
                        Pre-Registered
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-400">Reception checks in by badge</span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                          title="Cancel registration (Super Admin)"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(11,25,44,0.70)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <UserPlus size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">New Pre-Registration</h3>
                  <p className="text-xs text-slate-500">Badge number is generated + emailed on save</p>
                </div>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jane@company.com"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Acme"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Host Name</label>
                  <input
                    type="text"
                    value={form.hostName}
                    onChange={(e) => setForm({ ...form, hostName: e.target.value })}
                    placeholder="Who will they visit?"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Host Email</label>
                  <input
                    type="email"
                    value={form.hostEmail}
                    onChange={(e) => setForm({ ...form, hostEmail: e.target.value })}
                    placeholder="host@company.com"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Purpose</label>
                  <select
                    value={form.purpose}
                    onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
                  >
                    <option>Business Meeting</option>
                    <option>Official Visit</option>
                    <option>Interview</option>
                    <option>Site Inspection</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Duration *</label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
                  >
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Visit date / Arrival time *</label>
                <input
                  type="datetime-local"
                  value={form.scheduledTime}
                  onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                {saving ? 'Saving…' : 'Save + Email Badge'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPreRegistrations;
