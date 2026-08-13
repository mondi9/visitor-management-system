# 3. Problem Statement

## 3.1 The problem

Managing visitors at a facility with a manual or semi-manual process creates measurable
operational and security problems:

### Operational friction
- **Slow check-in.** Paper forms or hand-typed registration make every visitor queue.
- **Repetitive data entry.** Regular visitors re-enter the same name, phone, company, and
  host details on every visit.
- **Lost/forgotten badges.** Paper badges are easy to lose, forge, or ignore.

### Security gaps
- **No reliable identity record.** Without a photo and contact details captured at the
  door, there is no verifiable record of who was on-site.
- **No real-time awareness.** Security staff have no live view of who is currently inside
  the building.
- **No audit trail.** Manual logs are rarely searched and can be falsified or lost.
- **Unmanaged dwell time.** Nothing tracks how long a visitor has been on-site or flags a
  visit that has overstayed its allowed duration.

### Administrative burden
- **No recurring-visitor management.** There is no way to recognise repeat visitors or
  prepare their check-in in advance.
- **Inconsistent host notification.** Hosts are not reliably informed when their guest
  arrives or when the guest's visit is about to expire.

## 3.2 Consequences observed in the current prototype

The existing implementation already suffers from the operational problems it is meant to
solve, at the code level:

1. A **blocking bug in the final check-in step** means visitors *cannot complete signing
   in* — the core flow is broken.
2. Visitors **cannot be checked out**, so "who is on-site right now" cannot be trusted.
3. There is **no authentication or data security** — the entire visitor database, including
   ID numbers and photos, is readable by anyone with network access.
4. Expiry reminders and host notifications are **designed but never executed**, so the
   security "teeth" of the system are missing.

## 3.3 Problem statement (definition)

> Modern buildings lack a fast, verifiable, and secure way to check visitors in and out,
> track who is on the premises, and notify hosts — and the current prototype does not yet
> deliver on those promises because its core check-in flow is blocked, its data is
> unprotected, and its visitor-lifecycle features are incomplete.

## 3.4 Opportunity

Building facility is a self-contained, mobile-and-kiosk-friendly web application that can:
- reduce check-in time to under a minute for new visitors and seconds for returning ones;
- provide an instant photo-verified digital badge;
- give security staff a live, filterable view of people on-site;
- capture a durable, searchable audit trail; and
- notify hosts automatically when guests arrive and when visits near their time limit.