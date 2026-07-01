/** @type {import('next').NextConfig} */

// Import environment validation module asynchronously
// This will validate required environment variables at build time
// Using dynamic import() to avoid ESLint global-require error

let nextConfig = {
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

// Validate environment variables during build
// This ensures all required secrets are set before the build proceeds
(async () => {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('\n🔍 Validating environment variables at build time...\n');
    try {
      const { validateEnvironmentOrThrow } = await import('./lib/validate-env.js');
      validateEnvironmentOrThrow();
    } catch (error) {
      console.error('Failed to validate environment:', error.message);
      process.exit(1);
    }
  }
})();

module.exports = nextConfig;
