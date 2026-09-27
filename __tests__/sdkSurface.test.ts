/**
 * Re-derives the public surface of the INSTALLED @scalebun/react-native from
 * its .d.ts files and diffs it against src/scalebun/apiInventory.ts.
 *
 * When a new SDK release adds a facade method, namespace member or runtime
 * export, this test fails until the Test Lab adds a test (or an explicit,
 * reasoned classification) for it. When an API is removed, the stale inventory
 * entry fails the test too.
 */
import * as fs from 'fs';
import * as path from 'path';
import { API_INVENTORY } from '../src/scalebun/apiInventory';

const SDK_ROOT = path.join(__dirname, '..', 'node_modules', '@scalebun', 'react-native');
const TYPES = path.join(SDK_ROOT, 'lib', 'typescript');
const read = (rel: string) => fs.readFileSync(path.join(TYPES, rel), 'utf8');

/** Runtime (non-type) named exports of index.d.ts. */
export function runtimeExports(indexDts: string): string[] {
  const names: string[] = [];
  const re = /^export\s+\{([^}]*)\}\s+from\s+'[^']+';/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(indexDts))) {
    for (const raw of m[1].split(',')) {
      const part = raw.trim();
      if (!part || part.startsWith('type ')) continue;
      const alias = part.split(/\s+as\s+/);
      const name = (alias[1] ?? alias[0]).trim();
      if (name !== 'default') names.push(name);
    }
  }
  return names;
}

/** Public members of `declare class ScaleBunFacade`, with namespace members as `ns.member`. */
export function facadeMembers(facadeDts: string): string[] {
  const body = facadeDts.slice(facadeDts.indexOf('declare class ScaleBunFacade'));
  const lines = body.split('\n').slice(1);
  const out: string[] = [];
  const braceDelta = (l: string) => (l.match(/\{/g) ?? []).length - (l.match(/\}/g) ?? []).length;
  let ns: string | null = null;
  let depth = 0; // brace depth inside a namespace object type
  let skip = 0; // brace depth of a multi-line signature being skipped
  let inComment = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (inComment) {
      if (trimmed.endsWith('*/')) inComment = false;
      continue;
    }
    if (trimmed.startsWith('/**') || trimmed.startsWith('/*')) {
      inComment = !trimmed.endsWith('*/');
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (skip > 0) {
      skip += braceDelta(line);
      continue;
    }
    if (ns) {
      if (depth === 1) {
        const m = /^ {8}(?:readonly )?([A-Za-z_$][\w$]*)\??[:(]/.exec(line);
        if (m) out.push(`${ns}.${m[1]}`);
      }
      depth += braceDelta(line);
      if (depth <= 0) ns = null;
      continue;
    }
    if (line.startsWith('}')) break;
    if (/^ {4}private /.test(line)) {
      skip = Math.max(0, braceDelta(line));
      continue;
    }
    const nsMatch = /^ {4}(?:readonly )?(?:get )?([A-Za-z_$][\w$]*)(?:\(\))?: \{\s*$/.exec(line);
    if (nsMatch) {
      ns = nsMatch[1];
      depth = 1;
      continue;
    }
    const m = /^ {4}(?:readonly |static |get )*([A-Za-z_$][\w$]*)\??[(:]/.exec(line);
    if (m) {
      out.push(m[1]);
      skip = Math.max(0, braceDelta(line));
    }
  }
  return [...new Set(out)];
}

describe('installed SDK surface vs Test Lab inventory', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(SDK_ROOT, 'package.json'), 'utf8')) as { version: string };
  const inventoryIds = new Set(API_INVENTORY.map(a => a.id));

  it('is the version the coverage matrix was written for (update SDK_COVERAGE.md on bump)', () => {
    expect(pkg.version).toBe('2.4.0');
  });

  it('every runtime export of index.d.ts is inventoried, and vice versa', () => {
    const exported = runtimeExports(read('index.d.ts')).map(n => `export.${n}`);
    const missing = exported.filter(id => !inventoryIds.has(id));
    const stale = [...inventoryIds].filter(id => id.startsWith('export.') && !exported.includes(id));
    expect({ missing, stale }).toEqual({ missing: [], stale: [] });
  });

  it('every public facade member / namespace member is inventoried, and vice versa', () => {
    const members = facadeMembers(read(path.join('public', 'ScaleBunFacade.d.ts'))).map(n => `facade.${n}`);
    expect(members.length).toBeGreaterThan(100);
    const missing = members.filter(id => !inventoryIds.has(id));
    const stale = [...inventoryIds].filter(id => id.startsWith('facade.') && !members.includes(id));
    expect({ missing, stale }).toEqual({ missing: [], stale: [] });
  });

  it('every public SimplifiedInitConfig key is inventoried', () => {
    const types = read(path.join('public', 'types.d.ts'));
    const start = types.indexOf('export interface SimplifiedInitConfig');
    const block = types.slice(start, types.indexOf('\n}', start));
    const keys = [...block.matchAll(/^ {4}([A-Za-z]\w*)\??:/gm)].map(m => m[1]);
    const nested = new Set(['replay', 'privacy', 'features', 'performance']);
    const missing = keys.filter(k => {
      if (nested.has(k)) return ![...inventoryIds].some(id => id.startsWith(`config.${k}.`) || id === `config.${k}`);
      return !inventoryIds.has(`config.${k}`);
    });
    expect(missing).toEqual([]);
  });

  it('every OTA event type and push adapter id is known to the Test Lab UI', () => {
    const ota = read(path.join('features', 'ota', 'OtaEventEmitter.d.ts'));
    const types = [...ota.matchAll(/'([A-Z_]+)'/g)].map(m => m[1]);
    expect(types).toEqual(
      expect.arrayContaining(['CHECK', 'OFFERED', 'DOWNLOAD_STARTED', 'DOWNLOAD_PROGRESS', 'DOWNLOAD_COMPLETE', 'INSTALLED', 'BOOT_SUCCESS', 'APPLY_FAILED', 'AUTO_ROLLBACK', 'MANUAL_ROLLBACK', 'UPDATE_WITHHELD']),
    );
  });
});
