import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Search, UserCheck, UserX, Clock, Filter, LayoutDashboard, LogOut, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <LayoutDashboard size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Admin Console</h1>
              <p className="text-slate-500 font-medium">Visitor Tracking & Management</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 text-emerald-700 font-bold flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>{visitors.filter(v => v.status === 'Active').length} Active</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center space-x-3">
            <UserX size={24} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by visitor name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none shadow-sm"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none shadow-sm text-slate-600"
            />
          </div>
          <button 
            onClick={() => {setSearchTerm(''); setFilterDate('');}}
            className="py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center space-x-2"
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
              <p className="text-slate-500 font-medium">Synchronizing data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Visitor</th>
                    <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Purpose / Host</th>
                    <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Timing</th>
                    <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-5 text-sm font-bold text-slate-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVisitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                            {visitor.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{visitor.name}</p>
                            <p className="text-xs text-slate-500">{visitor.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-700">{visitor.purpose}</p>
                        <p className="text-xs text-slate-500">Visiting: <span className="text-slate-700 font-medium">{visitor.hostName}</span></p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-2 text-slate-700 text-sm font-medium">
                          <Clock size={14} className="text-slate-400" />
                          <span>In: {visitor.checkInTime ? format(visitor.checkInTime, 'HH:mm') : '--:--'}</span>
                        </div>
                        {visitor.checkOutTime && (
                          <div className="flex items-center space-x-2 text-slate-400 text-xs mt-1">
                            <Clock size={12} />
                            <span>Out: {format(visitor.checkOutTime, 'HH:mm')}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          visitor.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {visitor.status === 'Active' ? 'Checked In' : 'Checked Out'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {visitor.status === 'Active' ? (
                          <button
                            onClick={() => handleCheckOut(visitor.id)}
                            className="flex items-center space-x-2 px-4 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-all border border-rose-100"
                          >
                            <LogOut size={16} />
                            <span>Check-out</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 italic text-sm">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredVisitors.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-20 text-center text-slate-400 font-medium">
                        No visitors found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
