// Role-based Firestore rules tests for the complete visitor lifecycle.
// Run under the Firestore emulator:
//   npm run test:rules
// Requires Java (JAVA_HOME set) and network for the first emulator download.

import process from 'node:process';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const PROJECT_ID = 'vms-rules-test';
const HOST = '127.0.0.1';
const PORT = 8080;

const UIDS = {
  hostA: 'host-a',
  hostB: 'host-b',
  reception: 'reception-1',
  security: 'security-1',
  superAdmin: 'super-admin-1',
};

const results = [];

function record(role, action, deniedExpected, deniedActual, detail = '') {
  const pass = deniedExpected === deniedActual;
  results.push({ role, action, deniedExpected, deniedActual, pass, detail });
}

// Returns true when the operation is DENIED by the rules.
async function denied(ctx, fn) {
  try { await fn(ctx.firestore()); return false; } catch { return true; }
}

const preRegistered = (over = {}) => ({
  name: 'Alice',
  company: 'Acme',
  phone: '+1-555-0100',
  email: 'alice@example.com',
  purpose: 'Business Meeting',
  duration: '1 Hour',
  durationMinutes: 60,
  expectedCheckoutTime: new Date(Date.now() + 3600000),
  badgeNumber: 'VMS-TEST-0001',
  status: 'Pre-Registered',
  type: 'visitor',
  profileId: 'prof-1',
  registeredBy: UIDS.hostA,
  hostId: null,
  hostName: 'Host A',
  hostEmail: 'hosta@example.com',
  registrationEmailSent: false,
  createdAt: new Date(),
  ...over,
});

const checkedIn = (over = {}) => ({
  name: 'Carol',
  status: 'Checked In',
  registeredBy: UIDS.hostA,
  type: 'visitor',
  badgeNumber: 'VMS-TEST-0003',
  checkInTime: new Date(),
  expectedCheckoutTime: new Date(Date.now() + 3600000),
  duration: '1 Hour',
  durationMinutes: 60,
  photoUrl: 'data:image/jpeg;base64,STFFACIALDATA',
  ...over,
});

let testEnv;

const seed = async () => {
  await testEnv.withSecurityRulesDisabled(async (sdk) => {
    const db = sdk.firestore();
    for (const [uid, role] of Object.entries({
      [UIDS.hostA]: 'host',
      [UIDS.hostB]: 'host',
      [UIDS.reception]: 'receptionist',
      [UIDS.security]: 'security-officer',
      [UIDS.superAdmin]: 'super-admin',
    })) {
      await db.doc(`users/${uid}`).set({ role, email: `${uid}@test.local` });
    }
    await db.doc('visitors/visit-own').set(preRegistered());
    await db.doc('visitors/visit-other').set(preRegistered({ name: 'Bob', badgeNumber: 'VMS-TEST-0002', registeredBy: UIDS.hostB }));
    await db.doc('visitors/visit-checked-in').set(checkedIn());
    await db.doc('frequentVisitors/prof-1').set({ name: 'Alice', phone: '+1-555-0100', photoUrl: null, createdBy: 'host' });
    await db.doc('appSettings/default').set({ organizationName: 'VMS', defaultDuration: '1 Hour' });

    // Diagnostics: confirm the seed actually landed in the emulator.
    for (const path of ['users/host-a', 'users/reception-1', 'visitors/visit-own', 'visitors/visit-checked-in', 'frequentVisitors/prof-1']) {
      const snap = await db.doc(path).get();
      console.log(`[seed] ${path} exists = ${snap.exists}`);
    }
  });
};

async function runTests() {
  const hostA = testEnv.authenticatedContext(UIDS.hostA);
  const hostB = testEnv.authenticatedContext(UIDS.hostB);
  const reception = testEnv.authenticatedContext(UIDS.reception);
  const security = testEnv.authenticatedContext(UIDS.security);
  const admin = testEnv.authenticatedContext(UIDS.superAdmin);
  const anon = testEnv.unauthenticatedContext();

  // ---------- HOST ----------
  record('Host', 'create own Pre-Registered visit', false,
    await denied(hostA, (db) => db.doc('visitors/visit-new-host').set(preRegistered({ name: 'Hosts guest' }))));

  record('Host', 'read own visit', false,
    await denied(hostA, (db) => db.doc('visitors/visit-own').get()));

  record('Host', 'read another host\'s visit', true,
    await denied(hostA, (db) => db.doc('visitors/visit-other').get()));

  record('Host', 'query own registrations', false,
    await denied(hostA, async (db) => {
      const snap = await db.collection('visitors').where('registeredBy', '==', UIDS.hostA).get();
      if (!snap.docs.every((d) => d.data().registeredBy === UIDS.hostA)) throw new Error('unexpected docs');
    }));

  record('Host', 'update own registrationEmailSent', false,
    await denied(hostA, (db) => db.doc('visitors/visit-own').update({ registrationEmailSent: true })));

  record('Host', 'check in (status Pre-Registered -> Checked In)', true,
    await denied(hostA, (db) => db.doc('visitors/visit-own').update({ status: 'Checked In', checkInTime: new Date() })));

  record('Host', 'change status at all', true,
    await denied(hostA, (db) => db.doc('visitors/visit-own').update({ status: 'Checked Out' })));

  record('Host', 'create visit with facial data (photoUrl)', true,
    await denied(hostA, (db) => db.doc('visitors/visit-photo').set(preRegistered({ photoUrl: 'data:image/jpeg;base64,XXXX' }))));

  record('Host', 'create host profile (no photo)', false,
    await denied(hostA, (db) => db.doc('frequentVisitors/prof-host').set({ name: 'Dana', phone: '+1-555-0199', photoUrl: null, createdBy: 'host' })));

  record('Host', 'create profile with facial data', true,
    await denied(hostA, (db) => db.doc('frequentVisitors/prof-bad').set({ name: 'Eve', photoUrl: 'data:image/jpeg;base64,XXXX', createdBy: 'host' })));

  record('Host', 'read frequent-visitor profile', false,
    await denied(hostA, (db) => db.doc('frequentVisitors/prof-1').get()));

  record('Host', 'delete a visit record', true,
    await denied(hostA, (db) => db.doc('visitors/visit-own').delete()));

  // ---------- RECEPTION / SECURITY (staff) ----------
  for (const [label, ctx] of [['Reception', reception], ['Security', security]]) {
    record(label, 'read any registration (badge lookup)', false,
      await denied(ctx, (db) => db.doc('visitors/visit-other').get()));

    record(label, 'retrieve visit by badge number', false,
      await denied(ctx, async (db) => {
        const snap = await db.collection('visitors').where('badgeNumber', '==', 'VMS-TEST-0002').get();
        if (snap.empty) throw new Error('no match');
      }));

    record(label, 'check in Pre-Registered -> Checked In (facial capture)', false,
      await denied(ctx, (db) => db.doc('visitors/visit-own').update({
        status: 'Checked In',
        checkInTime: new Date(),
        expectedCheckoutTime: new Date(Date.now() + 3600000),
        duration: '1 Hour',
        durationMinutes: 60,
        photoUrl: 'data:image/jpeg;base64,STFFACIALDATA',
        frequentVisitorId: 'prof-1',
      })));

    record(label, 'walk-in check-in (create Checked In)', false,
      await denied(ctx, (db) => db.doc('visitors/visit-new').set(checkedIn({ name: 'Frank', badgeNumber: 'VMS-TEST-0100' }))));

    record(label, 'illegal backwards transition Checked In -> Pre-Registered', true,
      await denied(ctx, (db) => db.doc('visitors/visit-checked-in').update({ status: 'Pre-Registered' })));

    record(label, 'update a field outside the allowed set', true,
      await denied(ctx, (db) => db.doc('visitors/visit-checked-in').update({ name: 'Sneaky' })));

    record(label, 'extend visit (checkout time + flags)', false,
      await denied(ctx, (db) => db.doc('visitors/visit-checked-in').update({
        expectedCheckoutTime: new Date(Date.now() + 7200000),
        reminderSent: false,
        expiredEmailSent: false,
        extendCount: 1,
        lastExtendedAt: new Date(),
      })));

    record(label, 'stay-monitor reminder flags', false,
      await denied(ctx, (db) => db.doc('visitors/visit-checked-in').update({ reminderSent: true, reminderSentAt: new Date() })));

    record(label, 'check out Checked In -> Checked Out', false,
      await denied(ctx, (db) => db.doc('visitors/visit-checked-in').update({ status: 'Checked Out', checkOutTime: new Date() })));

    record(label, 'delete a visit record (audit integrity)', true,
      await denied(ctx, (db) => db.doc('visitors/visit-checked-in').delete()));

    record(label, 'create frequent-visitor profile with photo', false,
      await denied(ctx, (db) => db.doc('frequentVisitors/prof-staff').set({ name: 'Grace', photoUrl: 'data:image/jpeg;base64,YYYY' })));

    record(label, 'edit another user\'s role', true,
      await denied(ctx, (db) => db.doc(`users/${UIDS.hostA}`).update({ role: 'super-admin' })));
  }

  // ---------- SUPER ADMIN ----------
  record('Super Admin', 'delete a visit record', false,
    await denied(admin, (db) => db.doc('visitors/visit-new').delete()));

  record('Super Admin', 'write app settings', false,
    await denied(admin, (db) => db.doc('appSettings/default').set({ organizationName: 'VMS HQ', defaultDuration: '2 Hours' })));

  record('Super Admin', 'edit user role', false,
    await denied(admin, (db) => db.doc(`users/${UIDS.reception}`).update({ role: 'receptionist' })));

  record('Super Admin', 'read any registration', false,
    await denied(admin, (db) => db.doc('visitors/visit-other').get()));

  // ---------- ANONYMOUS ----------
  record('Anonymous', 'read visitors', true,
    await denied(anon, (db) => db.doc('visitors/visit-own').get()));

  record('Anonymous', 'create visitor record', true,
    await denied(anon, (db) => db.doc('visitors/visit-anon').set(checkedIn())));

  record('Anonymous', 'read frequent-visitor profiles', true,
    await denied(anon, (db) => db.doc('frequentVisitors/prof-1').get()));

  record('Anonymous', 'write frequent-visitor profiles', true,
    await denied(anon, (db) => db.doc('frequentVisitors/prof-anon').set({ name: 'X', photoUrl: 'data:image/jpeg;base64,ZZZZ' })));

  record('Anonymous', 'read app settings (public)', false,
    await denied(anon, (db) => db.doc('appSettings/default').get()));

  record('Anonymous', 'write app settings', true,
    await denied(anon, (db) => db.doc('appSettings/default').set({ organizationName: 'Pwned' })));

  await hostA.cleanup();
  await hostB.cleanup();
  await reception.cleanup();
  await security.cleanup();
  await admin.cleanup();
  await anon.cleanup();
}

function printReport() {
  console.log('\n================= RULES TEST REPORT =================');
  const row = (r) =>
    `${r.role.padEnd(14)} ${r.action.padEnd(58)} ${(r.deniedExpected ? 'DENY' : 'ALLOW').padEnd(8)} ${(r.deniedActual ? 'DENY' : 'ALLOW').padEnd(8)} ${r.pass ? 'PASS' : 'FAIL'}`;
  console.log(`${'ROLE'.padEnd(14)} ${'ACTION'.padEnd(58)} ${'EXPECTED'.padEnd(8)} ${'ACTUAL'.padEnd(8)} RESULT`);
  console.log('-'.repeat(150));
  for (const r of results) console.log(row(r));
  const failures = results.filter((r) => !r.pass);
  console.log('-'.repeat(150));
  console.log(`TOTAL: ${results.length}   PASSED: ${results.length - failures.length}   FAILED: ${failures.length}`);
  if (failures.length) {
    console.log('\nFAILED CASES:');
    failures.forEach((f) => console.log(`  - [${f.role}] ${f.action}: expected ${f.deniedExpected ? 'DENY' : 'ALLOW'}, got ${f.deniedActual ? 'DENY' : 'ALLOW'}`));
  }
  console.log('======================================================\n');
  return failures.length;
}

try {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: HOST, port: PORT },
  });
  await seed();
  await runTests();
  const failures = printReport();
  await testEnv.cleanup();
  process.exit(failures > 0 ? 1 : 0);
} catch (err) {
  console.error('Test run failed to start:', err);
  if (testEnv) await testEnv.cleanup();
  process.exit(1);
}