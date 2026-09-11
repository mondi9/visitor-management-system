export const DURATION_OPTIONS = ['30 Minutes', '1 Hour', '2 Hours', '4 Hours', 'Full Day'];

export const DURATION_MINUTES = {
  '30 Minutes': 30,
  '1 Hour': 60,
  '2 Hours': 120,
  '4 Hours': 240,
  'Full Day': 480,
};

export const EXPIRY_WARNING_MS = 15 * 60 * 1000;

export const getDurationMinutes = (duration) => DURATION_MINUTES[duration] || 60;

export const getExpectedCheckout = (duration, from = new Date()) => {
  const minutes = getDurationMinutes(duration);
  return new Date(from.getTime() + minutes * 60 * 1000);
};

export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
};

export const getRemainingMs = (expectedCheckoutTime, now = new Date()) => {
  const expiry = toDate(expectedCheckoutTime);
  if (!expiry) return null;
  return expiry.getTime() - now.getTime();
};

export const getVisitStatus = (visitor, now = new Date()) => {
  if (visitor.status === 'Pre-Registered') return 'Pre-Registered';
  if (visitor.status === 'Checked Out' || visitor.checkOutTime) return 'Checked Out';
  const remaining = getRemainingMs(visitor.expectedCheckoutTime, now);
  if (remaining === null) return 'Checked In';
  if (remaining <= 0) return 'Expired';
  if (remaining <= EXPIRY_WARNING_MS) return 'Expiring Soon';
  return 'Checked In';
};

export const formatRemaining = (ms) => {
  if (ms === null || ms === undefined) return '—';
  if (ms <= 0) return 'Expired';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const STATUS_STYLES = {
  'Pre-Registered': 'bg-blue-50 text-blue-600',
  'Checked In': 'bg-emerald-50 text-emerald-600',
  'Expiring Soon': 'bg-amber-50 text-amber-600',
  Expired: 'bg-rose-50 text-rose-600',
  'Checked Out': 'bg-slate-100 text-slate-500',
};
