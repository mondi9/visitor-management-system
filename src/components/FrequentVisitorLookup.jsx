import { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Search, X, Star, Building2, Phone, CalendarCheck, Loader2, UserRound, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const FrequentVisitorLookup = ({ onSelect, onClose }) => {
  const [searchValue, setSearchValue] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const handleSearch = async () => {
    const trimmed = searchValue.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(false);
    setResults([]);

    try {
      // Search by phone or name (case-insensitive name search via prefix)
      const phoneQuery = query(
        collection(db, 'frequentVisitors'),
        where('phone', '==', trimmed)
      );
      const snapshot = await getDocs(phoneQuery);

      let found = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // If nothing by phone, try searching by name (starts with)
      if (found.length === 0) {
        const nameQuery = query(
          collection(db, 'frequentVisitors'),
          where('nameLower', '>=', trimmed.toLowerCase()),
          where('nameLower', '<=', trimmed.toLowerCase() + '\uf8ff')
        );
        const nameSnap = await getDocs(nameQuery);
        found = nameSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      setResults(found);
    } catch (err) {
      console.error('Lookup error:', err);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSelect = (visitor) => {
    setSelectedId(visitor.id);
    setTimeout(() => onSelect(visitor), 300);
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,25,44,0.80)', backdropFilter: 'blur(6px)' }}
    >
      {/* Modal Card */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-6 duration-400">

        {/* Header */}
        <div className="bg-[#0B192C] px-8 py-7 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-blue-800/30 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                <Star size={20} className="text-blue-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Returning Visitor</h2>
                <p className="text-blue-300 text-sm">Search by phone or name</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-8 py-6 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder="Enter phone number or name…"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !searchValue.trim()}
              className="px-5 py-3 bg-[#0B192C] hover:bg-[#14294a] text-white rounded-xl font-semibold text-sm flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <Search size={16} />
              }
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="px-8 py-6 max-h-80 overflow-y-auto">
          {!searched && !loading && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <UserRound size={40} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium">Enter a phone number or name above</p>
            </div>
          )}

          {searched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Search size={40} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium">No registered visitor found</p>
              <p className="text-xs text-slate-400 mt-1">Complete a new check-in and save as frequent visitor</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                {results.length} profile{results.length > 1 ? 's' : ''} found
              </p>
              {results.map(visitor => (
                <button
                  key={visitor.id}
                  onClick={() => handleSelect(visitor)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center space-x-4 group ${
                    selectedId === visitor.id
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-100 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-md flex-shrink-0 bg-slate-200 flex items-center justify-center">
                    {visitor.photoUrl
                      ? <img src={visitor.photoUrl} alt={visitor.name} className="w-full h-full object-cover" />
                      : <span className="text-xl font-bold text-slate-500">{visitor.name?.charAt(0)}</span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-base truncate">{visitor.name}</p>
                    {visitor.company && (
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <Building2 size={12} className="text-slate-400 flex-shrink-0" />
                        <p className="text-sm text-slate-500 truncate">{visitor.company}</p>
                      </div>
                    )}
                    <div className="flex items-center space-x-3 mt-1.5">
                      <span className="inline-flex items-center space-x-1 text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                        <Star size={10} />
                        <span>{visitor.visitCount || 1} visit{(visitor.visitCount || 1) !== 1 ? 's' : ''}</span>
                      </span>
                      {visitor.lastVisit && (
                        <span className="flex items-center space-x-1 text-xs text-slate-400">
                          <CalendarCheck size={10} />
                          <span>Last: {format(visitor.lastVisit.toDate?.() || new Date(visitor.lastVisit), 'dd MMM yyyy')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Select indicator */}
                  <div className={`flex-shrink-0 transition-all duration-200 ${selectedId === visitor.id ? 'text-emerald-500 scale-110' : 'text-slate-300 group-hover:text-blue-400'}`}>
                    <CheckCircle size={24} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            First time here? Use the standard check-in.
          </p>
          <button
            onClick={onClose}
            className="text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            New Visitor →
          </button>
        </div>
      </div>
    </div>
  );
};

export default FrequentVisitorLookup;
