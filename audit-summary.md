# VMS Audit — Executive Summary

**Project:** Visitor Management System (VMS)
**Scope:** Redesign from *Visitor Self-Registration* to *Host-Driven Visitor Registration*
**Status:** Audit only — no code was modified

---

## Current Architecture

- **Frontend:** React 19 + Vite 8, Tailwind CSS v4, react-router-dom v7, plain JavaScript (no TypeScript). Icons via lucide-react, dates via date-fns.
- **Backend / Data:** Firebase (Firestore + Auth, Web SDK v12). All logic runs client-side in the browser.
- **Email:** EmailJS, called directly from the browser (keys exposed to clients).
- **Face detection:** face-api.js (tiny-face-detector) runs in-browser for auto photo capture.
- **Backend (unused):** `functions/` contains Firebase Cloud Functions (nodemailer expiry emails) with placeholder credentials. **Not deployed** — the project is hosted on Netlify, which cannot run them.
- **Deployment:** Netlify (`netlify.toml`) with SPA redirects to `index.html`.
- **Configuration:** Firebase + EmailJS credentials are read from `.env` (`VITE_FIREBASE_*`, `VITE_EMAILJS_*`) and are currently set.

**Firestore collections:** `visitors`, `frequentVisitors`, `hosts`, `contractors`, `deliveries`, `preRegistrations`, `users`, `appSettings`.

## Current Workflow (Visitor Self-Registration)

1. Visitor starts at a public kiosk (no login required) and selects **New Visitor** or **Returning Visitor**.
2. Four-step wizard: Personal Details → Visit/Host Details → Photo Capture (auto-capture on face detection) → Confirm + consent.
3. On submit, one `visitors` document is created with `status: 'Active'` and a client-generated badge number (`VMS-YYYYMMDD-XXXXXX`).
4. EmailJS sends a confirmation to the visitor; host is emailed when configured.
5. A digital badge is displayed with print and "Save as Frequent Visitor" options.
6. Admin portal live-monitors all visitors and offers manual **Extend** and **Check Out** actions.

Registration, identity entry, photo, and check-in all happen in a single kiosk transaction. There is no separation of *booking* and *arrival*, no host-initiated registration, and no dedicated reception workflow.

## Reusable Components (REUSE)

| Asset | Value to the redesign |
|-------|------------------------|
| `AuthContext`, `AdminRoute`, `AdminLogin`, `ResetPassword` | Complete Firebase Auth stack (sign-in, sign-up, role load, password recovery) — extend with a Host role |
| `lib/roles.js` + `ROUTE_ACCESS` | Role model and route guard matrix — extend with a Host role |
| `Sidebar`, `AdminLayout` | Admin portal shell (navigation, header, responsive) |
| `AdminDashboard`, `AdminVisitors`, `AdminReports` | Analytics, history table, and CSV export (rebuild queries against the new status model) |
| `ExtendVisitModal`, `StayMonitor` | Visit extension and expiry-reminder logic |
| `lib/visitUtils.js`, `lib/settings.js` | Duration/status helpers and app settings |
| `lib/email.js` | EmailJS wrapper (keep as client fallback or port server-side) |
| Camera + face-capture logic (in `CheckInForm`) | Extract into a reusable photo-capture component for reception check-in |
| `firestore.rules` structure | Role helper functions (`isSignedIn`, `getRole`, `isStaff`) to extend |
| CSS token/theme system, Tailwind v4 | Keep as the design foundation |

## Components Requiring Modification (MODIFY)

- **`AdminHosts`** — becomes the core registration driver: book visitors against a host and show a host's visitors.
- **`AdminPreRegistrations`** — align with the host-driven booking lifecycle (badge + QR generated at booking time).
- **`DigitalBadge`** — add QR code, pre-arrival "expected" badge state, and registration number.
- **`App.jsx`** — add `/host/*` and reception routes.
- **`StayMonitor`** — adapt to the new status enum (`Pre-Registered` → `Checked In` → `Checked Out`).
- **`AdminNotifications`** — notification history for registration, arrival, check-in, and check-out.
- **`firestore.rules`** — add Host role, host write rules, reception check-in rules.
- **`roles.js` / `AuthContext`** — add the Host role and host account creation.

## Components Requiring Rebuild (REBUILD)

- **Host registration workflow** — host logs in, registers a visitor (purpose, duration, expected arrival), submits, and a badge + QR is generated with confirmation emails.
- **Reception check-in flow** — search pre-registered visitor → verify ID (record verifier) → capture photo → check in → notify host. No equivalent exists today.
- **Badge generation with QR** — no QR library is present; needs new generation logic and a stored, scannable payload.
- **Host portal / dashboard** — hosts log in to see their registrations, arrival status, and check-in confirmations.
- **Check-out flow** — today only a manual admin button; needs reception/host/auto options with timestamps.
- **Photo storage** — base64-in-Firestore is near the 1 MiB limit; move to Firebase Storage with download URLs.

**Remove:** kiosk self-registration entry, `OnboardingGuide`, returning-visitor fast check-in (`FrequentVisitorLookup` / `FrequentVisitorsDashboard`), the dead `functions/` Cloud Functions, and unused fields (`expiryTime`, `notificationSent`).

## Database Changes Required

- **Unify the visit lifecycle** in one collection (prefer `visitors`): status enum `Pre-Registered` → `Checked In` → `Checked Out`.
- **`visitors` additions:** `registeredBy` (host uid), `hostId`, `hostName`, `hostEmail`, `registrationTime`, `expectedArrivalTime`, `badgeCode`/`qrPayload`, `idVerified`, `idVerifiedBy`, `idVerifiedAt`, `checkInBy`, `checkOutBy`, `checkOutTime`, `photoPath` (Storage), and per-stage email flags (`registrationEmailSent`, `hostArrivalEmailSent`, `checkInEmailSent`, `checkOutEmailSent`).
- **`preRegistrations`:** merge into the `visitors` lifecycle or add `hostId`, `registeredBy`, `badgeCode`, `qrPayload`.
- **`users`:** allow `role: 'host'`; link `hostId` to a `hosts` record.
- **`hosts`:** add `userId`/`hostUid` to bind a directory record to a login.
- **`notifications` (new):** log every email sent (to, type, visitorId, timestamp, status).
- **Firebase Storage:** new bucket for visitor photos (SDK not yet initialized).
- **Composite indexes:** add `status + expectedCheckoutTime`, `registeredBy + registrationTime`, `hostId + checkInTime` (index file is currently empty).

## Security Changes Required

- **Add the Host role** to `roles.js`, `ROUTE_ACCESS`, rule helpers, and labels.
- **Firestore rules:**
  - `visitors`: host may create and update their own pre-registered records; reception/security/super-admin read-all, check-in, check-out, and verify ID; restrict delete.
  - `preRegistrations`: host reads/writes own; staff all.
  - `hosts`: host reads own; super-admin manages all.
  - `users`: allow self-create with `role: 'host'` (or super-admin-assigned); prevent self-elevation.
  - **Remove public `create` on `visitors`** once kiosk self-registration is retired.
- **Move email server-side** — EmailJS keys are exposed in the browser; registration/arrival/check-in emails should be triggered by a serverless function (Netlify Function or Firebase Function), with a notification log.
- **Storage rules** for visitor photos (authenticated read, host/staff write).

## Recommended Implementation Order

1. **Schema + rules + roles** — unify the visit status model, add Host role, write Firestore rules and indexes, create first host accounts.
2. **Host registration** — host portal: register visitor → badge + QR generated → saved as `Pre-Registered`.
3. **Notification service** — server-side email for registration and confirmations, with a notification log.
4. **Reception check-in** — search pre-registered → ID verify → photo capture → `Checked In` → host notified.
5. **Badge + QR** — render badges for pre-registered and checked-in states with a scannable QR.
6. **Check-out** — reception/host/auto check-out with timestamps and notifications.
7. **Reporting** — rebuild dashboards and reports on the new lifecycle (bookings, arrivals, on-site, durations, exports).
8. **Cleanup** — remove kiosk self-registration, dead Cloud Functions, and obsolete fields.