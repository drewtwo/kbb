/**
 * Environment Validation Module
 * 
 * This module validates that required environment variables are set at build time.
 * It runs during the Next.js build process to catch configuration issues early.
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Define required environment variables for build-time validation
 * These variables MUST be set for the application to build and run correctly
 */
const REQUIRED_ENV_VARS = [
  'NEXTAUTH_SECRET',
];

/**
 * Define optional environment variables that are recommended but not strictly required
 */
const RECOMMENDED_ENV_VARS = [
  'NEXTAUTH_URL',
  'YAHOO_CLIENT_ID',
  'YAHOO_CLIENT_SECRET',
  'YAHOO_AUTH_URL',
  'YAHOO_TOKEN_URL',
];

/**
 * Validate that all required environment variables are set
 * @returns {ValidationResult} Object containing validation status and any errors/warnings
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    
    if (!value) {
      errors.push(
        `Missing required environment variable: ${envVar}\n` +
        `  This variable is critical for the application to function.\n` +
        `  Please set it in your .env.local file (local development) or GitHub Secrets (production).`
      );
    } else if (value.trim() === '') {
      errors.push(
        `Environment variable ${envVar} is set but empty.\n` +
        `  Please provide a non-empty value.`
      );
    }
  }

  // Check recommended variables
  for (const envVar of RECOMMENDED_ENV_VARS) {
    const value = process.env[envVar];
    
    if (!value) {
      warnings.push(
        `Recommended environment variable not set: ${envVar}\n` +
        `  While not strictly required, this variable is recommended for proper functionality.`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate environment and throw an error if validation fails
 * This function is called during the build process
 * @throws {Error} If required environment variables are missing
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment();

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('\n⚠️  Environment Validation Warnings:\n');
    result.warnings.forEach((warning, index) => {
      console.warn(`${index + 1}. ${warning}\n`);
    });
  }

  // Throw error if validation failed
  if (!result.isValid) {
    console.error('\n❌ Environment Validation Failed:\n');
    result.errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}\n`);
    });
    
    throw new Error(
      'Environment validation failed. Please check the errors above and ensure all required ' +
      'environment variables are properly configured.'
    );
  }

  console.log('✅ Environment validation passed!\n');
}

/**
 * Get a summary of the validation status
 * @returns {string} Human-readable summary of validation status
 */
export function getValidationSummary(): string {
  const result = validateEnvironment();
  
  let summary = 'Environment Validation Summary:\n';
  summary += `  Required variables: ${REQUIRED_ENV_VARS.length}\n`;
  summary += `  Recommended variables: ${RECOMMENDED_ENV_VARS.length}\n`;
  summary += `  Errors: ${result.errors.length}\n`;
  summary += `  Warnings: ${result.warnings.length}\n`;
  summary += `  Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}\n`;
  
  return summary;
}
