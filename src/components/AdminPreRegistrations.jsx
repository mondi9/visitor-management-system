import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc,
  updateDoc, serverTimestamp
} from 'firebase/firestore';
import {
  ClipboardCheck, Plus, X, Search, Trash2, Loader2, UserPlus,
  CalendarCheck, AlertCircle, Phone, Mail, UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import AdminLayout from './AdminLayout';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  hostName: '',
  purpose: 'Business Meeting',
  scheduledTime: '',
};

const AdminPreRegistrations = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [markingId, setMarkingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'preRegistrations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    if (!form.name || !form.phone) {
      setActionError('Name and phone are required.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      await addDoc(collection(db, 'preRegistrations'), {
        ...form,
        nameLower: form.name.toLowerCase(),
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
      setForm(emptyForm);
      setShowAdd(false);
    } catch (err) {
      console.error('Add error:', err);
      setActionError('Failed to add the pre-registration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkArrived = async (id) => {
    setMarkingId(id);
    try {
      await updateDoc(doc(db, 'preRegistrations', id), {
        status: 'Arrived',
        arrivedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Update error:', err);
      setActionError('Failed to update the status.');
    } finally {
      setMarkingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'preRegistrations', id));
    } catch (err) {
      console.error('Delete error:', err);
      setActionError('Failed to delete the pre-registration.');
    }
  };

  const filtered = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      item.name?.toLowerCase().includes(q) ||
      item.hostName?.toLowerCase().includes(q) ||
      item.phone?.includes(q)
    );
  });

  const pending = items.filter((i) => i.status !== 'Arrived').length;

  return (
    <AdminLayout
      title="Pre-Registrations"
      subtitle="Book visitors ahead of their arrival"
      icon={<ClipboardCheck size={20} className="text-blue-600" />}
    >
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{actionError}</p>
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
            <p className="text-sm text-slate-500 font-medium mb-1">Arrived Today</p>
            <p className="text-3xl font-bold text-emerald-600">{items.filter((i) => i.status === 'Arrived').length}</p>
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
              placeholder="Search name, host, phone…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => { setShowAdd(true); setActionError(''); }}
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
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visitor</th>
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
                        {item.scheduledTime
                          ? format(new Date(item.scheduledTime), 'MMM d, hh:mm a')
                          : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        item.status === 'Arrived'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status === 'Arrived' ? 'Arrived' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {item.status !== 'Arrived' && (
                          <button
                            onClick={() => handleMarkArrived(item.id)}
                            disabled={markingId === item.id}
                            className="flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {markingId === item.id ? <Loader2 size={14} className="animate-spin mr-1" /> : <UserCheck size={14} className="mr-1" />} Mark Arrived
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                          title="Delete"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <UserPlus size={20} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">New Pre-Registration</h3>
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
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@company.com"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Scheduled Time</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                {saving ? 'Saving…' : 'Save Pre-Registration'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPreRegistrations;