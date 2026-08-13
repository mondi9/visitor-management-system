import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc,
  updateDoc, serverTimestamp
} from 'firebase/firestore';
import {
  Package, Plus, X, Search, Trash2, Loader2, Building2,
  Phone, AlertCircle, UserCheck, Clock, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import AdminLayout from './AdminLayout';
import { toDate } from '../lib/visitUtils';

const emptyForm = { recipient: '', company: '', description: '', carrier: '', phone: '' };

const AdminDeliveries = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [collectingId, setCollectingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'deliveries'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) })));
      setLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      setLoading(false);
      setActionError('Could not load deliveries. Check your Firestore rules.');
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.recipient || !form.description) {
      setActionError('Recipient and description are required.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      await addDoc(collection(db, 'deliveries'), {
        ...form,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
      setForm(emptyForm);
      setShowAdd(false);
    } catch (err) {
      console.error('Add error:', err);
      setActionError('Failed to log the delivery. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCollect = async (id) => {
    setCollectingId(id);
    try {
      await updateDoc(doc(db, 'deliveries', id), {
        status: 'Collected',
        collectedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Update error:', err);
      setActionError('Failed to mark the delivery as collected.');
    } finally {
      setCollectingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'deliveries', id));
    } catch (err) {
      console.error('Delete error:', err);
      setActionError('Failed to delete the delivery.');
    }
  };

  const filtered = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return !q
      || item.recipient?.toLowerCase().includes(q)
      || item.company?.toLowerCase().includes(q)
      || item.description?.toLowerCase().includes(q)
      || item.carrier?.toLowerCase().includes(q);
  });

  const pendingCount = items.filter((i) => i.status !== 'Collected').length;

  return (
    <AdminLayout
      title="Deliveries"
      subtitle="Incoming parcels and courier log"
      icon={<Package size={20} className="text-orange-600" />}
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
            <p className="text-sm text-slate-500 font-medium mb-1">Total Today</p>
            <p className="text-3xl font-bold text-slate-800">{items.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
            <Package size={22} className="text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Awaiting Collection</p>
            <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <Clock size={22} className="text-amber-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium mb-1">Collected</p>
            <p className="text-3xl font-bold text-emerald-600">{items.filter((i) => i.status === 'Collected').length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 size={22} className="text-emerald-500" />
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
              placeholder="Search recipient, carrier, description…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => { setShowAdd(true); setActionError(''); }}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} className="mr-1.5" /> Log Delivery
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            <span className="font-medium">Loading deliveries…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No deliveries logged. Use "Log Delivery" to record incoming parcels.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivery</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Recipient</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Logged At</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 text-sm">{item.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {item.carrier && <span className="flex items-center gap-1"><Building2 size={10} /> {item.carrier}</span>}
                        {item.phone && <span className="flex items-center gap-1"><Phone size={10} /> {item.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <p className="text-sm text-slate-600">{item.recipient}</p>
                      {item.company && <p className="text-xs text-slate-400 mt-0.5">{item.company}</p>}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        {item.createdAt ? format(item.createdAt, 'MMM d, hh:mm a') : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        item.status === 'Collected'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.status === 'Collected' ? 'Collected' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {item.status !== 'Collected' && (
                          <button
                            onClick={() => handleCollect(item.id)}
                            disabled={collectingId === item.id}
                            className="flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {collectingId === item.id ? <Loader2 size={14} className="animate-spin mr-1" /> : <UserCheck size={14} className="mr-1" />} Collected
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

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(11,25,44,0.70)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Package size={20} className="text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Log Delivery</h3>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Package Description *</label>
                <input
                  required
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="2 boxes of IT equipment"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Recipient *</label>
                <input
                  required
                  type="text"
                  value={form.recipient}
                  onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                  placeholder="Funmi Adebayo"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Recipient Company</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Finance Dept"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Courier</label>
                  <input
                    type="text"
                    value={form.carrier}
                    onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                    placeholder="DHL"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Courier Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                {saving ? 'Saving…' : 'Log Delivery'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDeliveries;