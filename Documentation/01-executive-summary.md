# 1. Executive Summary

**SecurePass / VMS (Visitor Management System)** is a self-service web application that
handles visitor check-in, identification, and monitoring at a facility. It lets a visitor
(or a guard) complete the entire check-in process on a kiosk — enter their details, capture
a photo, receive a digital badge, and optionally be remembered as a *frequent visitor* for
faster future check-ins — while giving security staff a dashboard to see who is on-site.

The application is built with **React 19, Vite, Tailwind CSS, and Firebase Firestore**, and
is deployed statically on **Netlify**.

## What works today

- Streamlined, multi-step kiosk check-in with repeated-edge support:
  - New visitor self check-in (details → visit → photo → confirm).
  - Returning visitor lookup by phone or name, with auto-filled profiles.
  - Webcam photo capture embedded in the flow.
  - Unique badge-number generation per check-in.
  - Digital, printable visitor badge (photo, arrival time, badge number).
  - "Save as Frequent Visitor" with visit tracking.
- Admin console with:
  - A dashboard of visitor statistics and recent activity.
  - A frequent-visitors directory with search and removal.
- Light/dark theme support and responsive layout.

## Current status and risks

The application is **feature-incomplete and not yet production-ready**. The two blocking
check-in defects (confirm-step crash and badge-photo field mismatch) were fixed in the
latest working copy, but critical gaps remain. A code review
(see [`PROJECT_ANALYSIS.md`](../PROJECT_ANALYSIS.md)) identified:

1. **Firebase is unconfigured** — the `.env` file currently holds empty `VITE_FIREBASE_*`
   values, so the app throws at startup and cannot reach Firestore until real credentials
   are added for a provisioned Firebase project.
2. **No authentication** — the admin console and all visitor data are publicly accessible
   through Firestore.
3. **No Firestore security rules** deployed; sensitive personal information (name, phone,
   ID number, photo) is currently unguarded.
4. **Incomplete business logic** — visitors can never be checked out, and visit expiry
   (with its notification emails) is never actually triggered.
5. Backend email/scheduling functions are written for Firebase Cloud Functions but deployed
   to Netlify, so they do not run.

## Recommendation

Prioritise provisioning the real Firebase project credentials (`.env`), then add
authentication and Firestore security rules before any public launch. The remainder of the
improvements (real analytics, additional admin sections, automated tests) can follow in
iterative releases.

## At a glance

| Aspect | Value |
|--------|-------|
| Purpose | Visitor registration, badge issuance, and on-site monitoring |
| Platform | Web (responsive, kiosk + admin) |
| Frontend | React 19 / Vite 8 / Tailwind CSS 4 |
| Backend / data | Google Firebase Firestore |
| Emails | EmailJS (client-side) + planned server functions |
| Hosting | Netlify (static + SPA routing) |
| Maturity | Prototype — functional kiosk flow, placeholder admin analytics, known bugs |