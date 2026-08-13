# SecurePass — Visitor Management System

## Project Documentation

This folder contains the technical and product documentation for the **SecurePass / VMS**
(Visitor Management System) application.

## Documents

| # | Document | Description |
|---|----------|-------------|
| 1 | [`01-executive-summary.md`](./01-executive-summary.md) | High-level overview for stakeholders |
| 2 | [`02-introduction.md`](./02-introduction.md) | Background, scope, and context |
| 3 | [`03-problem-statement.md`](./03-problem-statement.md) | The problems the system solves |
| 4 | [`04-objectives.md`](./04-objectives.md) | Project goals and success criteria |
| 5 | [`05-features.md`](./05-features.md) | Implemented features and how they work |
| 6 | [`06-system-architecture.md`](./06-system-architecture.md) | Tech stack, architecture, and data model |
| 7 | [`07-testing-approach.md`](./07-testing-approach.md) | Testing strategy and test plan |
| 8 | [`08-future-enhancements.md`](./08-future-enhancements.md) | Planned improvements and roadmap |
| 9 | [`09-testing-results.md`](./09-testing-results.md) | Verified build/lint results and feature-level status |
| 10 | [`10-known-issues.md`](./10-known-issues.md) | Open defects and risks, ordered by severity |

## Complementary document

- [`PROJECT_ANALYSIS.md`](../PROJECT_ANALYSIS.md) — independent code review covering
  existing features, missing features, bugs, and improvement opportunities.

## Quick reference

- **Stack:** React 19 · Vite 8 · Tailwind CSS 4 · React Router 7 · Firebase Firestore · EmailJS
- **Deployment:** Netlify (`netlify.toml`)
- **Entry points:** `src/main.jsx` → `src/App.jsx` → `src/components/`
- **Data:** Cloud Firestore collections — `visitors`, `frequentVisitors`