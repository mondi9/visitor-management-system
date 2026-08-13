import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, deleteDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import {
  UserCheck, Plus, X, Search, Trash2, Pencil, Loader2, Building2,
  Mail, Phone, AlertCircle
} from 'lucide-react';
import AdminLayout from './AdminLayout';

const emptyForm = { name: '', department: '', email: '', phone: '' };

const AdminHosts = () => {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null); // host being edited, or null
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'hosts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setHosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      setLoading(false);
      setActionError('Could not load hosts. Check your Firestore rules.');
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      setActionError('Host name is required.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      if (editing) {
        await updateDoc(doc(db, 'hosts', editing.id), {
          ...form,
          nameLower: form.name.toLowerCase(),
        });
      } else {
        await addDoc(collection(db, 'hosts'), {
          ...form,
          nameLower: form.name.toLowerCase(),
          createdAt: serverTimestamp(),
        });
      }
      setForm(emptyForm);
      setShowAdd(false);
      setEditing(null);
    } catch (err) {
      console.error('Save error:', err);
      setActionError('Failed to save the host. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'hosts', id));
    } catch (err) {
      console.error('Delete error:', err);
      setActionError('Failed to delete the host.');
    }
  };

  const openEdit = (host) => {
    setEditing(host);
    setForm({
      name: host.name || '',
      department: host.department || '',
      email: host.email || '',
      phone: host.phone || '',
    });
    setShowAdd(true);
    setActionError('');
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowAdd(true);
    setActionError('');
  };

  const filtered = hosts.filter((h) => {
    const q = searchQuery.toLowerCase();
    return !q || h.name?.toLowerCase().includes(q) || h.department?.toLowerCase().includes(q) || h.email?.toLowerCase().includes(q);
  });

  return (
    <AdminLayout
      title="Hosts"
      subtitle="Staff members visitors can be booked against"
      icon={<UserCheck size={20} className="text-blue-600" />}
    >
      {actionError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{actionError}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <h2 className="font-bold text-slate-800">All Hosts</h2>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{hosts.length}</span>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative w-full md:w-72">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, department, email…"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
            <button
              onClick={openAdd}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-[#0B192C] hover:bg-[#14294a] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={16} className="mr-1.5" /> Add Host
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-3" />
            <span className="font-medium">Loading hosts…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No hosts found. Add your first host to start booking visitors against them.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filtered.map((host) => (
              <div key={host.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-blue-600">{host.name?.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{host.name}</p>
                    {host.department && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 size={11} className="text-slate-400" /> {host.department}
                      </p>
                    )}
                    {host.email && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <Mail size={11} className="text-slate-400" /> {host.email}
                      </p>
                    )}
                    {host.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-slate-400" /> {host.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(host)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(host.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
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
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <UserCheck size={20} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{editing ? 'Edit Host' : 'Add Host'}</h3>
              </div>
              <button onClick={() => { setShowAdd(false); setEditing(null); }} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Adewale Okafor"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Engineering"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="host@company.com"
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
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
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Host'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminHosts;