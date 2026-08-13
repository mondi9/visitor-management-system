# 7. Testing Approach

## 7.1 Current state

> **There are no automated tests in the repository today.** No test framework or test
> script is configured (`package.json` has `dev`, `build`, `lint`, and `preview` only;
> there is no `test` script and no test folder).
>
> Static checking is now exercised: `npm run lint` runs but currently **fails with 14
> `no-unused-vars` errors** (all in `AdminDashboard.jsx`), and `npm run build` succeeds
> (production bundle builds cleanly).
>
> Because the app is entirely client-side logic over Firestore, it is well suited to
> automated testing, and a test baseline is a stated objective (see `04-objectives.md`,
> objective O13).

## 7.2 Testing principles

- **Test the critical flows first.** The kiosk check-in is the product; a regression in
  it (such as the current missing-import crash on Step 4) must be caught by tests.
- **Avoid depending on a live Firebase instance.** Firestore read/write code should be
  abstracted (module-level functions or a data-access layer) so tests can inject mocks.
- **Prefer user-centric assertions.** Use Testing Library queries by role/label over
  implementation details.
- **Small, fast, deterministic suites** that run locally in CI alongside lint.

## 7.3 Test pyramid

```
        ▲  E2E smoke flows          (Playwright — a handful of flows)
       ▲   Integration (firestore mocks + components)
      ▲    Unit tests (logic, validation, utilities)
     ▲▲▲▲  Static analysis: ESLint (runs today, must be green)
```

## 7.4 Recommended tooling

| Layer | Tool | Purpose |
|-------|------|---------|
| Runner | Vitest | Fast, Vite-native test runner |
| Component testing | @testing-library/react + jsdom | Render React components, simulate user interaction |
| Firestore fakes | firestore-emulator or hand-rolled mocks | Deterministic data layer without network |
| E2E (later) | Playwright | Critical-path flows against deployed app |
| Static | ESLint (already configured) | Rules-only safety net |

## 7.5 Prioritised test plan

### P0 — Core check-in (highest priority)
1. **Confirm-step render:** rendering Step 4 must not throw. Run with no photo, then with a
   photo. (The missing `UserCheck`/`ClipboardList` imports were fixed in the working copy
   — this regression must not return.)
2. **New-visitor happy path:** steps 0→4 complete and `addDoc` is called with correct
   payload (`status: 'Active'`, `type: 'visitor'`, `badgeNumber`, fields merged).
3. **Terms gate:** submit with `agreed: false` shows an error and never writes.
4. **Required-field gate:** Step 1→2 blocked without name/phone; Step 2→3 blocked without
   host name.
5. **Camera mounting:** `startCamera` calls `getUserMedia`; capture produces a data-URL;
   retake clears photo and restarts the stream; camera is stopped on unmount.

### P1 — Badge & frequent visitors
6. **Badge data display:** renders name, purpose, host, formatted arrival time, and the
   badge number; **photo regression** — ensure the captured `photoUrl` is displayed (the
   former `visitor.photo` mismatch is fixed — regression-guard it).
7. **Save-as-frequent:** creates profile on first call; is idempotent on duplicate phone.
8. **Lookup logic:** phone (exact) then name-prefix fallback both return correct docs.
9. **Frequent dashboard:** search filters rows; delete requires confirmation and calls
   `deleteDoc`.

### P2 — Admin
10. **Stats computation:** total / active-now / checked-in-today / checked-out-today are
    derived correctly from a seeded snapshot.
11. **Status derivation:** a visitor whose `expiryTime` is in the past is labelled
    `Overstayed`.
12. **Live updates:** adding a snapshot item re-renders the dashboard (unsubscribe cleans
    up on unmount).

### P3 — Utility & regression
13. `handleInputChange` checkbox/text semantics; theme persistence round-trip.
14. Build smoke test in CI: `npm run build` must succeed (catches syntax/JSX errors early).

## 7.6 Suggested `package.json` additions

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

With Vitest configured (jsdom environment, `setupFiles` for `firebase` mocks), a
representative test will look like:

```js
// src/components/__tests__/CheckInForm.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import CheckInForm from '../CheckInForm';

vi.mock('../../firebase', () => ({
  db: { collection: vi.fn() }
}));

it('renders the confirm step without crashing', () => {
  // ...drive steps 1-3, then assert Step 4 content renders
});
```

## 7.7 What tests must NOT cover

- Hardcoded dashboard mock numbers (to be removed, not asserted).
- Cloud Functions code that is not deployable with the current Netlify setup (test only
  once migrated to a supported runtime).
- Visual snapshots of Tailwind layouts (maintainable style audits instead).

## 7.8 CI recommendation

- **Step 1:** `npm ci`
- **Step 2:** `npm run lint`
- **Step 3:** `npm run test` (Vitest)
- **Step 4:** `npm run build`
- **Step 5 (later):** Playwright E2E against the Netlify preview deploy.