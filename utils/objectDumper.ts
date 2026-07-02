/**
 * objectDumper.ts
 *
 * Utility functions for serialising and pretty-printing complex nested objects.
 * Designed to make diagnostic output in logs and the browser console easier to
 * read when debugging standings data failures.
 *
 * All functions are pure (no side-effects) and safe to call in both Node.js
 * (server-side) and browser environments.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Options for controlling how an object is serialised.
 */
export interface DumpOptions {
  /**
   * Maximum number of characters to include in the output before truncating.
   * Defaults to 8000.
   */
  maxLength?: number;
  /**
   * Number of spaces to use for JSON indentation.
   * Defaults to 2.
   */
  indent?: number;
  /**
   * When true, circular references are replaced with the string "[Circular]"
   * instead of throwing.  Defaults to true.
   */
  handleCircular?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a JSON.stringify replacer function that replaces circular references
 * with the string "[Circular]" so that serialisation never throws.
 */
const circularReplacer = (): ((key: string, value: unknown) => unknown) => {
  const seen: WeakSet<object> = new WeakSet();
  return (_key: string, value: unknown): unknown => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value as object)) {
        return '[Circular]';
      }
      seen.add(value as object);
    }
    return value;
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Serialises `value` to a pretty-printed JSON string, optionally truncating
 * the result to `maxLength` characters.
 *
 * Circular references are handled gracefully (replaced with "[Circular]").
 * Non-serialisable values (e.g. functions, Symbols) are omitted by
 * JSON.stringify's default behaviour.
 *
 * @param value - The value to serialise
 * @param options - Serialisation options
 * @returns A pretty-printed JSON string, possibly truncated
 */
export const dumpObject = (value: unknown, options: DumpOptions = {}): string => {
  const {
    maxLength = 8000,
    indent = 2,
    handleCircular = true,
  }: DumpOptions = options;

  let serialised: string;
  try {
    const replacer: ((key: string, value: unknown) => unknown) | undefined = handleCircular
      ? circularReplacer()
      : undefined;
    serialised = JSON.stringify(value, replacer, indent);
  } catch (_err: unknown) {
    // Fallback for values that cannot be serialised at all
    serialised = String(value);
  }

  if (serialised.length <= maxLength) {
    return serialised;
  }

  const omitted: number = serialised.length - maxLength;
  return `${serialised.slice(0, maxLength)}\n… [truncated — ${omitted} more character(s)]`;
};

/**
 * Returns a compact one-line summary of `value` suitable for embedding in a
 * longer log message.  The summary includes the type, array length (if
 * applicable), and top-level keys (if it is a plain object).
 *
 * @param value - The value to summarise
 * @returns A short human-readable description string
 */
export const summariseValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (typeof value === 'object') {
    const keys: string[] = Object.keys(value as object);
    const keyList: string = keys.slice(0, 10).join(', ');
    const extra: string = keys.length > 10 ? ` … +${keys.length - 10} more` : '';
    return `object { ${keyList}${extra} }`;
  }

  if (typeof value === 'string') {
    const preview: string = value.length > 80 ? `${value.slice(0, 80)}…` : value;
    return `string(${value.length}) "${preview}"`;
  }

  return `${typeof value}(${String(value)})`;
};

/**
 * Walks a nested object using a dot-separated path string and returns the
 * value at that path, or `undefined` if any segment is missing.
 *
 * Example:
 *   getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c') // → 42
 *   getNestedValue({ a: {} }, 'a.b.c')                // → undefined
 *
 * @param obj - The root object to walk
 * @param path - Dot-separated property path (e.g. "league.teams.team")
 * @returns The value at the path, or undefined if not found
 */
export const getNestedValue = (obj: unknown, path: string): unknown => {
  const segments: string[] = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

/**
 * Produces a multi-line extraction trace string showing the value at each
 * step of a dot-separated path walk.  Useful for diagnosing where a deeply-
 * nested property access fails.
 *
 * @param obj - The root object to walk
 * @param path - Dot-separated property path (e.g. "league.teams.team")
 * @returns A formatted multi-line string showing each step
 */
export const traceObjectPath = (obj: unknown, path: string): string => {
  const segments: string[] = path.split('.');
  const lines: string[] = [`Path trace for "${path}":`];
  let current: unknown = obj;

  for (let i: number = 0; i < segments.length; i++) {
    const segment: string = segments[i];
    const partialPath: string = segments.slice(0, i + 1).join('.');

    if (current === null || current === undefined || typeof current !== 'object') {
      lines.push(`  [${i + 1}] .${partialPath}: CANNOT DESCEND — parent is ${summariseValue(current)}`);
      break;
    }

    current = (current as Record<string, unknown>)[segment];
    lines.push(`  [${i + 1}] .${partialPath}: ${summariseValue(current)}`);
  }

  return lines.join('\n');
};

/**
 * Compares the actual keys of an object against a list of expected keys and
 * returns a diagnostic report string highlighting missing and unexpected keys.
 *
 * @param obj - The object to inspect
 * @param expectedKeys - The keys that are expected to be present
 * @param label - A label for the object (used in the report header)
 * @returns A formatted diagnostic report string
 */
export const diagnoseObjectShape = (
  obj: unknown,
  expectedKeys: string[],
  label: string = 'object'
): string => {
  if (obj === null || obj === undefined) {
    return `Shape diagnosis for "${label}": value is ${obj === null ? 'null' : 'undefined'}`;
  }

  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return `Shape diagnosis for "${label}": value is ${summariseValue(obj)} (not a plain object)`;
  }

  const actualKeys: string[] = Object.keys(obj as object);
  const missing: string[] = expectedKeys.filter((k: string) => !actualKeys.includes(k));
  const unexpected: string[] = actualKeys.filter((k: string) => !expectedKeys.includes(k));

  const lines: string[] = [
    `Shape diagnosis for "${label}":`,
    `  Actual keys   (${actualKeys.length}): [${actualKeys.join(', ')}]`,
    `  Expected keys (${expectedKeys.length}): [${expectedKeys.join(', ')}]`,
    `  Missing       (${missing.length}): [${missing.join(', ') || 'none'}]`,
    `  Unexpected    (${unexpected.length}): [${unexpected.join(', ') || 'none'}]`,
  ];

  return lines.join('\n');
};
