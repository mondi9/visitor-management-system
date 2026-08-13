# 10. Known Issues

Living register of open defects and risks, ordered by severity. Cross-references the
detailed code review in [`PROJECT_ANALYSIS.md`](../PROJECT_ANALYSIS.md) and the feature
status matrix in [`05-features.md`](./05-features.md).

## 10.1 Blocking

| # | Issue | Location |
|---|-------|----------|
| B1 | **Firebase is unconfigured.** `.env` contains only empty `VITE_FIREBASE_*` values, so `firebase.js` throws at startup and no check-in or admin view can read/write data. | `.env`, `src/firebase.js` |
| B2 | **No Firestore security rules and no authentication.** Anyone with network access can read/write all visitor PII (name, phone, ID number, photo). | whole app |
| B3 | **Admin console is fully open.** `/admin` has no login; the "Sign Out" button is decorative. | `Sidebar.jsx`, `App.jsx` |

## 10.2 High

| # | Issue | Location |
|---|-------|----------|
| H1 | `expiryTime`, `checkOutTime`, and `notificationSent` are never written, so expiry badges, `Overstayed` status, "Checked Out Today", and the cloud-function queries never match real data. | `CheckInForm.jsx`, `AdminDashboard.jsx`, `functions/index.js` |
| H2 | **No check-out flow exists.** Status only ever equals `Active`; on-site stats are unreliable. | app-wide |
| H3 | **Cloud functions are not deployable on Netlify.** Written as Firebase Cloud Functions (`pubsub`, Firestore triggers), but the project deploys to Netlify; no `firebase.json` exists. | `functions/index.js`, `netlify.toml` |
| H4 | `onStayExtended` calls `newValue.expiryTime.toMillis()` unguarded — throws on any update because `expiryTime` is undefined. | `functions/index.js:73` |
| H5 | `checkVisitorExpiry` needs a Firestore composite index (3-field `where`), uses placeholder Gmail credentials, and would reject its `Promise.all` on send failure. | `functions/index.js:25-28` |
| H6 | **Email failures are silent.** EmailJS errors are only `console.error`'d; a successful check-in can silently omit the host/visitor notification. | `CheckInForm.jsx:182-201` |
| H7 | EmailJS service/template/public key strings are hardcoded in the client bundle (not env vars). | `CheckInForm.jsx:172-198` |

## 10.3 Medium

| # | Issue | Location |
|---|-------|----------|
| M1 | Admin routes `/admin/visitors`, `/admin/notifications`, `/admin/settings` all map to the identical `AdminDashboard` (URL ignored). | `App.jsx` |
| M2 | Sidebar links to `/admin/pre-registrations`, `/admin/hosts`, `/admin/contractors`, `/admin/deliveries`, `/admin/reports`, `/admin/users` render blank pages (no routes). | `Sidebar.jsx`, `App.jsx` |
| M3 | **Hardcoded dashboard data** — "12%/8%/5% vs yesterday", SVG trend chart, purpose donut, Top Visiting Hosts, and Site Summary numbers (256 employees, 9 deliveries…) are fake. | `AdminDashboard.jsx:100,128,142,182-187,257-284` |
| M4 | Recent Visitors table reads `visitor.photo` (never stored) so photos never show; `visitor.name.charAt(0)` assumes a name is present. | `AdminDashboard.jsx:224` |
| M5 | `visitCount` is initialised to 1 but never incremented on repeat check-ins, so "total repeat visits" stats undercount. | `DigitalBadge.jsx:38` |
| M6 | Camera stream is not stopped on unmount or when navigating back from the photo step; the camera light can stay on. | `CheckInForm.jsx` |
| M7 | `window.print()` prints the entire page; no `@media print` stylesheet for a clean badge printout. | `DigitalBadge.jsx:170` |
| M8 | Firestore write timeout uses `Promise.race` — a timed-out request can still complete server-side, and a retry may create a duplicate visitor record. | `CheckInForm.jsx:11-17,140-150` |
| M9 | `badgeNumber` uses `Math.random()` (not cryptographic) and is generated client-side; collisions are unlikely but unguarded. | `CheckInForm.jsx:19-26` |
| M10 | Lint fails: 14 `no-unused-vars` errors in `AdminDashboard.jsx`. | `AdminDashboard.jsx:3-12` |

## 10.4 Low / polish

| # | Issue | Location |
|---|-------|----------|
| L1 | Weak input validation — no format checks for email, phone, or ID number. | `CheckInForm.jsx` |
| L2 | Dark-mode toggle exists in `ThemeContext` but no UI control calls it. | `ThemeContext.jsx` |
| L3 | Brand inconsistency — "SecurePass" (title), "VMS" (kiosk/sidebar), "VisitorPro Management" (badge footer). | `index.html`, `CheckInForm.jsx`, `DigitalBadge.jsx` |
| L4 | `delivery` visitor type exists in the model but has no user-facing option. | `CheckInForm.jsx` |
| L5 | Dead code: unused imports, `App.css`, leftover template assets (`react.svg`, `vite.svg`, `hero.png`, `icons.svg`). | various |
| L6 | Main JS bundle 580 kB (gzip 175 kB) — above Vite's 500 kB warning; no code-splitting. | build output |
| L7 | `App.css` is unused template boilerplate. | `src/App.css` |
