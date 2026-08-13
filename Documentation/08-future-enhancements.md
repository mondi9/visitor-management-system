# 8. Future Enhancements

This roadmap is organised by priority and risk. The first block is **required before
production**; later blocks are growth and polish items.

## 8.1 Critical / pre-launch (MVP)

| Priority | Enhancement | Rationale |
|----------|-------------|-----------|
| P0 | **Fix the Confirm (Step 4) crash** — import `UserCheck` / `ClipboardList` icons | Blocking defect; no check-in can be completed |
| P0 | **Fix badge photo** — read `photoUrl` in `DigitalBadge` (it currently reads `visitor.photo`) | Captured identity photo never displays |
| P0 | **Add authentication** (Firebase Auth) + protect `/admin/*` with a route guard | Admin is currently public; "Sign Out" is decorative |
| P0 | **Ship Firestore security rules** (`firestore.rules`) limiting reads/writes to auth'd staff | Visitor PII (IDs, photos) is currently fully open |
| P0 | **Move config to environment variables** (Firebase + EmailJS keys) | Keys are hardcoded in the bundle |
| P0 | **Add automated tests** for the check-in wizard and badge | Prevents regressions like the P0 bugs above |

## 8.2 Release 1 — complete the visit lifecycle

| Enhancement | Notes |
|-------------|-------|
| **Check-out flow** | Guard/admin action to mark *Checked Out* with `checkOutTime`; makes on-site stats trustworthy |
| **Set `expiryTime` on check-in** | Configurable default visit window; unlocks expiry badge, `Overstayed` status, and notifications |
| **Server-side emails** | Replace client EmailJS with a hosted function (Cloud Functions or Netlify Functions) with retry + logging; stop silent failures |
| **Reconcile backend deployment** | Either add `firebase.json` + real Cloud Functions wiring, or rewrite `functions/index.js` as Netlify Functions; guard `onStayExtended` against missing `expiryTime` |
| **Real analytics** | Compute trend / purpose / top-host charts and "vs yesterday" from Firestore instead of hardcoded values |
| **Distinct admin sections** | Implement Visitors, Notifications, Settings (or remove/dead-link nav) |

## 8.3 Release 2 — scale admin & operations

- **Pre-registration portal** — hosts book visits in advance; visitors get fast-track
  check-in with a reference/QR.
- **Host & contractor directories** — pre-approved contact lists, badge pre-authorisation.
- **Deliveries module** — activate the dormant `type: 'delivery'` path (courier name,
  package, collecting staff member).
- **Reports & export** — CSV/PDF exports, date-range filtering, per-host/purpose summaries.
- **Visitor table** — pagination, advanced filters, overdue/overstay views, badge reprint
  from history.
- **Photo storage on Cloud Storage** — replace base64 data-URLs in Firestore with Storage
  URLs (avoids 1 MiB document limits).
- **QR-coded badges** — scan to verify a badge is valid/live.
- **Notifications centre** — in-app bell with real unread items and email log.

## 8.4 Engineering & quality

- **TypeScript migration** — safer refactors across components/Firestore documents.
- **Test infrastructure** — Vitest + Testing Library (see `07-testing-approach.md`), then
  Playwright E2E; wire lint + test + build into CI.
- **Error boundaries & loading states** — consistent skeletons, retry on Firestore errors.
- **Brand consolidation** — pick one name/brand (SecurePass vs VMS vs VisitorPro) and apply
  everywhere.
- **Print stylesheet** for badges (`@media print`) so `window.print()` output is clean.
- **Fix camera lifecycle** — stop the stream on unmount/back-navigation; permission prompt
  degradation path.
- **Input validation** — email/phone/ID format checks client- and rules-side.
- **Dark mode toggle UI** — expose the already-implemented `ThemeContext.toggleTheme`.

## 8.5 Longer-term / experimental

- **Face-matching / liveness check** for badge photo verification against the identity
  document (privacy review required).
- **Visitor mobile pre-check-in** — complete details from a phone before arriving.
- **Heat zones / capacity dashboards** — per-floor or per-facility active counts.
- **PWA / offline kiosk** — Vite PWA plugin so check-in works during connectivity loss
  (queue writes, sync when online).
- **Analytics SDK / privacy controls** — retention policy, data deletion for GDPR/CCPA.
- **Multi-facility (multi-tenant)** support with per-site admins and role-based access.

## 8.6 Suggested sequencing summary

```
Phase 0 (now)        Phase 1               Phase 2
──────────────       ─────────────         ─────────────────────
Fix Step-4 crash     Check-out lifecycle   Pre-registration + QR
Fix badge photo      Setup expiry time     Reports & exports
Firebase Auth        Server-side email     Deliveries module
Firestore rules      Real analytics        Cloud Storage photos
Env-var config       Deploy backend funcs  Notifications centre
Test baseline        Distinct admin pages  PWA/offline kiosk
```