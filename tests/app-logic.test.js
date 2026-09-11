import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVisitStatus, STATUS_STYLES, getExpectedCheckout, getDurationMinutes, DURATION_MINUTES } from '../src/lib/visitUtils.js';
import { ROLES, isRoleAllowed } from '../src/lib/roles.js';
import { generateBadgeNumber, BADGE_PREFIX } from '../src/lib/badge.js';

const baseVisitor = {
  status: 'Checked In',
  checkInTime: new Date('2026-08-19T09:00:00'),
  expectedCheckoutTime: new Date('2026-08-19T10:00:00'),
};

test('getVisitStatus uses the Checked In lifecycle state', () => {
  assert.equal(getVisitStatus({ ...baseVisitor }, new Date('2026-08-19T09:30:00')), 'Checked In');
});

test('getVisitStatus returns Pre-Registered for un-arrived visits', () => {
  assert.equal(getVisitStatus({ status: 'Pre-Registered' }, new Date()), 'Pre-Registered');
});

test('getVisitStatus returns Checked Out once checked out', () => {
  const v = { ...baseVisitor, status: 'Checked Out', checkOutTime: new Date('2026-08-19T09:45:00') };
  assert.equal(getVisitStatus(v, new Date('2026-08-19T10:00:00')), 'Checked Out');
});

test('getVisitStatus falls back to Checked Out when checkOutTime is present', () => {
  assert.equal(getVisitStatus({ ...baseVisitor, checkOutTime: new Date() }, new Date()), 'Checked Out');
});

test('getVisitStatus reports Expiring Soon inside the 15-minute window', () => {
  const v = { ...baseVisitor, expectedCheckoutTime: new Date('2026-08-19T10:00:00') };
  assert.equal(getVisitStatus(v, new Date('2026-08-19T09:50:00')), 'Expiring Soon');
});

test('getVisitStatus reports Expired after the expected checkout', () => {
  const v = { ...baseVisitor, expectedCheckoutTime: new Date('2026-08-19T10:00:00') };
  assert.equal(getVisitStatus(v, new Date('2026-08-19T10:05:00')), 'Expired');
});

test('STATUS_STYLES has a Checked In entry and no Active entry', () => {
  assert.ok(STATUS_STYLES['Checked In']);
  assert.equal(STATUS_STYLES.Active, undefined);
});

test('duration helpers map labels to minutes and compute expected checkout', () => {
  assert.equal(getDurationMinutes('1 Hour'), 60);
  assert.equal(DURATION_MINUTES['Full Day'], 480);
  const from = new Date('2026-08-19T09:00:00');
  assert.deepEqual(getExpectedCheckout('1 Hour', from), new Date('2026-08-19T10:00:00'));
});

test('role access: staff roles can open admin visitor pages', () => {
  for (const role of [ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.SECURITY_OFFICER]) {
    assert.equal(isRoleAllowed(role, '/admin/visitors'), true);
  }
  assert.equal(isRoleAllowed(ROLES.HOST, '/admin/visitors'), false);
});

test('role access: only Super Admin opens users and settings', () => {
  assert.equal(isRoleAllowed(ROLES.RECEPTIONIST, '/admin/users'), false);
  assert.equal(isRoleAllowed(ROLES.SECURITY_OFFICER, '/admin/settings'), false);
  assert.equal(isRoleAllowed(ROLES.SUPER_ADMIN, '/admin/users'), true);
  assert.equal(isRoleAllowed(ROLES.SUPER_ADMIN, '/admin/settings'), true);
});

test('role access: host routes are host-only', () => {
  assert.equal(isRoleAllowed(ROLES.HOST, '/host'), true);
  assert.equal(isRoleAllowed(ROLES.HOST, '/host/register'), true);
  assert.equal(isRoleAllowed(ROLES.RECEPTIONIST, '/host'), false);
});

test('generateBadgeNumber produces VMS-YYYYMMDD-XXXXXX format', () => {
  const badge = generateBadgeNumber(new Date('2026-08-19T10:00:00'));
  assert.match(badge, new RegExp(`^${BADGE_PREFIX}-20260819-[A-Z0-9]{6}$`));
});

test('badge numbers are unique across calls', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i += 1) {
    const b = generateBadgeNumber(new Date('2026-08-19T10:00:00'));
    assert.equal(seen.has(b), false);
    seen.add(b);
  }
});