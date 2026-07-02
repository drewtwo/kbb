/**
 * Diagnostic logging utility for detailed debug output.
 * Centralizes and formats debug information for API responses and data extraction failures.
 * Respects the NEXT_PUBLIC_DEBUG_STANDINGS environment variable to control verbosity.
 */

/**
 * Check if diagnostic logging is enabled via environment variable.
 * Defaults to false in production, can be enabled by setting NEXT_PUBLIC_DEBUG_STANDINGS=true
 */
const isDiagnosticsEnabled = (): boolean => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NEXT_PUBLIC_DEBUG_STANDINGS === 'true';
  }
  return false;
};

/**
 * Logs a diagnostic message with a standardized prefix.
 * Only logs if NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 * @param module - The module name (e.g., "yahooData", "leagueinfo-api")
 * @param message - The message to log
 * @param data - Optional data object to log
 */
export const logDiagnostic = (
  module: string,
  message: string,
  data?: unknown
): void => {
  if (!isDiagnosticsEnabled()) {
    return;
  }
  const prefix = `[DIAG:${module}]`;
  if (data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
};

/**
 * Logs a diagnostic warning message.
 * Only logs if NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 * @param module - The module name
 * @param message - The message to log
 * @param data - Optional data object to log
 */
export const logDiagnosticWarn = (
  module: string,
  message: string,
  data?: unknown
): void => {
  if (!isDiagnosticsEnabled()) {
    return;
  }
  const prefix = `[DIAG:${module}]`;
  if (data !== undefined) {
    console.warn(`${prefix} ${message}`, data);
  } else {
    console.warn(`${prefix} ${message}`);
  }
};

/**
 * Logs a diagnostic error message.
 * Only logs if NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 * @param module - The module name
 * @param message - The message to log
 * @param data - Optional data object to log
 */
export const logDiagnosticError = (
  module: string,
  message: string,
  data?: unknown
): void => {
  if (!isDiagnosticsEnabled()) {
    return;
  }
  const prefix = `[DIAG:${module}]`;
  if (data !== undefined) {
    console.error(`${prefix} ${message}`, data);
  } else {
    console.error(`${prefix} ${message}`);
  }
};

/**
 * Logs a complete JSON dump of an object for diagnostic purposes.
 * Only logs if NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 * @param module - The module name
 * @param label - A descriptive label for the dump
 * @param obj - The object to dump
 */
export const logDiagnosticDump = (
  module: string,
  label: string,
  obj: unknown
): void => {
  if (!isDiagnosticsEnabled()) {
    return;
  }
  const prefix = `[DIAG:${module}]`;
  try {
    const jsonStr = JSON.stringify(obj, null, 2);
    console.log(`${prefix} ${label}:\n${jsonStr}`);
  } catch (err) {
    console.log(`${prefix} ${label}: [Unable to serialize to JSON]`, obj);
  }
};

/**
 * Logs HTTP response metadata for diagnostic purposes.
 * Only logs if NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 * @param module - The module name
 * @param statusCode - HTTP status code
 * @param statusMessage - HTTP status message
 * @param headers - Response headers object
 */
export const logDiagnosticHttpResponse = (
  module: string,
  statusCode: number | undefined,
  statusMessage: string | undefined,
  headers: Record<string, string | string[] | undefined>
): void => {
  if (!isDiagnosticsEnabled()) {
    return;
  }
  const prefix = `[DIAG:${module}]`;
  console.log(`${prefix} HTTP Response: status=${statusCode} ${statusMessage}`, {
    'content-type': headers['content-type'],
    'content-encoding': headers['content-encoding'],
    'x-rate-limit-remaining': headers['x-rate-limit-remaining'],
    'x-rate-limit-reset': headers['x-rate-limit-reset'],
  });
};

/**
 * Logs a validation failure with context information.
 * Only logs if NEXT_PUBLIC_DEBUG_STANDINGS is enabled.
 * @param module - The module name
 * @param validationStep - Description of the validation step that failed
 * @param reason - Why the validation failed
 * @param context - Additional context information
 */
export const logDiagnosticValidationFailure = (
  module: string,
  validationStep: string,
  reason: string,
  context?: unknown
): void => {
  if (!isDiagnosticsEnabled()) {
    return;
  }
  const prefix = `[DIAG:${module}]`;
  console.error(`${prefix} Validation failed at: ${validationStep}`, {
    reason,
    context,
  });
};
