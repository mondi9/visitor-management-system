# 2. Introduction

## 2.1 Purpose of this document

This document set describes the **SecurePass Visitor Management System (VMS)**: what it
does, the problems it addresses, its objectives, implemented features, architecture,
testing approach, and the roadmap for future work. It is intended for developers,
security/operations staff, and project stakeholders.

## 2.2 Background

Controlling who enters a facility is a core security requirement for offices, campuses,
factories, and other controlled sites. Traditional visitor handling relies on paper log
books or a receptionist manually entering details, printing paper badges, and tracking
who is still on-site. This approach is slow, error-prone, hard to audit, and leaves no
reliable digital record.

VMS replaces that manual process with a digital, self-service check-in. A visitor uses a
kiosk or a web browser to register, is photographed for identification, receives an
immediate digital badge, and — if they visit regularly — can be saved as a *frequent
visitor* so their next check-in takes a few seconds.

## 2.3 Product name and branding

The application is inconsistently branded across the codebase: the browser title says
**"SecurePass"**, the kiosk and admin sidebar use **"VMS"**, and the badge footer says
**"Powered by VisitorPro Management"**. Standardising the brand is recommended (see
future enhancements).

## 2.4 Scope

### In scope (current implementation)

- Self-service visitor check-in (new and returning visitors).
- Webcam photo capture.
- Digital badge generation and printing.
- Frequent-visitor profiles with fast lookup.
- Admin dashboard with visitor statistics.
- Frequent-visitors management (search / delete).
- Light/dark theme support.
- Netlify static deployment with SPA routing.

### Out of scope / not yet implemented

- Authentication and user roles.
- Visitor check-out workflow.
- Visit expiry enforcement and notifications.
- Pre-registration, host directory, contractor/delivery tracking, reports.
- Automated testing.
- Production Firestore security rules.

## 2.5 Users and roles

| Role | Description | Entry point |
|------|-------------|-------------|
| Visitor | Self-service check-in; may be first-time or returning | Kiosk `/` |
| Security / Admin | Monitor on-site activity, manage frequent-visitor profiles | `/admin` |
| Host | Intended recipient of check-in/expiry notifications (email) | — (notifications) |

## 2.6 Conventions used

- Code is JavaScript/JSX (no TypeScript).
- Styling uses Tailwind CSS utility classes plus CSS custom properties (theme tokens).
- Data is stored in Cloud Firestore (`visitors`, `frequentVisitors` collections).