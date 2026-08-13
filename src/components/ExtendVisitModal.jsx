import { useState } from 'react';
import { X, Clock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toDate } from '../lib/visitUtils';
import { sendVisitEmail, sendHostEmail } from '../lib/email';

const EXTEND_PRESETS = [
  { label: '+30 Minutes', minutes: 30 },
  { label: '+1 Hour', minutes: 60 },
  { label: '+2 Hours', minutes: 120 },
];

const ExtendVisitModal = ({ visitor, onClose, onExtended }) => {
  const [minutes, setMinutes] = useState(30);
  const [custom, setCustom] = useState('');
  const [mode, setMode] = useState('preset');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nowSnapshot] = useState(() => new Date());

  const currentExpiry = toDate(visitor.expectedCheckoutTime);

  const effectiveMinutes = mode === 'custom' ? Number(custom || 0) : minutes;

  const baseMs = currentExpiry && currentExpiry.getTime() > nowSnapshot.getTime()
    ? currentExpiry.getTime()
    : nowSnapshot.getTime();
  const previewCheckout = new Date(baseMs + effectiveMinutes * 60000);

  const handleExtend = async () => {
    const totalMinutes = mode === 'custom' ? Number(custom) : minutes;
    if (!totalMinutes || totalMinutes <= 0 || totalMinutes > 1440) {
      setError('Enter a duration between 1 minute and 24 hours.');
      return;
    }
    if (!Number.isInteger(totalMinutes)) {
      setError('Duration must be a whole number of minutes.');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const now = new Date();
      const base = currentExpiry && currentExpiry.getTime() > now.getTime() ? currentExpiry : now;
      const newExpected = new Date(base.getTime() + totalMinutes * 60 * 1000);

      await updateDoc(doc(db, 'visitors', visitor.id), {
        expectedCheckoutTime: newExpected,
        reminderSent: false,
        expiredEmailSent: false,
        extendCount: (visitor.extendCount || 0) + 1,
        lastExtendedAt: new Date(),
      });

      const visitorMsg = 'Your visit has been extended. Your new expected checkout time has been updated.';
      const hostMsg = `${visitor.name || 'The visitor'}'s visit has been extended.`;
      await Promise.allSettled([
        sendVisitEmail(visitor, { message: visitorMsg, checkoutOverride: newExpected }),
        visitor.hostEmail
          ? sendHostEmail(visitor, { message: hostMsg, checkoutOverride: newExpected })
          : Promise.resolve(false),
      ]);

      setSuccess('Visit extended. The visitor and host have been notified.');
      if (onExtended) onExtended();
    } catch (err) {
      console.error('Failed to extend visit:', err);
      setError('Failed to extend the visit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,25,44,0.70)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Extend Visit</h3>
              <p className="text-sm text-slate-500">{visitor.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {currentExpiry && (
          <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm">
            <span className="text-slate-500">Current expected checkout: </span>
            <span className="font-semibold text-slate-800">
              {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(currentExpiry)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-5">
          {EXTEND_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => { setMode('preset'); setMinutes(preset.minutes); setError(''); }}
              className={`py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                mode === 'preset' && minutes === preset.minutes
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-700">Custom Duration</label>
            <button
              onClick={() => { setMode('custom'); setMinutes(0); }}
              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                mode === 'custom' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              Enable Custom
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max="1440"
              value={mode === 'custom' ? custom : ''}
              onChange={(e) => setCustom(e.target.value)}
              disabled={mode !== 'custom'}
              placeholder="Minutes to extend"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-300"
            />
            <span className="text-sm font-medium text-slate-500">min</span>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-blue-50/50 border border-blue-100 text-sm text-slate-700">
          <span className="font-semibold text-blue-700">New expected checkout: </span>
          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(previewCheckout)}
        </div>

        {error && (
          <div className="mb-5 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r flex items-start space-x-3">
            <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        <button
          onClick={handleExtend}
          disabled={saving || Boolean(success)}
          className="w-full py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
          {saving ? 'Updating…' : 'Extend Visit & Notify'}
        </button>
      </div>
    </div>
  );
};

export default ExtendVisitModal;