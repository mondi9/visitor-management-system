import { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  BadgeCheck, Search, X, Loader2, UserCheck, Building2,
  CalendarClock, CheckCircle, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { toDate } from '../lib/visitUtils';

const BadgeLookup = ({ onSelect, onClose, mode = 'checkin' }) => {
  const isCheckout = mode === 'checkout';
  const [badgeValue, setBadgeValue] = useState('');
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const handleSearch = async () => {
    const trimmed = badgeValue.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setSearched(false);
    setResult(null);
    setError('');

    try {
      const snapshot = await getDocs(
        query(collection(db, 'visitors'), where('badgeNumber', '==', trimmed))
      );
      const matched = isCheckout
        ? snapshot.docs.find((d) => d.data().status === 'Checked In')
        : snapshot.docs.find((d) => d.data().status === 'Pre-Registered');
      if (matched) {
        setResult({ id: matched.id, ...matched.data() });
      } else {
        setError(isCheckout
          ? 'No active (checked-in) visit was found for this badge number.'
          : 'No pre-registered visit was found for this badge number.');
      }
    } catch (err) {
      console.error('Badge lookup error:', err);
      if (err?.code === 'permission-denied') {
        setError('No pre-registered visit was found for this badge number.');
      } else {
        setError('Could not look up the badge. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSelect = (visit) => {
    setSelectedId(visit.id);
    setTimeout(() => onSelect(visit), 300);
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
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-teal-800/30 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
                <BadgeCheck size={20} className="text-teal-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{isCheckout ? 'Active Visit Lookup' : 'Pre-Registered Visitor'}</h2>
                <p className="text-teal-300 text-sm">{isCheckout ? 'Enter the badge number to check out' : 'Enter the badge number from your host'}</p>
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
              <BadgeCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={badgeValue}
                onChange={(e) => setBadgeValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                placeholder="e.g. VMS-20260819-AB12CD"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-medium transition-all uppercase"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !badgeValue.trim()}
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
              <BadgeCheck size={40} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium">Enter the badge number that was emailed to you</p>
              <p className="text-xs text-slate-400 mt-1">Your host shared it when they registered your visit</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Loader2 size={40} className="animate-spin mb-3 text-slate-200" />
              <p className="text-sm font-medium">Looking up your visit…</p>
            </div>
          )}

          {searched && !loading && error && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Search size={40} className="mb-3 text-slate-200" />
              <p className="text-sm font-medium text-center">{error}</p>
            </div>
          )}

          {result && !loading && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Visit found for this badge
              </p>
              <button
                onClick={() => handleSelect(result)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 space-y-3 group ${
                  selectedId === result.id
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50 hover:border-teal-300 hover:bg-teal-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-base">{result.name}</p>
                      <p className="text-sm text-slate-500">{result.badgeNumber}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${isCheckout ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {result.status || (isCheckout ? 'Checked In' : 'Pre-Registered')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {result.purpose && (
                    <div className="flex items-center space-x-1.5 text-sm text-slate-500">
                      <Info size={13} className="text-slate-400 flex-shrink-0" />
                      <span>{result.purpose}</span>
                    </div>
                  )}
                  {result.hostName && (
                    <div className="flex items-center space-x-1.5 text-sm text-slate-500">
                      <UserCheck size={13} className="text-slate-400 flex-shrink-0" />
                      <span>Host: {result.hostName}</span>
                    </div>
                  )}
                  {result.company && (
                    <div className="flex items-center space-x-1.5 text-sm text-slate-500">
                      <Building2 size={13} className="text-slate-400 flex-shrink-0" />
                      <span>{result.company}</span>
                    </div>
                  )}
                  {result.expectedArrivalTime && (
                    <div className="flex items-center space-x-1.5 text-sm text-slate-500">
                      <CalendarClock size={13} className="text-slate-400 flex-shrink-0" />
                      <span>Arrival: {format(toDate(result.expectedArrivalTime), 'MMM d, h:mm a')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 mt-1 pt-3 border-t border-slate-100">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span className="text-sm font-bold text-slate-700">{isCheckout ? 'This is the visit — Continue to check out' : 'This is me — Continue to check in'}</span>
                </div>
              </button>
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
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeLookup;