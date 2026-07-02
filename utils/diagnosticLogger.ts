/**
 * diagnosticLogger.ts
 *
 * Centralised diagnostic logging utility for the kbb project.
 *
 * Verbosity is controlled by the NEXT_PUBLIC_DEBUG_STANDINGS environment
 * variable.  Set it to "true" (or "1") to enable verbose debug output.
 * When the variable is absent or falsy only error-level messages are emitted.
 *
 * Usage:
 *   import { diagLog, diagWarn, diagError, diagDump } from './diagnosticLogger';
 *
 *   diagLog('[myModule] Something happened', { key: 'value' });
 *   diagError('[myModule] Something failed', error);
 *   diagDump('[myModule] Full response object', responseData);
 */

// ─── Verbosity flag ──────────────────────────────────────────────────────────

/**
 * Returns true when verbose diagnostic logging is enabled via the
 * NEXT_PUBLIC_DEBUG_STANDINGS environment variable.
 */
export const isDebugEnabled = (): boolean => {
  const raw: string | undefined = process.env.NEXT_PUBLIC_DEBUG_STANDINGS;
  return raw === 'true' || raw === '1';
};

// ─── Log helpers ─────────────────────────────────────────────────────────────

/**
 * Emits a diagnostic INFO-level log message.
 * Only printed when NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 *
 * @param prefix - A bracketed module prefix, e.g. "[yahooData]"
 * @param message - The log message
 * @param data - Optional additional data to log
 */
export const diagLog = (prefix: string, message: string, data?: unknown): void => {
  if (!isDebugEnabled()) return;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

/**
 * Emits a diagnostic WARN-level log message.
 * Only printed when NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 *
 * @param prefix - A bracketed module prefix, e.g. "[yahooData]"
 * @param message - The warning message
 * @param data - Optional additional data to log
 */
export const diagWarn = (prefix: string, message: string, data?: unknown): void => {
  if (!isDebugEnabled()) return;
  if (data !== undefined) {
    console.warn(`${prefix} ${message}`, data);
  } else {
    console.warn(`${prefix} ${message}`);
  }
};

/**
 * Emits a diagnostic ERROR-level log message.
 * Always printed regardless of the NEXT_PUBLIC_DEBUG_STANDINGS flag, because
 * errors should never be silenced.
 *
 * @param prefix - A bracketed module prefix, e.g. "[yahooData]"
 * @param message - The error message
 * @param data - Optional additional data to log
 */
export const diagError = (prefix: string, message: string, data?: unknown): void => {
  if (data !== undefined) {
    console.error(`${prefix} ${message}`, data);
  } else {
    console.error(`${prefix} ${message}`);
  }
};

/**
 * Serialises a complex nested object and emits it as a formatted diagnostic
 * dump.  Only printed when NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 *
 * Large objects are truncated at MAX_DUMP_LENGTH characters to avoid flooding
 * logs.  Set NEXT_PUBLIC_DEBUG_STANDINGS=true to see the full dump.
 *
 * @param prefix - A bracketed module prefix, e.g. "[yahooData]"
 * @param label - A short description of what is being dumped
 * @param value - The value to serialise and dump
 * @param maxLength - Maximum number of characters to print (default: 4000)
 */
export const diagDump = (
  prefix: string,
  label: string,
  value: unknown,
  maxLength: number = 4000
): void => {
  if (!isDebugEnabled()) return;

  let serialised: string;
  try {
    serialised = JSON.stringify(value, null, 2);
  } catch (_err: unknown) {
    serialised = String(value);
  }

  const truncated: boolean = serialised.length > maxLength;
  const output: string = truncated
    ? `${serialised.slice(0, maxLength)}\n… [truncated — ${serialised.length - maxLength} chars omitted]`
    : serialised;

  console.log(`${prefix} DUMP — ${label}:\n${output}`);
};

/**
 * Logs a structured summary of an HTTP response for diagnostic purposes.
 * Only printed when NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 *
 * @param prefix - A bracketed module prefix
 * @param method - HTTP method (e.g. "GET")
 * @param url - The full request URL
 * @param statusCode - The HTTP status code received
 * @param statusMessage - The HTTP status message received
 * @param headers - The response headers object
 */
export const diagHttpResponse = (
  prefix: string,
  method: string,
  url: string,
  statusCode: number | undefined,
  statusMessage: string | undefined,
  headers: Record<string, string | string[] | undefined>
): void => {
  if (!isDebugEnabled()) return;

  const relevantHeaders: Record<string, string | string[] | undefined> = {};
  const interestingHeaders: string[] = [
    'content-type',
    'content-encoding',
    'x-yahoo-request-id',
    'x-ratelimit-requests-remaining',
    'retry-after',
    'www-authenticate',
    'location',
  ];

  for (const h of interestingHeaders) {
    if (headers[h] !== undefined) {
      relevantHeaders[h] = headers[h];
    }
  }

  console.log(
    `${prefix} HTTP ${method} ${url} → ${statusCode ?? 'unknown'} ${statusMessage ?? ''}`,
    { headers: relevantHeaders }
  );
};

/**
 * Logs a step-by-step extraction trace for a nested object path.
 * Useful for diagnosing where a deeply-nested property access fails.
 * Only printed when NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 *
 * @param prefix - A bracketed module prefix
 * @param steps - Array of { path, value } pairs representing each extraction step
 */
export const diagExtractionTrace = (
  prefix: string,
  steps: Array<{ path: string; value: unknown }>
): void => {
  if (!isDebugEnabled()) return;

  console.log(`${prefix} Extraction trace (${steps.length} step(s)):`);
  steps.forEach(({ path, value }: { path: string; value: unknown }, idx: number) => {
    const typeLabel: string = value === null ? 'null' : typeof value;
    const isArr: string = Array.isArray(value) ? ` (array[${(value as unknown[]).length}])` : '';
    const keys: string =
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? ` keys=[${Object.keys(value as object).join(', ')}]`
        : '';
    console.log(`  [${idx + 1}] ${path}: ${typeLabel}${isArr}${keys}`);
  });
};
