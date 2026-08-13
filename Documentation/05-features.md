# 5. Features

> **Reading note:** each feature is labelled **Working**, **Partial**, or **Broken** based
> on the code review in [`PROJECT_ANALYSIS.md`](../PROJECT_ANALYSIS.md).

## 5.1 Kiosk & check-in flow

### Home / welcome screen — *Working*
- Facility-branded landing screen with dark hero background and abstract blobs.
- Two primary actions: **New Visitor** and **Returning Visitor**.
- Discreet link to the **Admin Portal** (should be gated by auth in production).

### Multi-step check-in wizard — *Working*
A 4-step flow with a visual stepper on the left (desktop):

1. **Your Details** — name (required), company, phone (required), email, ID type, ID number.
2. **Visit Details** — host name (required), host email, purpose of visit (select).
3. **Photo Capture** — webcam viewfinder overlay, capture/retake, live stop/start.
4. **Confirm & Print** — review summary, consent checkbox (required), submit. (The former
   missing-icon crash was fixed.)

Superset behaviour:
- Validation is minimal (required name/phone/host, must agree to terms).
- A unique **badge number** (`VMS-YYYYMMDD-XXXXXX`) is generated client-side on submit.
- A `visitors` document is created with `status: 'Active'`, the badge number, and a server
  timestamp; the write has a 10-second timeout with a user-friendly error message.
- **EmailJS** notifications are sent to the **visitor** and the **host** (errors are
  silently swallowed — only logged to the console).

### Returning-visitor lookup — *Working*
- Modal search by **phone number (exact)** or **name (prefix, case-insensitive)**.
- Results show avatar, company, visit count, and last visit date.
- Selecting a profile pre-fills the form (including default host/purpose) and skips
  straight to **Visit Details**.

## 5.2 Digital badge — *Working*
- Shows the captured visitor photo, name, purpose, host, arrival time, and the **badge
  number**; optional expiry time.
- **Print badge** button (`window.print()` — no dedicated print stylesheet yet).
- **Save as Frequent Visitor** creates a profile (deduplicated by phone) with
  `visitCount: 1`, `lastVisit`, and a lowercase name for search.
- ⚠️ *Note:* the badge-photo field mismatch (`visitor.photo` → `visitor.photoUrl`) that hid
  the captured photo has been fixed.

## 5.3 Frequent visitors — *Working*
- **Save** from badge (auto-dedupe by phone).
- **Fast check-in** on the kiosk via lookup.
- **Admin dashboard** (`/admin/frequent-visitors`):
  - Stat cards: registered profiles, total repeat visits, average visits per profile.
  - Searchable table (name, company, phone) with avatar, contact, default host, visits,
    last visit.
  - Delete with confirmation modal.

## 5.4 Admin dashboard — *Partial*
- **Live Firestore subscription** (`onSnapshot`) on `visitors`.
- Stat cards: Total Visitors, Currently On-Site, Checked In Today, Checked Out Today.
- Recent Visitors table (top 5).
- **Static/placeholder widgets:** visitor trend chart, visitors-by-purpose donut, top
  hosts, and site summary figures are **hardcoded**, not computed from data.
- Header shows current date; "current time" ticks every minute.
- ⚠️ *Notes:* no check-out control, no filtering/pagination; "12% vs yesterday" etc. are fake.

## 5.5 Navigation & theming — *Partial*
- **Sidebar** (admin): responsive, collapsible, with 10 menu items. Several links point to
  routes that do not exist (blank pages) — see §5.6.
- **Theme system**: light/dark tokens via `data-theme` on `<html>`, persisted to
  `localStorage`. ⚠️ The `toggleTheme()` function is **not wired to any UI control**.

### 5.5.1 Routing map

| Route | Component | State |
|-------|-----------|-------|
| `/` | CheckInFlow (CheckInForm → DigitalBadge) | Works |
| `/admin` | AdminDashboard | Works (single view) |
| `/admin/visitors` | AdminDashboard | **Duplicate — same empty dashboard** |
| `/admin/notifications` | AdminDashboard | **Duplicate — not implemented** |
| `/admin/settings` | AdminDashboard | **Duplicate — not implemented** |
| `/admin/frequent-visitors` | FrequentVisitorsDashboard | Works |
| `/admin/pre-registrations`, `/admin/hosts`, `/admin/contractors`, `/admin/deliveries`, `/admin/reports`, `/admin/users` | *(no route defined)* | **Blank page** |

## 5.6 Feature-by-feature matrix

| Feature | Component(s) | Status |
|---------|--------------|--------|
| Kiosk home screen | CheckInForm (step 0) | Working |
| New visitor details step | CheckInForm (step 1) | Working |
| Visit details step | CheckInForm (step 2) | Working |
| Webcam capture | CheckInForm (step 3) | Working |
| Badge number generation | CheckInForm / DigitalBadge | Working (client-side) |
| Confirm & submit | CheckInForm (step 4) | **Working (import fix applied)** |
| Host / visitor email alert | CheckInForm (EmailJS) | Partial (silent failure) |
| Digital badge | DigitalBadge | Working (photo fix applied) |
| Print badge | DigitalBadge → `window.print()` | Partial (no print CSS) |
| Save as frequent visitor | DigitalBadge | Working (visitCount not incremented on reuse) |
| Returning-visitor lookup | FrequentVisitorLookup | Working |
| Frequent-visitors admin | FrequentVisitorsDashboard | Working |
| Admin dashboard | AdminDashboard | Partial (static analytics) |
| Sidebar navigation | Sidebar | Partial (dead links) |
| Dark / light theme | ThemeContext + index.css | Partial (no toggle UI) |
| Expiry notifications | functions/index.js | **Broken (never deployed/wired)** |

## 5.7 Known limitations that shape feature behaviour

- No authentication anywhere; `Sign Out` is a dummy button.
- Visitor photos are stored as **base64 data-URLs** in Firestore (not Cloud Storage).
- `expiryTime` and `checkOutTime` are never written by the app, so expiry badges,
  `Overstayed` status, and check-out stats never materialise.
- A `delivery` visitor type exists in the data model but has no user-facing option.