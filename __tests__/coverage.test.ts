/**
 * Coverage contract: every inventoried SDK capability is exercised by at least
 * one Test Lab test, or is explicitly classified NOT_CALLED / NOT_AVAILABLE with
 * a written reason. Also validates the test catalog itself.
 */
import { API_INVENTORY, API_IDS } from '../src/scalebun/apiInventory';
import { ALL_TESTS } from '../src/tests/registry';
import { CATEGORIES } from '../src/testRunner/types';
import { PROFILES } from '../src/config/profiles';

describe('test catalog', () => {
  it('has unique ids', () => {
    const ids = ALL_TESTS.map(t => t.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('every test declares the mandatory metadata', () => {
    for (const t of ALL_TESTS) {
      expect({ id: t.id, ok: !!(t.name && t.description && t.expectedLocal && t.expectedScaleBun && t.dashboardLocation && t.platforms.length) }).toEqual({ id: t.id, ok: true });
      expect(CATEGORIES).toContain(t.category);
    }
  });

  it('only references known inventory ids', () => {
    const unknown = ALL_TESTS.flatMap(t => t.covers.filter(c => !API_IDS.has(c)).map(c => `${t.id}→${c}`));
    expect(unknown).toEqual([]);
  });

  it('only references existing init profiles', () => {
    const known = new Set(PROFILES.map(p => p.id));
    const bad = ALL_TESTS.flatMap(t => (t.profiles ?? []).filter(p => !known.has(p)).map(p => `${t.id}→${p}`));
    expect(bad).toEqual([]);
  });

  it('dangerous tests are never part of the safe suite', () => {
    const { isSafeSuiteTest } = require('../src/testRunner/runner');
    const leaked = ALL_TESTS.filter(t => t.dangerous && isSafeSuiteTest(t)).map(t => t.id);
    expect(leaked).toEqual([]);
    const destructiveNotDangerous = ALL_TESTS.filter(t => t.risk === 'DESTRUCTIVE' && !t.dangerous).map(t => t.id);
    expect(destructiveNotDangerous).toEqual([]);
  });

  it('platform-restricted tests explain why', () => {
    const silent = ALL_TESTS.filter(t => t.platforms.length < 2 && !t.platformNote).map(t => t.id);
    expect(silent).toEqual([]);
  });
});

describe('SDK coverage', () => {
  const covered = new Set(ALL_TESTS.flatMap(t => t.covers));

  it('every inventoried capability is covered or explicitly explained', () => {
    const unexplained = API_INVENTORY.filter(a => {
      if (covered.has(a.id)) return false;
      return !((a.classification === 'NOT_CALLED' || a.classification === 'NOT_AVAILABLE') && a.note && a.note.length > 20);
    }).map(a => a.id);
    expect(unexplained).toEqual([]);
  });

  it('NOT_CALLED / NOT_AVAILABLE entries always carry a reason', () => {
    const noReason = API_INVENTORY.filter(a => (a.classification === 'NOT_CALLED' || a.classification === 'NOT_AVAILABLE') && !a.note).map(a => a.id);
    expect(noReason).toEqual([]);
  });

  it('reports totals (informational)', () => {
    const byClass: Record<string, number> = {};
    for (const a of API_INVENTORY) byClass[a.classification] = (byClass[a.classification] ?? 0) + 1;
    console.log(`inventory=${API_INVENTORY.length} tests=${ALL_TESTS.length} covered=${API_INVENTORY.filter(a => covered.has(a.id)).length}`, byClass);
    expect(API_INVENTORY.length).toBeGreaterThan(200);
  });
});
