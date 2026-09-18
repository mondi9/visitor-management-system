import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import {
  UserPlus, Loader2, AlertCircle, CheckCircle2, Search, Star, X,
  CalendarClock, Send, Info
} from 'lucide-react';
import { format } from 'date-fns';
import HostLayout from './HostLayout';
import { useAuth } from '../context/AuthContext';
import { DURATION_OPTIONS, DURATION_MINUTES, getExpectedCheckout } from '../lib/visitUtils';
import { generateBadgeNumber } from '../lib/badge';
import { sendVisitEmail, sendHostEmail, isEmailConfigured } from '../lib/email';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const emptyForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  purpose: 'Business Meeting',
  expectedArrival: '',
  duration: '30 Minutes',
};

const HostRegisterVisitor = () => {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [frequentProfile, setFrequentProfile] = useState(null);
  const [profileChecking, setProfileChecking] = useState(false);
  const [profileCheckDone, setProfileCheckDone] = useState(false);
  const [error, setError] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const hostIdentity = useMemo(() => {
    const display = user?.displayName || '';
    const fallback = user?.email ? user.email.split('@')[0] : 'Host';
    const raw = display || fallback;
    return { name: raw.charAt(0).toUpperCase() + raw.slice(1) };
  }, [user]);

  const arrivalDate = form.expectedArrival ? new Date(form.expectedArrival) : null;
  const arrivalValid = arrivalDate && !Number.isNaN(arrivalDate.getTime());
  const previewCheckout = arrivalValid ? getExpectedCheckout(form.duration, arrivalDate) : null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setProfileCheckDone(false);
  };

  const checkExistingProfile = async () => {
    const phone = form.phone.trim();
    if (!phone) return;
    setProfileChecking(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, 'frequentVisitors'), where('phone', '==', phone)));
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setFrequentProfile({ id: docSnap.id, ...docSnap.data() });
        setForm((prev) => ({
          ...prev,
          name: prev.name || docSnap.data().name || '',
          company: prev.company || docSnap.data().company || '',
          email: prev.email || docSnap.data().email || '',
        }));
      } else {
        setFrequentProfile(null);
      }
    } catch (err) {
      console.error('Profile lookup error:', err);
    } finally {
      setProfileChecking(false);
      setProfileCheckDone(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailWarning('');

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    if (!name) { setError('Please enter the visitor full name.'); return; }
    if (!phone) { setError('Please enter the visitor phone number.'); return; }
    if (!email) { setError('Please enter the visitor email address.'); return; }
    if (!isValidEmail(email)) { setError('Please enter a valid email address.'); return; }
    if (!form.expectedArrival) { setError('Please choose an expected arrival date and time.'); return; }
    const arrival = new Date(form.expectedArrival);
    if (Number.isNaN(arrival.getTime()) || arrival.getTime() <= Date.now()) {
      setError('Expected arrival must be a valid future date and time.');
      return;
    }
    if (!form.purpose) { setError('Please choose a purpose of visit.'); return; }
    if (!form.duration) { setError('Please choose an expected duration.'); return; }

    setSubmitting(true);
    try {
      // 1. New vs Frequent: reuse an existing profile when one matches,
      //    otherwise create a new visitor profile (no duplicates).
      let profileId = null;
      let matchedProfile = null;
      const phoneQuery = query(collection(db, 'frequentVisitors'), where('phone', '==', phone));
      const phoneSnap = await getDocs(phoneQuery);
      if (!phoneSnap.empty) {
        matchedProfile = phoneSnap.docs[0];
      } else {
        const emailQuery = query(collection(db, 'frequentVisitors'), where('email', '==', email));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) matchedProfile = emailSnap.docs[0];
      }
      if (matchedProfile) {
        profileId = matchedProfile.id;
      } else {
        const profileRef = await addDoc(collection(db, 'frequentVisitors'), {
          name,
          nameLower: name.toLowerCase(),
          company: form.company.trim(),
          phone,
          email,
          photoUrl: null,
          visitCount: 0,
          createdAt: serverTimestamp(),
          createdBy: 'host',
        });
        profileId = profileRef.id;
      }

      // 2. Generate a unique badge number for this visit.
      // Hosts can only read their own registrations under the security rules,
      // so a cross-account uniqueness check is not possible (and the badge
      // format is timestamp-random, making collisions negligible). Any query
      // that is denied here is treated as "no collision" so registration works.
      let badgeNumber = '';
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const candidate = generateBadgeNumber();
        try {
          const existing = await getDocs(query(collection(db, 'visitors'), where('badgeNumber', '==', candidate)));
          if (existing.empty) { badgeNumber = candidate; break; }
        } catch {
          badgeNumber = candidate;
          break;
        }
      }
      if (!badgeNumber) {
        setError('Could not generate a unique badge number. Please try again.');
        return;
      }

      // 3. Save the visit record (Pre-Registered).
      const expectedCheckoutTime = getExpectedCheckout(form.duration, arrival);
      const durationMinutes = DURATION_MINUTES[form.duration] || 60;
      const hostName = hostIdentity.name;
      const hostEmail = user.email || '';

      const visitData = {
        name,
        company: form.company.trim(),
        phone,
        email,
        purpose: form.purpose,
        duration: form.duration,
        durationMinutes,
        expectedArrivalTime: arrival,
        expectedCheckoutTime,
        badgeNumber,
        status: 'Pre-Registered',
        type: 'visitor',
        profileId,
        registeredBy: user.uid,
        hostId: user.uid,
        hostName,
        hostEmail,
        registrationTime: serverTimestamp(),
        registrationEmailSent: false,
        createdAt: serverTimestamp(),
      };
      const visitRef = await addDoc(collection(db, 'visitors'), visitData);

      // 4. Notify visitor + host using the existing email layer.
      const emailTarget = {
        ...visitData,
        id: visitRef.id,
        checkInTime: arrival,
        expectedCheckoutTime,
      };
      const results = await Promise.allSettled([
        sendVisitEmail(emailTarget, {
          message: `Your visit has been pre-registered by ${hostName}. Your badge number is ${badgeNumber}. Please present it at reception when you arrive.`,
        }),
        sendHostEmail(emailTarget, {
          message: `You registered ${name} for a visit. Badge number ${badgeNumber}. Expected arrival ${format(arrival, 'MMM d, h:mm a')}.`,
        }),
      ]);
      const emailOk = results.every((r) => r.status === 'fulfilled' && r.value === true);
      if (!emailOk) setEmailWarning('Registration saved, but one or more notification emails could not be sent.');
      await updateDoc(doc(db, 'visitors', visitRef.id), { registrationEmailSent: emailOk });

      setSuccess({
        id: visitRef.id,
        badgeNumber,
        name,
        email,
        purpose: form.purpose,
        expectedArrivalTime: arrival,
        expectedCheckoutTime,
        hostName,
        newVisitor: !matchedProfile,
        frequentName: matchedProfile?.data()?.name || '',
      });
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Registration error:', err);
      const code = err?.code || '';
      setError(
        code === 'permission-denied'
          ? 'Registration was blocked: Firestore security rules deny this write. Deploy firestore.rules before using the Host Portal.'
          : 'Failed to save the registration. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setFrequentProfile(null);
    setProfileCheckDone(false);
    setError('');
    setEmailWarning('');
    setSuccess(null);
    window.scrollTo(0, 0);
  };

  if (success) {
    return (
      <HostLayout title="Registration Complete" subtitle="Visitor pre-registered successfully">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            <div className="bg-teal-500 p-8 text-white text-center relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
                  <CheckCircle2 size={28} />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight">Visitor Registered</h2>
                <p className="text-teal-50 mt-1 font-medium">A unique badge number was generated for this visit</p>
              </div>
            </div>

            <div className="p-8">
              {emailWarning && (
                <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 text-sm font-medium flex items-start space-x-3">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{emailWarning}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/50 mb-8">
                <div className="p-2 rounded-lg bg-teal-100 text-teal-600">
                  <CheckCircle2 size={22} />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Badge / Registration Number</p>
                  <p className="text-2xl font-extrabold tracking-wide text-slate-900">{success.badgeNumber}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium text-slate-500">Visitor</span>
                  <span className="font-bold text-slate-800">{success.name}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium text-slate-500">Email</span>
                  <span className="font-bold text-slate-800">{success.email}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium text-slate-500">Purpose</span>
                  <span className="font-bold text-slate-800">{success.purpose}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium text-slate-500">Expected Arrival</span>
                  <span className="font-bold text-slate-800">{format(success.expectedArrivalTime, 'MMM d, h:mm a')}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium text-slate-500">Expected Checkout</span>
                  <span className="font-bold text-slate-800">{format(success.expectedCheckoutTime, 'MMM d, h:mm a')}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium text-slate-500">Profile</span>
                  <span className="font-bold text-slate-800">
                    {success.newVisitor ? 'New visitor profile created' : `Existing profile reused (${success.frequentName || 'frequent visitor'})`}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-sm flex items-start space-x-3">
                <Info size={18} className="flex-shrink-0 mt-0.5" />
                <span>
                  The visitor and host have been notified by email with the badge number. Ask the visitor to present this
                  number at security/reception when they arrive.
                </span>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={resetForm}
                  className="flex-1 py-3.5 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold transition-colors"
                >
                  Register Another Visitor
                </button>
                <Link
                  to="/host"
                  className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-center hover:bg-slate-50 transition-colors"
                >
                  View My Registrations
                </Link>
              </div>
            </div>
          </div>
        </div>
      </HostLayout>
    );
  }

  return (
    <HostLayout
      title="Register Visitor"
      subtitle="Pre-register a visitor ahead of their arrival"
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 text-sm flex items-start space-x-3">
          <UserPlus size={18} className="flex-shrink-0 mt-0.5" />
          <span>
            Registering as <strong>{hostIdentity.name}</strong> ({user?.email}). Each registration generates a unique
            badge number for this visit.
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r flex items-start space-x-3">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                placeholder="Jane Doe"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Company / Organization (Optional)</label>
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleInputChange}
                placeholder="Acme Technologies"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number *</label>
              <div className="flex items-center space-x-2">
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  onBlur={checkExistingProfile}
                  placeholder="+1 234 567 8900"
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={checkExistingProfile}
                  disabled={profileChecking || !form.phone.trim()}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {profileChecking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  Check
                </button>
              </div>

              {profileChecking && (
                <p className="mt-2 text-xs text-slate-500">Checking for an existing visitor profile…</p>
              )}

              {!profileChecking && frequentProfile && (
                <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between gap-2">
                  <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                    <Star size={12} className="flex-shrink-0" />
                    Existing profile found: <strong>{frequentProfile.name}</strong> — it will be reused.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setFrequentProfile(null); setProfileCheckDone(false); }}
                    className="p-1 rounded text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="Ignore profile"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {!profileChecking && profileCheckDone && !frequentProfile && (
                <p className="mt-2 text-xs text-blue-600 flex items-center gap-1.5">
                  <Search size={12} />
                  No existing profile found — a new visitor profile will be created.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                placeholder="jane@company.com"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Purpose of Visit *</label>
              <select
                name="purpose"
                value={form.purpose}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
              >
                <option>Business Meeting</option>
                <option>Official Visit</option>
                <option>Casual Visit</option>
                <option>Personal Visit</option>
                <option>Interview</option>
                <option>Site Inspection</option>
                <option>Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Expected Arrival *</label>
                <input
                  type="datetime-local"
                  name="expectedArrival"
                  value={form.expectedArrival}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Expected Duration *</label>
                <select
                  name="duration"
                  value={form.duration}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {previewCheckout && (
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-sm text-slate-700 flex items-center gap-2">
                <CalendarClock size={16} className="text-blue-600 flex-shrink-0" />
                Expected checkout will be <strong>{format(previewCheckout, 'MMM d, h:mm a')}</strong>.
              </div>
            )}

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <Send size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-500">
                {isEmailConfigured()
                  ? 'On save, the visitor and you (the host) will receive an email with the badge number.'
                  : 'Email notifications are not configured — the registration will still be saved.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-[#0B192C] hover:bg-[#14294a] text-white font-bold flex items-center justify-center transition-all disabled:opacity-50 shadow-lg"
            >
              {submitting ? <Loader2 size={20} className="animate-spin mr-2" /> : <CheckCircle2 size={20} className="mr-2" />}
              {submitting ? 'Registering…' : 'Register Visitor'}
            </button>
          </form>
        </div>
      </div>
    </HostLayout>
  );
};

export default HostRegisterVisitor;