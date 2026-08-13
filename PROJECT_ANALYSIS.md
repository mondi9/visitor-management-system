# PROJECT_ANALYSIS.md

## 1. What the application does

**SecurePass / VMS — Visitor Management System** is a web application for managing
visitor access at a facility. It is built around a kiosk-style self check-in flow
and an admin console:

- A visitor (or guard) starts at a kiosk home screen and can either check in as a
  **New Visitor** or look up a **Returning Visitor** for a fast check-in.
- The check-in flow collects personal details, host/visit details, a webcam photo,
  and a consent checkbox, then creates a visitor record in Firestore and displays a
  printable **Digital Badge**.
- After check-in, a visitor profile can be saved as a **Frequent Visitor** so the next
  visit can be done with a couple of taps.
- An **Admin Dashboard** shows visitor statistics and recent visitors.
- A **Frequent Visitors dashboard** lists registered profiles with search and delete.
- Cloud functions were intended to email hosts/visitors when a stay is near expiry.

Some parts are stubbed/incomplete (analytics numbers are hardcoded, several admin
sections are placeholders, and the scheduled email functions are not wired up).

## 2. Technology stack

| Layer            | Technology |
|------------------|-----------|
| Framework        | React 19 + Vite 8 (Oxc-based plugin) |
| Styling          | Tailwind CSS v4 (via `@tailwindcss/vite`) + custom CSS variables |
| Routing          | react-router-dom v7 |
| Icons            | lucide-react |
| Dates            | date-fns |
| Database         | Firebase Firestore (web SDK v12) |
| Email (client)   | EmailJS (called directly from the browser) |
| Backend (intended) | Firebase Cloud Functions v4 + firebase-admin 11 + nodemailer |
| Deployment       | Netlify (`netlify.toml`, SPA redirect, `dist/` publish) |
| Linting          | ESLint 10 (flat config, `eslint.config.js`) |
| Language         | JavaScript / JSX (no TypeScript) |

## 3. Folder structure

```
visitor-management-system/
├── index.html                 # Vite entry HTML (root div, logo)
├── vite.config.js             # Vite config (port 4000, React + Tailwind plugins)
├── netlify.toml               # Netlify build/publish + SPA redirect rules
├── eslint.config.js           # Flat ESLint config (ignores dist/ and functions/)
├── package.json               # Frontend deps/scripts
├── functions/                 # (Intended) Firebase Cloud Functions
│   ├── package.json           #   firebase-admin, firebase-functions, nodemailer
│   └── index.js               #   checkVisitorExpiry (pubsub) + onStayExtended (firestore)
├── public/
│   ├── favicon.svg, icons.svg, logo.png
└── src/
    ├── main.jsx               # React entry, ThemeProvider wrapper
    ├── App.jsx                # Routes: /, /admin/*, /admin/frequent-visitors
    ├── firebase.js            # Firebase init + Firestore db export (config hardcoded)
    ├── index.css              # Tailwind import + light/dark CSS token themes
    ├── App.css                # Leftover boilerplate styles (unused)
    ├── context/
    │   └── ThemeContext.jsx   # Dark/light theme provider (toggle never used in UI)
    ├── assets/                # hero.png, react.svg, vite.svg (mostly unused)
    └── components/
        ├── CheckInForm.jsx            # 4-step kiosk check-in + returning visitor modal
        ├── FrequentVisitorLookup.jsx  # Phone/name lookup modal (Firestore query)
        ├── DigitalBadge.jsx           # Post-check-in badge (photo, time, print, save-as-frequent)
        ├── AdminDashboard.jsx         # Stats dashboard (static/fake data)
        ├── FrequentVisitorsDashboard.jsx  # Profiles table, search, delete, confirm modal
        └── Sidebar.jsx                # Admin navigation (10 entries, several dead links)
```

## 4. Existing features

**Kiosk / check-in**
- New Visitor vs Returning Visitor entry screen.
- Multi-step wizard with a visual stepper (Details → Visit → Photo → Confirm).
- Returning-flag visitor lookup by exact phone or name prefix (Firestore `where`).
- Auto-fill of personal/visit details from a matched frequent-visitor profile (skips to step 2).
- Webcam photo capture via `getUserMedia` with canvas snapshot, retake support.
- Consent checkbox required before submit.
- Creates Firestore `visitors` doc with `status: 'Active'`, `checkInTime` (server timestamp).
- Optional EmailJS notification to the host on check-in.

**Badge**
- Digital badge with photo/logo, name, purpose, host, arrival time, expiry.
- Print badge via `window.print()`.
- "Save as Frequent Visitor" (deduplicates by phone number), creates `frequentVisitors` doc
  with `nameLower`, defaults, `visitCount: 1`, `lastVisit`.

**Frequent visitors**
- Kiosk fast check-in via lookup modal.
- Admin dashboard: stat cards, search (name/company/phone), delete with confirmation modal.

**Admin**
- Dashboard with "Total Visitors" / "On-Site" / "Checked In Today" / "Checked Out Today" cards.
- Recent visitors table (top 5), a trend chart, purpose chart, top hosts list, site summary.
- Live clock, "current time" refresh.

**Other**
- Light/dark theme token system (`data-theme`), persisted to `localStorage`.
- Netlify SPA redirect config.
- (Intended) Cloud functions for expiring-stay emails.

## 5. Missing features

- **Authentication / authorization** — there is no login. `/admin` (and all admin data) is
  fully open; the "Sign Out" button in the sidebar is decorative.
- **Check-out flow** — nothing ever marks a visitor as *Checked Out* or stores
  `checkOutTime`. Status only ever equals `'Active'`.
- **Expiry enforcement** — `expiryTime` is never set during check-in, so the "Expires"
  badge, the `Overstayed` logic, and the expiry-notification functions never fire.
- **Most admin sections** — Visitors, Pre-Registrations, Hosts, Contractors, Deliveries,
  Reports, User Management routes render blank or an empty dashboard (see Bugs).
- **Real analytics** — trend chart, purpose chart, top hosts, "vs yesterday" percentages,
  employees/contractors/expected/deliveries counts are all hardcoded static values.
- **Working notifications** — the bell icon is decorative; there is no notifications page;
  the cloud function emails are non-functional (config placeholders + runtime mismatch).
- **Dark mode toggle UI** — `toggleTheme` exists in the context but no component calls it.
- **QR code on badges**, badge re-printing lookup (retrieve a past badge), check-in history search.
- **Pre-registration** (book a visit ahead of time).
- **Pagination / search / export / reports**, CSV/PDF export of visitor data.
- **Photo storage** — photos are saved only as small base64 data-URLs in Firestore.
- **Testing** — no unit/component/E2E tests.
- **TypeScript**, environment-variable config, error boundaries, loading skeletons.
- **README** only contains the default Vite template text (no project docs or setup).

## 6. Bugs and issues

1. **BLOCKING — Check-in "Confirm" screen crashes.**
   `CheckInForm.jsx` renders `<UserCheck>` (line 448) and `<ClipboardList>` (line 452)
   but neither icon is imported (import on line 5 only brings in `User, Truck, Camera,
   Check, ChevronRight, CheckCircle2, ChevronLeft, Loader2, Star`). Reaching Step 4 throws
   a `ReferenceError`, so nobody can finish a check-in.

2. **Badge photo never shows.**
   `CheckInForm.jsx:146` passes `photoUrl`, but `DigitalBadge.jsx:61` reads `visitor.photo`
   (undefined) → the placeholder logo is always shown instead of the captured photo.

3. **`expiryTime` / `checkOutTime` / `notificationSent` are written nowhere.**
   They are only read in `AdminDashboard`, `DigitalBadge`, and `functions/index.js`, so
   expiry badges, `Overstayed` status, "Checked Out Today" stats, and the Cloud Function
   queries can never match any real data.

4. **Cloud Functions won't run as deployed.**
   The repo is a Netlify project, but `functions/index.js` uses Firebase Functions
   (`pubsub.schedule`, Firestore triggers) which are not Netlify Functions. Netlify auto-
   serves `functions/` expecting `@netlify/functions` handlers. There is no `firebase.json`,
   so deploying this to Firebase was never configured either.

5. **`onStayExtended` crashes on undefined `expiryTime`.**
   `functions/index.js:73` calls `newValue.expiryTime.toMillis()` on every update; since
   `expiryTime` is never set (see #3), it throws and breaks the trigger.

6. **`checkVisitorExpiry` needs a composite index and can never match.**
   The triple `where('status',...).where('expiryTime',...).where('notificationSent',...)`
   requires a Firestore composite index, and `expiryTime` is never populated. Also it runs
   `every 5 minutes` (GCP pubsub) — the Gmail credentials are placeholders
   (`your-email@gmail.com`), so `sendMail` would fail and `Promise.all` would reject.

7. **Dead admin links render a blank page.**
   `Sidebar.jsx` links to `/admin/pre-registrations`, `/admin/hosts`, `/admin/contractors`,
   `/admin/deliveries`, `/admin/reports`, `/admin/users` — none are defined in `App.jsx`,
   so React Router renders nothing.

8. **All admin views are the same component.**
   `/admin`, `/admin/visitors`, `/admin/notifications`, `/admin/settings` all route to
   `AdminDashboard`, which ignores the URL, so every menu item shows the identical dashboard.

9. **No authentication → wide-open data.**
   Visitor PII (name, phone, email, ID number, photo) is readable/writable by anyone who
   knows the Firebase project. There are **no Firestore security rules** in the repo and no
   Firebase Auth, so the default (open) rules apply.

10. **Secrets hardcoded in client bundles.**
    Firebase config (`src/firebase.js`) and EmailJS service/template/public key
    (`CheckInForm.jsx`) are committed in source — no env vars / `.env`.

11. **Hardcoded fake dashboard data.**
    "12%/8%/5% vs yesterday", the SVG trend chart, the purpose donut, "Top Visiting Hosts",
    and the Site Summary numbers (256 employees, 9 deliveries, …) are static and misleading.

12. **Unused imports / dead code.**
    `AdminDashboard.jsx` imports `differenceInMinutes, addMinutes, Timer, AlertTriangle,
    doc, updateDoc, serverTimestamp, Search, UserX, Clock, Plus` (never used);
    `CheckInForm.jsx` imports `CheckCircle2` (unused); `App.css` is leftover template CSS;
    `src/assets/react.svg`, `hero.png`, `vite.svg`, `public/icons.svg` are unused.

13. **Camera stream not cleaned up on unmount.**
    `startCamera` starts a `getUserMedia` stream that is only stopped via `stopCamera`.
    Leaving the step without capturing (e.g., back button) keeps the camera light on.

14. **Deliveries type exists but is unreachable.**
    `visitorType` supports `'delivery'`, but the kiosk only offers visitor check-in.

15. **Email failure is silent.**
    Host notification errors are swallowed (`CheckInForm.jsx:141-143`) — the check-in
    succeeds but the host is never told.

16. **Weak/no validation.**
    No format checks for email, phone, or ID number; minimal required-field checks done
    inside click handlers (the form itself uses `required` but submit is a manual button).

17. **Brand inconsistency.**
    `index.html` title is "SecurePass", kiosk shows "VMS", badge footer says "Powered by
    VisitorPro Management".

18. **Native `window.print()` prints the whole page**, with no print stylesheet — the badge
    renders alongside backgrounds/sidebars in awkward ways on paper.

## 7. Improvements that can be made

- **Fix the blocking bugs first**: add `UserCheck`/`ClipboardList` imports, map
  `photoUrl` in `DigitalBadge`, then rebuild to confirm the check-in flow completes and the
  badge shows the photo.
- **Add authentication** (Firebase Auth) and protect all `/admin/*` routes with a
  guard + role check; wire the Sign Out button to actually sign out.
- **Write Firestore security rules** (`firestore.rules`) restricting writes to
  authenticated admins and check-in app code paths, and allow-list collection access.
- **Move secrets to environment variables** (`.env` / Netlify env vars) for Firebase config
  and EmailJS keys; never commit keys.
- **Implement the check-out flow**: guard action (or auto check-out) that sets
  `status: 'Checked Out'` and `checkOutTime`.
- **Set `expiryTime` on check-in** (e.g., default visit window, configurable) so expiry
  badges, `Overstayed` detection, and the notification functions actually work.
- **Move email sending server-side** (Cloud Function / serverless) instead of EmailJS in the
  browser; add error handling so failures are retried/logged, and don't crash other triggers
  when `expiryTime` is missing (guard with optional chaining).
- **Reconcile deployment**: either properly set up Firebase (add `firebase.json`, runtime
  `engines`, Firebase Functions config) or rewrite the scheduled/expiry logic as Netlify
  Functions with `netlify.toml [functions]` config.
- **Implement the missing admin pages or remove dead nav items**; make routes distinct
  (Visitors, Notifications, Settings) rather than mapping them all to one dashboard.
- **Make dashboard data real** — compute trends/donuts/top-host lists from Firestore
  queries (or aggregations) instead of hardcoding; add date-range filters.
- **Wire the dark-mode toggle** into the sidebar/header using `useTheme`.
- **Clean up dead code**: remove unused imports, `App.css`, leftover template assets.
- **Add UX hardening**: stop cameras on unmount, add error boundaries, loading skeletons,
  empty/error states, reachable "delivery" check-in, and validation (email/phone/ID).
- **Add a print stylesheet** for badges (`@media print`) so only the badge is printed.
- **Add tests** (Vitest + React Testing Library) for the check-in wizard, badge rendering,
  and admin stats; add lint/formatters to CI.
- **Improve docs**: replace the README template with real setup, env var list, Firebase/
  Netlify deployment steps, and a data-model description.