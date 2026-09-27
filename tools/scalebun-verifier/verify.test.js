/* Self-test: node tools/scalebun-verifier/verify.test.js */
'use strict';
const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const report = {
  schema: 'scalebun-sdk-test-lab/report@1',
  generatedAt: '2026-09-27T00:00:00Z',
  testRunId: 'tr_20260927T000000Z_deadbeef',
  environment: { sdkVersion: '2.4.0', reactNativeVersion: '0.81.6', platform: 'android', osVersion: '15', appVersion: '0.0.1', buildNumber: '1', environment: 'development', appId: 'app_x', profileId: 'default', integration: 'provider', clientKeyPrefix: 'skb_test_ck_…' },
  summary: { LOCAL_PASS: 1, FAIL: 1, VERIFIED: 1 },
  tests: [
    { id: 'ANA-013', category: 'Analytics', name: 'Purchase via ScaleBun.trackPurchase', expectedScaleBun: '$29', dashboardLocation: 'Business', result: { status: 'LOCAL_PASS', actual: { transactionId: 'sdk_test_txn_tr_x_1' } } },
    { id: 'INIT-001', category: 'Setup & Init', name: 'Valid init', expectedScaleBun: 'session', dashboardLocation: 'Sessions', result: { status: 'VERIFIED', actual: { ids: { installationId: 'inst_123' } } } },
    { id: 'NET-012', category: 'Network', name: 'Auth redaction', expectedScaleBun: 'x', dashboardLocation: 'y', result: { status: 'FAIL', note: 'leaked' } },
  ],
};

const f = path.join(os.tmpdir(), `sdk-lab-report-${process.pid}.json`);
fs.writeFileSync(f, JSON.stringify(report));
const md = execFileSync(process.execPath, [path.join(__dirname, 'verify.js'), 'checklist', f], { encoding: 'utf8' });
assert.ok(md.includes('testRunId = tr_20260927T000000Z_deadbeef'));
assert.ok(md.includes('- [ ] **ANA-013'));
assert.ok(md.includes('sdk_test_txn_tr_x_1'));
assert.ok(!md.includes('- [ ] **INIT-001'), 'VERIFIED tests must not be re-listed');
assert.ok(md.includes('Local FAILURES'));
const mcp = execFileSync(process.execPath, [path.join(__dirname, 'verify.js'), 'mcp', f], { encoding: 'utf8' });
assert.ok(mcp.includes('"installationId": "inst_123"'));
fs.unlinkSync(f);
console.log('scalebun-verifier self-test: OK');
