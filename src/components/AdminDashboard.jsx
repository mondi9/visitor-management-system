import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Search, UserCheck, UserX, Clock, Filter, LayoutDashboard, LogOut, Loader2, Calendar, Menu, Shield, Users } from 'lucide-react';
import { format } from 'date-fns';
import Sidebar from './Sidebar';

const AdminDashboard = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'visitors'), orderBy('checkInTime', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const visitorData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamp to JS Date if it exists
        checkInTime: doc.data().checkInTime?.toDate(),
        checkOutTime: doc.data().checkOutTime?.toDate(),
      }));
      setVisitors(visitorData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setError('Please check your Firebase configuration and Firestore rules.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCheckOut = async (visitorId) => {
    try {
      const visitorRef = doc(db, 'visitors', visitorId);
      await updateDoc(visitorRef, {
        status: 'Checked Out',
        checkOutTime: serverTimestamp()
      });
    } catch (err) {
      console.error("Error checking out:", err);
    }
  };

  const filteredVisitors = visitors.filter(visitor => {
    const matchesName = visitor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !filterDate || (visitor.checkInTime && format(visitor.checkInTime, 'yyyy-MM-dd') === filterDate);
    return matchesName && matchesDate;
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Shield size={20} className="text-white" />
            </div>
            <span className="font-bold text-slate-800">SecurePass Admin</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-700">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Header (Desktop) */}
            <div className="hidden lg:flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
                  <LayoutDashboard size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Visitor Overview</h1>
                  <p className="text-slate-500 font-medium text-sm">Real-time tracking & management</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 text-emerald-700 font-bold flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span>{visitors.filter(v => v.status === 'Active').length} Active Visitors</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center space-x-3">
                <UserX size={24} />
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Visitors</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-black text-slate-800">{visitors.length}</h3>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Users size={20} />
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Active Now</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-black text-emerald-600">{visitors.filter(v => v.status === 'Active').length}</h3>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <UserCheck size={20} />
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Today's Check-ins</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-black text-amber-600">
                    {visitors.filter(v => v.checkInTime && format(v.checkInTime, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
                  </h3>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Clock size={20} />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by visitor name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none shadow-sm font-medium"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none shadow-sm text-slate-600 font-medium"
                />
              </div>
              <button 
                onClick={() => {setSearchTerm(''); setFilterDate('');}}
                className="py-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center justify-center space-x-2"
              >
                <Filter size={18} />
                <span>Reset Filters</span>
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="animate-spin text-indigo-600" size={48} />
                  <p className="text-slate-500 font-medium text-lg">Synchronizing secure data...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor Info</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit Details</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-In/Out</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVisitors.map((visitor) => (
                        <tr key={visitor.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center space-x-3">
                              <div className="w-11 h-11 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg shadow-sm">
                                {visitor.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{visitor.name}</p>
                                <p className="text-xs text-slate-400 font-medium">{visitor.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm font-bold text-slate-700">{visitor.purpose}</p>
                            <p className="text-xs text-slate-400">Host: <span className="text-indigo-600 font-bold">{visitor.hostName}</span></p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center space-x-2 text-slate-700 text-sm font-bold">
                              <Clock size={14} className="text-indigo-400" />
                              <span>{visitor.checkInTime ? format(visitor.checkInTime, 'HH:mm') : '--:--'}</span>
                              <span className="text-slate-300 mx-1">→</span>
                              <span className={visitor.checkOutTime ? 'text-slate-700' : 'text-slate-400 font-normal italic'}>
                                {visitor.checkOutTime ? format(visitor.checkOutTime, 'HH:mm') : 'Active'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                              visitor.status === 'Active' 
                                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 shadow-sm shadow-emerald-100' 
                                : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                            }`}>
                              {visitor.status === 'Active' ? 'Active' : 'Completed'}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            {visitor.status === 'Active' ? (
                              <button
                                onClick={() => handleCheckOut(visitor.id)}
                                className="flex items-center space-x-2 px-4 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-2xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100 group/btn shadow-sm hover:shadow-rose-100"
                              >
                                <LogOut size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                <span className="text-xs">Check-out</span>
                              </button>
                            ) : (
                              <span className="text-slate-300 font-bold text-[10px] uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">Logged Out</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredVisitors.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-24 text-center">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                                <Search size={48} />
                              </div>
                              <p className="text-slate-400 font-bold text-lg">No matches found</p>
                              <p className="text-slate-300 text-sm">Try adjusting your filters or search term</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
