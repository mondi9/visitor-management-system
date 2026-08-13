import emailjs from '@emailjs/browser';
import { format } from 'date-fns';
import { toDate } from './visitUtils';

const EMAIL_TIMEOUT_MS = 10000;

const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

if (EMAILJS_CONFIG.publicKey) {
  emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
}

export const isEmailConfigured = () =>
  Boolean(EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId && EMAILJS_CONFIG.publicKey);

const withTimeout = (promise, ms = EMAIL_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Email request timed out after ${ms}ms`)), ms)
    ),
  ]);

export const sendEmail = async (params) => {
  if (!isEmailConfigured()) {
    console.warn('EmailJS is not configured — skipping email.');
    return false;
  }
  const { to_email } = params;
  if (!to_email) return false;

  await withTimeout(
    emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, params),
    EMAIL_TIMEOUT_MS
  );
  return true;
};

const formatTime = (value) => {
  const date = toDate(value);
  return date ? format(date, 'MMM d, h:mm a') : '—';
};

export const buildStayParams = (visitor, { to_email, to_name, message = '', checkoutOverride } = {}) => {
  const checkout = checkoutOverride || visitor.expectedCheckoutTime;
  return {
    email: to_email || visitor.email,
    to_email: to_email || visitor.email,
    to_name: to_name || visitor.name,
    visitor_name: visitor.name || '',
    badge_number: visitor.badgeNumber || '',
    host_name: visitor.hostName || '',
    purpose: visitor.purpose || '',
    duration: visitor.duration || '30 Minutes',
    checkin_time: formatTime(visitor.checkInTime),
    checkout_time: formatTime(checkout),
    message,
  };
};

export const sendVisitEmail = (visitor, { message = '', checkoutOverride } = {}) =>
  sendEmail(buildStayParams(visitor, { message, checkoutOverride }));

export const sendHostEmail = (visitor, { message = '', checkoutOverride } = {}) =>
  sendEmail(
    buildStayParams(visitor, {
      to_email: visitor.hostEmail,
      to_name: visitor.hostName || 'Host',
      message,
      checkoutOverride,
    })
  );