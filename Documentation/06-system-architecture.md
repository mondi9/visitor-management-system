# 6. System Architecture

## 6.1 Overview

VMS is a **client-side rendered single-page application** backed by **Firebase
(Cloud Firestore)**. The browser is the primary compute layer: all state, UI flow, and
data reads/writes happen in React. A small set of **Firebase Cloud Functions** was written
for scheduled email reminders, but these are **not wired into the deployed (Netlify)
infrastructure** and are not currently running.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React SPA)                         │
│                                                                     │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────────┐  │
│  │ CheckInForm  │──▶│ DigitalBadge  │──▶│ FrequentVisitorLookup  │  │
│  └──────────────┘   └───────────────┘   └────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  AdminDashboard  ·  FrequentVisitorsDashboard  ·  Sidebar     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────────────┐   │
│  │ React Router │   │ Tailwind / CSS │   │ ThemeContext         │   │
│  │  (v7)        │   │  variables     │   │  (dark/light)        │   │
│  └──────────────┘   └────────────────┘   └──────────────────────┘   │
└───────────────┬───────────────────────────────────────┬────────────┘
                │ SDK calls (browser)                   │ REST (client)
                ▼                                       ▼
        ┌───────────────┐   ┌────────────────────────────────────┐
        │  Firestore    │   │  EmailJS  (host arrival emails)   │
        │  (db)         │   └────────────────────────────────────┘
        └───────┬───────┘
                │  (planned, not deployed)
                ▼
        ┌──────────────────────────────┐
        │  Cloud Functions (functions/  │
        │  index.js): checkVisitorExpiry│
        │  · onStayExtended (nodemailer)│
        └──────────────────────────────┘
```

## 6.2 Technology stack

| Layer | Technology | Version (range) | Role |
|-------|-----------|-----------------|------|
| Framework | React | ^19.2.5 | UI and state |
| Build tool | Vite | ^8.0.10 | Dev server, bundling, HMR |
| React plugin | @vitejs/plugin-react (Oxc) | ^6.0.1 | JSX transform |
| Styling | Tailwind CSS (v4) + CSS variables | ^4.2.4 | Utility styling + theming |
| Routing | react-router-dom | ^7.14.2 | SPA routes |
| Icons | lucide-react | ^1.9.0 | Icon set |
| Dates | date-fns | ^4.1.0 | Time formatting |
| Backend/DB | firebase (web SDK) | ^12.12.1 | Firestore |
| Email | @emailjs/browser | ^4.4.1 | Client-side host emails |
| Backend (unused) | firebase-admin / firebase-functions / nodemailer | ^11 / ^4 / ^6 | Planned email/expiry jobs |
| Linting | ESLint (flat config) + react-hooks + react-refresh | ^10 | Static analysis |
| Hosting | Netlify | — | Static deploy + SPA redirects |

## 6.3 Module layout

```
index.html              Vite entry (root div, <script src="/src/main.jsx">)
vite.config.js          Dev port 4000, React + Tailwind plugins
netlify.toml            Build (npm run build), publish dist/, SPA redirect to index.html
src/
  main.jsx              ReactDOM createRoot + ThemeProvider
  App.jsx               Router + route table + CheckInFlow wrapper
  firebase.js           Firebase app init + `export const db` (Firestore)
  index.css             Tailwind import, theme tokens (:root, [data-theme=dark])
  App.css               Unused Vite template styles
  context/ThemeContext.jsx   Dark/light state, persisted to localStorage
  components/
    CheckInForm.jsx           Kiosk wizard (4 steps) + returning lookup trigger
    FrequentVisitorLookup.jsx Phone/name search modal
    DigitalBadge.jsx          Post-check-in badge, print, save-as-frequent
    AdminDashboard.jsx        Live visitor stats + placeholder charts
    FrequentVisitorsDashboard.jsx Profiles table, search, delete modal
    Sidebar.jsx               Admin nav, collapse, brand block
functions/
  index.js              Firebase Cloud Functions (NOT deployed with Netlify)
public/                 favicon, logo.png, icons.svg
```

## 6.4 Data model (Cloud Firestore)

### Collection `visitors`
One document per check-in.

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Visitor's full name |
| `company` | string | Company / organization |
| `phone` | string | Contact phone |
| `email` | string | Contact email |
| `idType` | string | e.g. National ID, Passport |
| `idNumber` | string | Identity document number |
| `hostName` | string | Who they are visiting |
| `hostEmail` | string | Host for notifications |
| `purpose` | string | Purpose of visit |
| `type` | string | `visitor` (or `delivery`, unused in UI) |
| `photoUrl` | string | Base64 data-URL photo |
| `badgeNumber` | string | Unique badge number `VMS-YYYYMMDD-XXXXXX` (client-generated) |
| `checkInTime` | timestamp | Server timestamp on creation |
| `expiryTime` | timestamp | **Never written by app (planned)** |
| `checkOutTime` | timestamp | **Never written by app (planned)** |
| `status` | string | `Active` on creation; others (Checked Out / Overstayed) never set |
| `frequentVisitorId` | string/null | Link to profile if saved |
| `notificationSent` | bool | Used only by (dead) cloud function |

### Collection `frequentVisitors`
One document per recurring visitor.

| Field | Type | Notes |
|-------|------|-------|
| `name`, `nameLower` | string | Display name + lowercase search key |
| `company`, `phone`, `email` | string | Contact details |
| `idType`, `idNumber` | string | ID document |
| `photoUrl` | string | Base64 data-URL |
| `defaultHostName`, `defaultHostEmail` | string | Pre-fill values |
| `defaultPurpose` | string | Pre-fill purpose |
| `visitCount` | number | Incremented per visit (intended) |
| `lastVisit`, `createdAt` | timestamp | Server timestamps |

## 6.5 Key flows

### New visitor check-in
1. Kiosk home → **New Visitor**.
2. Enter details (step 1) → visit/host details (step 2) → capture photo (step 3).
3. Review and agree to terms (step 4) → `addDoc` to `visitors` with `status: 'Active'`,
   a client-generated `badgeNumber`, and a server timestamp (10s timeout with error UX).
4. Optional EmailJS messages to the visitor and host (failures logged, never surfaced).
5. `CheckInFlow` swaps in `DigitalBadge` with the returned visitor object.

### Returning visitor check-in
1. Kiosk home → **Returning Visitor**.
2. Lookup modal queries `frequentVisitors` by phone (exact) then name (prefix).
3. Select a profile → form auto-fills and jumps to step 2.
4. Continues as normal; `frequentVisitorId` is stored on the visit.

### Admin monitoring
1. `AdminDashboard` subscribes with `onSnapshot` to `visitors` ordered by `checkInTime desc`.
2. Client maps timestamps to `Date` objects and recomputes an `Overstayed` status.
3. Live cards + recent table re-render on every Firestore change.

## 6.6 Deployment model (Netlify)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200   # SPA fallback for react-router
```

- **Build:** `npm run build` (Vite) → static assets in `dist/`.
- **Publish:** `dist/`.
- **Routing:** all paths rewritten to `index.html` so React Router handles the URL.
- **Environment note:** Firebase config is read from `VITE_FIREBASE_*` environment
  variables (`.env` / Netlify env vars) — the `.env` file is currently empty and must be
  populated before the app can connect. EmailJS service/template/public-key strings are
  still hardcoded in `CheckInForm.jsx`.

## 6.7 Known architectural gaps

1. **No backend that can run scheduled jobs.** The expiry-notification logic exists as
   Firebase Cloud Functions (`functions/index.js`) but the project is deployed to Netlify,
   which does not execute Firebase Functions. Either adopt Firebase hosting/Cloud
   Functions (with `firebase.json`) or rewrite as Netlify Functions.
2. **No Firestore security rules.** With no rules file, Firestore uses open (public)
   rules; combined with no authentication, any client can read/write all data.
3. **Client-side-only email** (EmailJS) exposes transport config and fails silently.
4. **Photos as base64 strings** inflate Firestore document sizes (approaching the 1 MiB
   limit for large images) — Cloud Storage is the recommended store.
5. **Configuration is unset** — `src/firebase.js` reads env vars, but `.env` is empty so
   the app throws at startup; EmailJS service/template keys remain hardcoded in
   `CheckInForm.jsx`.