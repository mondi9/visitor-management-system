# 4. Objectives

## 4.1 Overall mission

Provide a fast, verifiable, and secure digital check-in for every visitor to a facility,
giving security staff real-time visibility of who is on-site and freeing hosts and
reception from manual paperwork.

## 4.2 Primary objectives

| # | Objective | Success measure |
|---|-----------|-----------------|
| O1 | **One-minute check-in for new visitors** | A first-time visitor can complete details → photo → confirm in under 60 seconds |
| O2 | **Instant check-in for returning visitors** | A frequent visitor is checked in with fewer than 3 interactions after lookup |
| O3 | **Photo-verified digital badge** | Every active visit has an identity photo and issues a printable badge |
| O4 | **Real-time on-site visibility** | Admin dashboard reflects the exact, current list of visitors on-site |
| O5 | **Durable audit trail** | Every check-in/out event is persisted with timestamps and searchable |
| O6 | **Host notification** | Hosts are emailed on visitor arrival and when a visit nears expiry |
| O7 | **Protected data** | Visitor PII is only accessible to authenticated staff (rules + auth) |

## 4.3 Supporting objectives

| # | Objective | Details |
|---|-----------|---------|
| O8 | Frequent-visitor registry | Save, search, update, and remove recurring profiles |
| O9 | Visit lifecycle | Check-in → active → check-out (or expiry), with status always accurate |
| O10 | Usable on touch screens | Kiosk-first responsive UI that also works on phones/desktops |
| O11 | Theming | Light and dark themes persisted per device |
| O12 | Easy deployment | Static build deployable to Netlify with SPA routing |
| O13 | Quality baseline | Linting clean; automated tests for the core flows |

## 4.4 Current status against objectives

| Objective | Status | Notes |
|-----------|--------|-------|
| O1–O3 | **Blocked by configuration** | Check-in flow is implemented and the confirm-step crash / badge-photo bug are fixed in the working copy, but the app cannot write to Firestore until `.env` is populated with real Firebase credentials and the database is provisioned/rules allow writes |
| O4 | Partial | Dashboard reads Firestore live, but no check-out flow exists, so "on-site" is inaccurate |
| O5 | Partial | Check-ins are persisted (with badge numbers); check-out events are never recorded |
| O6 | Not met | EmailJS host/visitor emails exist but fail silently; expiry emails were never wired up |
| O7 | **Not met** | No auth, no Firestore security rules, wide-open access |
| O8 | Met | Frequent-visitor save/lookup/search/delete works (note: `visitCount` is never incremented after creation) |
| O9 | Not met | Only `Active` state exists; no check-out or expiry enforcement |
| O10–O12 | Met | Responsive kiosk UI, theme tokens, Netlify config present |
| O13 | Not met | No automated tests; lint runs and currently fails with 14 unused-variable errors in `AdminDashboard.jsx` |

## 4.5 Release/priority targets (recommended)

- **MVP (blockers):** populate `.env` with real Firebase credentials + provision Firestore,
  add Firebase Auth + Firestore security rules, and clean the lint baseline.
- **Release 1:** check-out flow, expiry time on check-in, server-side emails, real stats.
- **Release 2:** remaining admin sections, pre-registration, reports, automated tests.