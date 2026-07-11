import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, query, orderBy, deleteDoc, doc
} from 'firebase/firestore';
import {
  Star, Search, Trash2, Building2, Phone, Mail, CalendarCheck,
  UserRound, Loader2, AlertTriangle, Menu, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import Sidebar from './Sidebar';

const FrequentVisitorsDashboard = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // holds visitor obj to confirm
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'frequentVisitors'), orderBy('visitCount', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setVisitors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'frequentVisitors', id));
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const filtered = visitors.filter(v => {
    const q = searchQuery.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.company?.toLowerCase().includes(q) ||
      v.phone?.includes(q)
    );
  });

  const totalVisits = visitors.reduce((sum, v) => sum + (v.visitCount || 0), 0);

  return (
    <div className="flex h-screen bg-[#f4f7f6] overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mr-4 lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#0B192C] flex items-center gap-2">
                <Star size={20} className="text-amber-500 fill-amber-500" />
                Frequent Visitors
              </h1>
              <p className="text-sm text-slate-500">Registered recurring visitor profiles</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">Registered Profiles</p>
                <p className="text-3xl font-bold text-slate-800">{visitors.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                <Star size={22} className="text-amber-500 fill-amber-400" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">Total Repeat Visits</p>
                <p className="text-3xl font-bold text-slate-800">{totalVisits}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <CalendarCheck size={22} className="text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">Avg Visits / Profile</p>
                <p className="text-3xl font-bold text-slate-800">
                  {visitors.length ? (totalVisits / visitors.length).toFixed(1) : '—'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <ShieldCheck size={22} className="text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Search + Table Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Card Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <h2 className="font-bold text-slate-800">All Profiles</h2>
              <div className="relative w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search name, company, phone…"
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 size={28} className="animate-spin mr-3" />
                <span className="font-medium">Loading profiles…</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <UserRound size={48} className="mb-4 text-slate-200" />
                <p className="font-semibold text-slate-500 mb-1">
                  {searchQuery ? 'No profiles match your search' : 'No frequent visitors yet'}
                </p>
                <p className="text-sm text-slate-400 text-center max-w-xs">
                  {searchQuery
                    ? 'Try a different name, company, or phone number.'
                    : 'After a visitor checks in, tap "Save as Frequent Visitor" on their badge to register them here.'}
                </p>
              </div>
            )}

            {/* Table */}
            {!loading && filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/70">
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visitor</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Contact</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:table-cell">Default Host</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visits</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:table-cell">Last Visit</th>
                      <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(visitor => (
                      <tr key={visitor.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Visitor */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
                              {visitor.photoUrl
                                ? <img src={visitor.photoUrl} alt={visitor.name} className="w-full h-full object-cover" />
                                : <span className="font-bold text-slate-500 text-sm">{visitor.name?.charAt(0)}</span>
                              }
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{visitor.name}</p>
                              {visitor.company && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                  <Building2 size={10} />
                                  <span>{visitor.company}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="space-y-1">
                            {visitor.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Phone size={11} className="text-slate-400" />
                                <span>{visitor.phone}</span>
                              </div>
                            )}
                            {visitor.email && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Mail size={11} className="text-slate-400" />
                                <span className="truncate max-w-[160px]">{visitor.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Default Host */}
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <p className="text-sm text-slate-700 font-medium">{visitor.defaultHostName || '—'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{visitor.defaultPurpose || ''}</p>
                        </td>

                        {/* Visit Count */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                            <Star size={12} className="fill-amber-500 text-amber-500" />
                            {visitor.visitCount || 1}
                          </span>
                        </td>

                        {/* Last Visit */}
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className="text-sm text-slate-600">
                            {visitor.lastVisit
                              ? format(visitor.lastVisit.toDate?.() || new Date(visitor.lastVisit), 'dd MMM yyyy')
                              : '—'
                            }
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setConfirmDelete(visitor)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                            title="Remove profile"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(11,25,44,0.70)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mb-5">
                <AlertTriangle size={26} className="text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Remove Profile?</h3>
              <p className="text-slate-500 text-sm mb-6">
                <span className="font-semibold text-slate-700">{confirmDelete.name}</span>'s frequent visitor profile will be permanently deleted. This cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDelete.id)}
                  disabled={deletingId === confirmDelete.id}
                  className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                >
                  {deletingId === confirmDelete.id
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Trash2 size={16} />
                  }
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrequentVisitorsDashboard;
