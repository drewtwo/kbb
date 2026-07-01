/**
 * Environment Variable Validation Module
 * 
 * This module validates that all required environment variables are set
 * at build time. It provides clear error messages listing which secrets
 * are missing.
 * 
 * This is a CommonJS module (not ES6) to be compatible with next.config.js
 * and the build script which require() it synchronously.
 */

// Load .env.local if it exists (for local development and build time)
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

/**
 * List of required environment variables that must be set for the build to succeed
 */
const REQUIRED_ENV_VARS = [
  'NEXTAUTH_SECRET',
];

/**
 * List of recommended environment variables for full functionality
 */
const RECOMMENDED_ENV_VARS = [
  'YAHOO_CLIENT_ID',
  'YAHOO_CLIENT_SECRET',
  'YAHOO_AUTH_URL',
  'YAHOO_TOKEN_URL',
];

/**
 * Validates that all required environment variables are set and non-empty
 * Throws an error with a clear message if any are missing
 */
function validateEnvironmentOrThrow() {
  const missingRequired = [];
  const missingRecommended = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingRequired.push(varName);
    }
  }

  // Check recommended variables
  for (const varName of RECOMMENDED_ENV_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingRecommended.push(varName);
    }
  }

  // If any required variables are missing, throw an error
  if (missingRequired.length > 0) {
    const errorMessage = buildErrorMessage(missingRequired, missingRecommended);
    throw new Error(errorMessage);
  }

  // Log warnings for missing recommended variables (but don't fail)
  if (missingRecommended.length > 0) {
    const warningMessage = buildWarningMessage(missingRecommended);
    console.warn(warningMessage);
  }
}

/**
 * Builds a detailed error message for missing required variables
 */
function buildErrorMessage(missing, missingRecommended) {
  let message = '\n❌ Environment validation failed!\n\n';
  message += 'The following REQUIRED environment variables are missing or empty:\n';
  
  for (const varName of missing) {
    message += `  • ${varName}\n`;
  }

  message += '\n📋 How to fix:\n';
  message += '  1. Generate a secret: openssl rand -base64 32\n';
  message += '  2. For local development: Add to .env.local\n';
  message += '  3. For production: Add as GitHub Secret\n';
  message += '\n📚 For more information, see docs/ENVIRONMENT_SETUP.md\n';

  if (missingRecommended.length > 0) {
    message += '\n⚠️  The following RECOMMENDED variables are also missing:\n';
    for (const varName of missingRecommended) {
      message += `  • ${varName}\n`;
    }
  }

  return message;
}

/**
 * Builds a warning message for missing recommended variables
 */
function buildWarningMessage(missing) {
  let message = '\n⚠️  Warning: The following RECOMMENDED environment variables are missing:\n';
  
  for (const varName of missing) {
    message += `  • ${varName}\n`;
  }

  message += '\nThe application may not function correctly without these variables.\n';
  message += 'See docs/ENVIRONMENT_SETUP.md for more information.\n';

  return message;
}

// Export using CommonJS syntax
module.exports = {
  validateEnvironmentOrThrow,
};
