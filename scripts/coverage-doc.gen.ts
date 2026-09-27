/**
 * Generates SDK_COVERAGE.md from src/scalebun/apiInventory.ts + the test
 * registry, so the document can never drift from the code.
 *
 *   npm run docs:coverage
 *
 * Runs under Jest only to reuse the project's Babel/TypeScript transform.
 */
import * as fs from 'fs';
import * as path from 'path';
import { API_INVENTORY, type ApiEntry } from '../src/scalebun/apiInventory';
import { ALL_TESTS } from '../src/tests/registry';

const ROOT = path.join(__dirname, '..');
const sdkPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/@scalebun/react-native/package.json'), 'utf8')) as { version: string };

const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

const SECTIONS: Array<[string, (a: ApiEntry) => boolean]> = [
  ['Facade methods & namespaces (`import ScaleBun from "@scalebun/react-native"`)', a => a.id.startsWith('facade.')],
  ['Named exports (components, hooks, functions, values)', a => a.id.startsWith('export.')],
  ['Hook / controller / singleton members', a => a.kind === 'hook-return'],
  ['ScaleBunProvider & component props', a => a.kind === 'provider-prop' || a.kind === 'component-prop'],
  ['Init configuration (public types)', a => a.kind === 'config' && a.id.startsWith('config.')],
  ['Init configuration accepted at RUNTIME but absent from public types', a => a.kind === 'config-runtime-only'],
  ['Metro, CLI & native capabilities', a => a.kind === 'metro' || a.kind === 'cli' || a.kind === 'native'],
  ['Expected capabilities NOT available in the installed version', a => a.id.startsWith('missing.')],
];

test('generate SDK_COVERAGE.md', () => {
  const testsFor = new Map<string, string[]>();
  for (const t of ALL_TESTS) for (const c of t.covers) testsFor.set(c, [...(testsFor.get(c) ?? []), t.id]);

  const byClass: Record<string, number> = {};
  for (const a of API_INVENTORY) byClass[a.classification] = (byClass[a.classification] ?? 0) + 1;
  const covered = API_INVENTORY.filter(a => testsFor.has(a.id)).length;
  const automated = ALL_TESTS.filter(t => !t.interactive && !t.dangerous && t.verification !== 'MANUAL').length;
  const manualTests = ALL_TESTS.filter(t => t.interactive || t.verification === 'MANUAL').length;
  const dangerous = ALL_TESTS.filter(t => t.dangerous).length;

  const out: string[] = [];
  out.push('# SDK Coverage Matrix', '');
  out.push(`> **Generated** by \`npm run docs:coverage\` from \`src/scalebun/apiInventory.ts\` and \`src/tests/**\`. Do not edit by hand.`);
  out.push(`> Installed SDK: **@scalebun/react-native ${sdkPkg.version}** (source of truth: the installed \`lib/typescript\` declarations + \`lib/module\` runtime).`, '');
  out.push('## How completeness is enforced', '');
  out.push('- `__tests__/sdkSurface.test.ts` re-parses the installed SDK (`index.d.ts` runtime exports, every public `ScaleBunFacade` member and namespace member, every `SimplifiedInitConfig` key) and fails on any API that is missing from — or stale in — the inventory.');
  out.push('- `__tests__/coverage.test.ts` fails when an inventoried capability has no covering test **and** no written NOT_CALLED / NOT_AVAILABLE reason.');
  out.push('- Bumping the SDK version fails the version pin test until this matrix is regenerated and reviewed.', '');
  out.push('## Totals', '');
  out.push('| Metric | Value |', '|---|---|');
  out.push(`| Public APIs / capabilities inventoried | **${API_INVENTORY.length}** |`);
  out.push(`| Covered by ≥1 Test Lab test | **${covered}** |`);
  out.push(`| Explicitly not called / not available (with reason) | ${API_INVENTORY.length - covered} |`);
  for (const [k, v] of Object.entries(byClass)) out.push(`| Classification ${k} | ${v} |`);
  out.push(`| Test cases | **${ALL_TESTS.length}** |`);
  out.push(`| — runnable unattended (safe suite, graded LOCAL_PASS/VERIFIED) | ${automated} |`);
  out.push(`| — needing a human (interactive or MANUAL grading) | ${manualTests} |`);
  out.push(`| — dangerous/destructive (Danger Zone only) | ${dangerous} |`, '');
  out.push('Classification legend: **AUTOMATED** local assertion on observable SDK state · **DASHBOARD** emits tagged data, delivery verified in dashboard/verifier (LOCAL_PASS ≠ VERIFIED) · **MANUAL** needs a person/OS dialog/device action · **PLATFORM_SPECIFIC** SKIPPED WITH REASON on the other OS · **DIAGNOSTIC_ONLY** debug/diagnostic surface · **NOT_CALLED** deliberately never invoked (reason given) · **NOT_AVAILABLE** not exposed by the installed SDK.', '');

  for (const [title, pred] of SECTIONS) {
    const rows = API_INVENTORY.filter(pred);
    if (!rows.length) continue;
    out.push(`## ${title}`, '');
    out.push('| API / capability | Classification | Tests | Notes |', '|---|---|---|---|');
    for (const a of rows) out.push(`| \`${a.id}\` | ${a.classification} | ${(testsFor.get(a.id) ?? ['—']).join(', ')} | ${esc(a.note ?? '')} |`);
    out.push('');
  }

  out.push('## Test catalog', '');
  out.push('| ID | Category | Name | Risk | Platforms | Grading | Flags |', '|---|---|---|---|---|---|---|');
  for (const t of ALL_TESTS) {
    const flags = [t.dangerous ? 'DANGEROUS' : '', t.interactive ? 'interactive' : '', t.profiles ? `profile: ${t.profiles.join('/')}` : '', t.requires?.length ? `needs: ${t.requires.join(', ')}` : '']
      .filter(Boolean)
      .join(' · ');
    out.push(`| ${t.id} | ${t.category} | ${esc(t.name)} | ${t.risk} | ${t.platforms.join('/')} | ${t.verification} | ${esc(flags)} |`);
  }
  out.push('');
  fs.writeFileSync(path.join(ROOT, 'SDK_COVERAGE.md'), out.join('\n'));
  expect(covered).toBeGreaterThan(200);
});
