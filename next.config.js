/** @type {import('next').NextConfig} */

// Load environment variables from .env.local at build time
// This must happen synchronously before any async operations
const path = require('path');
const fs = require('fs');

// Manually load .env.local to ensure environment variables are available during build
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const dotenv = require('dotenv');
  dotenv.config({ path: envLocalPath });
  console.log('✅ Loaded .env.local for build-time configuration');
} else {
  console.warn('⚠️  .env.local not found at', envLocalPath);
}

// Validate environment variables synchronously at build time
// This ensures all required secrets are set before the build proceeds
if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
  console.log('\n🔍 Validating environment variables at build time...\n');
  try {
    const { validateEnvironmentOrThrow } = require('./lib/validate-env.js');
    validateEnvironmentOrThrow();
    console.log('✅ Environment validation passed!\n');
  } catch (error) {
    console.error('❌ Failed to validate environment:', error.message);
    process.exit(1);
  }
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      's.yimg.com',
      'i.imgur.com',
      'yahoofantasysports-res.cloudinary.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
