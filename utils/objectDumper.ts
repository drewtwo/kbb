/**
 * Object dumper utility for serializing and pretty-printing complex nested objects.
 * Useful for debugging logs and browser console output.
 */

/**
 * Configuration for object dumping behavior.
 */
interface DumpOptions {
  /** Maximum depth to traverse (default: 10) */
  maxDepth?: number;
  /** Maximum string length before truncation (default: 500) */
  maxStringLength?: number;
  /** Whether to include null values (default: true) */
  includeNull?: boolean;
  /** Whether to include undefined values (default: false) */
  includeUndefined?: boolean;
}

/**
 * Safely converts a value to a string representation, handling circular references
 * and complex types.
 * @param value - The value to convert
 * @param depth - Current recursion depth
 * @param options - Dump options
 * @returns A string representation of the value
 */
const valueToString = (
  value: unknown,
  depth: number = 0,
  options: DumpOptions = {}
): string => {
  const maxDepth = options.maxDepth ?? 10;
  const maxStringLength = options.maxStringLength ?? 500;

  // Handle null and undefined
  if (value === null) {
    return options.includeNull !== false ? 'null' : '[null]';
  }
  if (value === undefined) {
    return options.includeUndefined ? 'undefined' : '[undefined]';
  }

  // Handle primitives
  if (typeof value === 'string') {
    const truncated =
      value.length > maxStringLength
        ? `${value.substring(0, maxStringLength)}... [truncated ${value.length - maxStringLength} chars]`
        : value;
    return `"${truncated}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // Handle functions
  if (typeof value === 'function') {
    return '[Function]';
  }

  // Handle symbols
  if (typeof value === 'symbol') {
    return `[Symbol: ${String(value)}]`;
  }

  // Prevent infinite recursion
  if (depth >= maxDepth) {
    return '[Max depth reached]';
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = value
      .slice(0, 10)
      .map((item) => valueToString(item, depth + 1, options));
    const truncated = value.length > 10 ? ` ... +${value.length - 10} more` : '';
    return `[${items.join(', ')}${truncated}]`;
  }

  // Handle objects
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) {
      return '{}';
    }
    const pairs = keys
      .slice(0, 10)
      .map((key) => {
        const val = (value as Record<string, unknown>)[key];
        const valStr = valueToString(val, depth + 1, options);
        return `${key}: ${valStr}`;
      });
    const truncated = keys.length > 10 ? ` ... +${keys.length - 10} more` : '';
    return `{ ${pairs.join(', ')}${truncated} }`;
  }

  return String(value);
};

/**
 * Dumps an object to a formatted string representation.
 * Handles circular references, deep nesting, and large objects gracefully.
 * @param obj - The object to dump
 * @param options - Dump options
 * @returns A formatted string representation
 */
export const dumpObject = (obj: unknown, options: DumpOptions = {}): string => {
  try {
    return valueToString(obj, 0, options);
  } catch (err) {
    return `[Error dumping object: ${err instanceof Error ? err.message : 'Unknown error'}]`;
  }
};

/**
 * Dumps an object to a pretty-printed JSON string.
 * Falls back to a safe representation if JSON serialization fails.
 * @param obj - The object to dump
 * @param indent - Number of spaces for indentation (default: 2)
 * @returns A pretty-printed JSON string
 */
export const dumpObjectAsJson = (obj: unknown, indent: number = 2): string => {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (_err) {
    // Fallback to safe dump if JSON serialization fails (e.g., circular references)
    return dumpObject(obj, { maxDepth: 5 });
  }
};

/**
 * Creates a summary of an object showing its top-level structure.
 * Useful for quick diagnostics without full serialization.
 * @param obj - The object to summarize
 * @returns A summary string
 */
export const summarizeObject = (obj: unknown): string => {
  if (obj === null) {
    return 'null';
  }
  if (obj === undefined) {
    return 'undefined';
  }
  if (typeof obj !== 'object') {
    return `${typeof obj}: ${String(obj).substring(0, 50)}`;
  }
  if (Array.isArray(obj)) {
    return `Array[${obj.length}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>);
  return `Object{${keys.join(', ')}}`;
};

/**
 * Extracts a specific path from a nested object for diagnostic purposes.
 * @param obj - The object to extract from
 * @param path - Dot-separated path (e.g., "league.teams.team")
 * @returns The value at the path, or undefined if not found
 */
export const extractPath = (obj: unknown, path: string): unknown => {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
};

/**
 * Lists all keys at each level of a nested object structure.
 * Useful for understanding the shape of an object without full serialization.
 * @param obj - The object to analyze
 * @param maxDepth - Maximum depth to traverse (default: 3)
 * @returns A string showing the structure
 */
export const describeObjectStructure = (obj: unknown, maxDepth: number = 3): string => {
  const lines: string[] = [];

  const traverse = (current: unknown, depth: number, prefix: string) => {
    if (depth > maxDepth) {
      lines.push(`${prefix}[max depth reached]`);
      return;
    }

    if (current === null || current === undefined) {
      lines.push(`${prefix}${typeof current}`);
      return;
    }

    if (typeof current !== 'object') {
      lines.push(`${prefix}${typeof current}`);
      return;
    }

    if (Array.isArray(current)) {
      lines.push(`${prefix}Array[${current.length}]`);
      if (current.length > 0 && depth < maxDepth) {
        traverse(current[0], depth + 1, `${prefix}  [0]:`);
      }
      return;
    }

    const keys = Object.keys(current as Record<string, unknown>);
    lines.push(`${prefix}Object{${keys.length} keys}`);
    for (const key of keys.slice(0, 5)) {
      const val = (current as Record<string, unknown>)[key];
      if (depth < maxDepth) {
        traverse(val, depth + 1, `${prefix}  .${key}:`);
      }
    }
    if (keys.length > 5) {
      lines.push(`${prefix}  ... +${keys.length - 5} more keys`);
    }
  };

  traverse(obj, 0, '');
  return lines.join('\n');
};
