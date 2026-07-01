/** @type {import('next').NextConfig} */

// Import environment validation module
// This will validate required environment variables at build time
// eslint-disable-next-line global-require
const { validateEnvironmentOrThrow } = require('./lib/validate-env.ts');

// Validate environment variables during build
// This ensures all required secrets are set before the build proceeds
if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
  console.log('\n🔍 Validating environment variables at build time...\n');
  validateEnvironmentOrThrow();
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
