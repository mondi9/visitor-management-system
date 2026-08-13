# 9. Testing Results

> Status as of this audit. There are **no automated tests** in the repository yet; the
> findings below come from static checks, a production build, and manual code review of
> each flow. A full test plan is defined in [`07-testing-approach.md`](./07-testing-approach.md).

## 9.1 Static checks

| Check | Result | Evidence |
|-------|--------|----------|
| `npm run build` | **Pass** | Vite 8 build succeeds; 2,076 modules transformed; produces `dist/` |
| `npm run lint` | **Fail** | 14 `no-unused-vars` errors, all in `src/components/AdminDashboard.jsx` (unused imports `doc`, `updateDoc`, `serverTimestamp`, `Search`, `UserX`, `Clock`, `Loader2`, `Timer`, `Plus`, `AlertTriangle`, `differenceInMinutes`, `addMinutes` and unused state `loading`, `currentTime`) |
| Bundle size | Warning | Main JS chunk is 580 kB (gzip 175 kB) — above the 500 kB warning threshold; code-splitting recommended |

## 9.2 Feature-level results (code review)

| Feature | Result | Notes |
|---------|--------|-------|
| Build / compile | Working | Full production bundle builds cleanly |
| Kiosk home screen (step 0) | Working | New Visitor / Returning Visitor entry renders |
| Personal details step | Working | Name/phone required gate present |
| Visit details step | Working | Host name required gate present |
| Photo capture | Partially Working | Works when camera permission is granted; stream is **not stopped on unmount/back**; permission-denied path shows an error with a manual retry |
| Confirm & print step | Working | Missing-icon crash fixed in working copy; build compiles with imports in place |
| Badge number generation | Working | Client-side `VMS-YYYYMMDD-XXXXXX` generated and stored |
| Database save | Not Working (config) | Write path and 10s timeout are correct, but `.env` is empty so Firebase never initialises; also blocked until Firestore is provisioned and rules allow writes |
| Digital badge display | Working | Photo (`photoUrl`), name, purpose, host, time, badge number render |
| Print badge | Partially Working | `window.print()` prints the whole page; no `@media print` stylesheet |
| Email notifications | Partially Working | EmailJS calls are configured for visitor + host but fire-and-forget; failures only logged, never surfaced |
| Frequent-visitor save | Working | Dedupes by phone, creates profile |
| Frequent-visitor lookup | Working | Phone exact → name prefix search |
| Frequent-visitors admin | Working | Search, delete with confirmation, stats |
| Admin dashboard live stats | Working | Total / on-site / checked-in-today derived from `onSnapshot` |
| Admin dashboard analytics widgets | Not Working | Trend chart, purpose donut, top hosts, site summary, "% vs yesterday" are hardcoded |
| Check-out flow | Not Working | Not implemented anywhere |
| Expiry / overstay detection | Not Working | `expiryTime` is never written, so `Overstayed` never triggers |
| Cloud function emails | Not Working | Functions aren't deployable on Netlify, Gmail creds are placeholders, composite index required |
| Authentication | Not Working | Not implemented; Sign Out is decorative |
| Firestore security | Not Working | No rules file shipped; open access |

## 9.3 Verified fixes in the working copy (uncommitted)

1. **Confirm-step crash** — `UserCheck` / `ClipboardList` icons are now imported
   (`CheckInForm.jsx:5`); Step 4 renders.
2. **Badge photo** — `DigitalBadge.jsx` reads `visitor.photoUrl` instead of `visitor.photo`.
3. **Badge number display** — `DigitalBadge` now renders the generated badge number.
4. **Firebase config moved to env vars** — `src/firebase.js` reads `VITE_FIREBASE_*` and
   throws a clear error if unset; a `.env.example` documents the required keys.

## 9.4 High-value next tests (when test infra is added)

- Confirm-step rendering with and without a photo (regression guard for fix #1/#2).
- Badge number format assertion: `/^VMS-\d{8}-[A-Z0-9]{6}$/`.
- Terms/required-field gates (never write with invalid state).
- Save-as-frequent idempotency by phone.
- Dashboard stats math against a seeded snapshot.