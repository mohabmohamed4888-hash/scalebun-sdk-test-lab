/** Serialize anything for display/export without ever throwing. */
export function safeJson(value: unknown, space = 2): string {
  const seen = new WeakSet<object>();
  try {
    return (
      JSON.stringify(
        value,
        (_k, v: unknown) => {
          if (typeof v === 'bigint') return `${v.toString()}n`;
          if (typeof v === 'function') return `[function ${(v as { name?: string }).name || 'anonymous'}]`;
          if (v instanceof Error) return { name: v.name, message: v.message };
          if (typeof v === 'object' && v !== null) {
            if (seen.has(v)) return '[circular]';
            seen.add(v);
          }
          return v;
        },
        space,
      ) ?? String(value)
    );
  } catch (err) {
    return `[unserializable: ${String(err)}]`;
  }
}

/** Parse a JSON-ish clone for storage (drops functions, cycles, bigint → string). */
export function toPlain(value: unknown): unknown {
  const s = safeJson(value, 0);
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export function errorInfo(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack?.split('\n').slice(0, 8).join('\n') };
  }
  return { name: 'NonError', message: safeJson(err, 0) };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
