/**
 * Id helpers. Hermes has no crypto.randomUUID, and adding a native RNG module
 * just for correlation ids is not worth it — these ids are correlation tokens,
 * not security material.
 */
const HEX = '0123456789abcdef';

function randomHex(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += HEX[Math.floor(Math.random() * 16)];
  }
  return out;
}

/** RFC-4122-shaped v4 id (non-cryptographic). */
export function uuidV4(): string {
  const h = randomHex(32);
  const variant = HEX[8 + Math.floor(Math.random() * 4)];
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/**
 * testRunId: sortable by time, globally unique in practice, safe in event
 * names/URLs/log search: `tr_20260927T161530Z_3f9a1c2b`.
 */
export function newTestRunId(now: Date = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  return `tr_${stamp}_${randomHex(8)}`;
}

/** Opaque fake user id — never an email. */
export function fakeUserId(runId: string, label: string): string {
  return `sdk_test_user_${label}_${runId}`;
}

export function shortId(): string {
  return randomHex(6);
}
