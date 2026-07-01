# King Bee Baseball

A Yahoo Fantasy League statistics viewer with interactive charts and real-time data visualization. This project provides a modern web interface for viewing and analyzing fantasy baseball league statistics, team performance metrics, and game data.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Key Technologies](#key-technologies)
- [Troubleshooting](#troubleshooting)
- [Development Notes](#development-notes)

## Overview

King Bee Baseball is a Next.js-based fantasy baseball statistics viewer that integrates with Yahoo Fantasy Sports API to display league data, team statistics, and performance charts. The platform supports OAuth authentication and provides real-time data visualization with an intuitive user interface.

### Key Features

- **Yahoo Fantasy League Integration**: Direct integration with Yahoo Fantasy Sports API
- **Interactive Charts**: Visualize team statistics and performance metrics with Chart.js
- **Team Statistics**: View detailed team stats, player performance, and league standings
- **Game Data**: Track game results and upcoming matchups
- **OAuth Authentication**: Secure login via GitHub and Yahoo Fantasy Sports
- **Real-time Updates**: Live data synchronization with Yahoo Fantasy API
- **Responsive Design**: Mobile-friendly interface for all devices

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher (or yarn v1.22.0+)
- **Git**: For version control

### Verify Installation

```bash
node --version
npm --version
git --version
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/drewtwo/kbb.git
cd kbb
```

### 2. Install Dependencies

```bash
npm install
```

Or if you prefer yarn:

```bash
yarn install
```

### 3. Set Up Environment Variables

Copy the example environment file and configure it with your values:

```bash
cp .env.example .env.local
```

See the [Environment Configuration](#environment-configuration) section for detailed setup instructions.

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Application
NODE_ENV=development
APP_URL=http://localhost:3000
APP_PORT=3000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# OAuth - GitHub
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# OAuth - Yahoo Fantasy Sports
YAHOO_CLIENT_ID=your-yahoo-client-id
YAHOO_CLIENT_SECRET=your-yahoo-client-secret
YAHOO_CALLBACK_URL=http://localhost:3000/api/auth/callback/yahoo

# Yahoo Fantasy API
YAHOO_API_BASE_URL=https://fantasysports.yahooapis.com/fantasy/v2
```

### OAuth Setup Guides

#### GitHub OAuth

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: King Bee Baseball
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Client Secret to your `.env.local`

#### Yahoo Fantasy Sports OAuth

1. Go to [Yahoo Developer Network](https://developer.yahoo.com/)
2. Sign in with your Yahoo account
3. Create a new application:
   - Go to "My Apps" > "Create an App"
   - Application name: King Bee Baseball
   - Application type: Web Application
4. Configure OAuth settings:
   - Redirect URI(s): `http://localhost:3000/api/auth/callback/yahoo`
5. Accept the terms and create the application
6. Copy the Client ID and Client Secret to your `.env.local`
7. Note: Yahoo Fantasy API requires OAuth 2.0 authentication for all requests

## Available Scripts

### Development

```bash
# Start development server with hot reload
npm run dev

# Start development server on specific port
npm run dev -- --port 3001
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Check TypeScript types
npm run typecheck
```

For comprehensive linting guidelines, type safety requirements, and best practices, see [AGENTS.md](AGENTS.md).

## Project Structure

```
kbb/
├── src/
│   ├── components/
│   │   ├── LeagueCard/        # League display component
│   │   ├── StatCard/          # Statistics card component
│   │   ├── GameCard/          # Game information component
│   │   ├── TeamStats/         # Team statistics display
│   │   └── Charts/            # Chart components
│   ├── pages/
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth authentication routes
│   │   │   ├── league/        # League data endpoints
│   │   │   ├── team/          # Team statistics endpoints
│   │   │   └── games/         # Game data endpoints
│   │   ├── league/            # League pages
│   │   ├── team/              # Team pages
│   │   ├── games/             # Games pages
│   │   └── index.tsx          # Home page
│   ├── lib/
│   │   ├── yahoo/             # Yahoo Fantasy API utilities
│   │   ├── auth/              # Authentication utilities
│   │   ├── charts/            # Chart configuration helpers
│   │   └── utils/             # General utilities
│   ├── types/
│   │   ├── index.ts           # Type definitions
│   │   ├── league.ts          # League types
│   │   ├── team.ts            # Team types
│   │   └── game.ts            # Game types
│   ├── styles/
│   │   ├── globals.css
│   │   └── variables.css
│   └── config/
│       ├── constants.ts
│       └── auth.ts
├── public/                    # Static assets
│   ├── images/
│   └── icons/
├── .env.example               # Example environment variables
├── .env.local                 # Local environment variables (git ignored)
├── .eslintrc.json            # ESLint configuration
├── tsconfig.json             # TypeScript configuration
├── next.config.js            # Next.js configuration
├── package.json              # Project dependencies
└── README.md                 # This file
```

## Key Technologies

### Frontend

- **Next.js**: React framework for production
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Interactive charting library
- **SWR**: Data fetching library

### Backend & Integration

- **Node.js**: JavaScript runtime
- **NextAuth.js**: Authentication for Next.js
- **xml2js**: XML to JSON parser for Yahoo API responses
- **Axios**: HTTP client for API requests

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting

## Troubleshooting

### Common Issues and Solutions

#### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
npm run dev -- --port 3001
```

#### Yahoo OAuth Authentication Fails

**Problem**: `Error: Invalid OAuth credentials` or redirect loop

**Solution**:
- Verify YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET are correct in .env.local
- Check that the redirect URI in Yahoo Developer settings matches exactly: `http://localhost:3000/api/auth/callback/yahoo`
- Ensure NEXTAUTH_URL is set correctly to `http://localhost:3000`
- Clear browser cookies and try again
- Verify your Yahoo account has permission to access Fantasy Sports API

#### Yahoo API Rate Limiting

**Problem**: `Error: 429 Too Many Requests` or `Rate limit exceeded`

**Solution**:
- Yahoo Fantasy API has rate limits; implement request caching with SWR
- Add delays between API requests in batch operations
- Use the `revalidateOnFocus: false` option in SWR to reduce unnecessary requests
- Cache API responses locally when possible
- Check Yahoo API documentation for current rate limits

#### Module Not Found

**Problem**: `Error: Cannot find module 'xyz'`

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

#### Chart Not Displaying

**Problem**: Charts appear blank or don't render

**Solution**:
- Verify Chart.js is properly installed: `npm list chart.js`
- Check that chart data is being fetched correctly
- Ensure canvas elements have proper dimensions
- Check browser console for JavaScript errors
- Verify data format matches Chart.js requirements

#### GitHub OAuth Not Working

**Problem**: GitHub login fails or redirects incorrectly

**Solution**:
- Verify GITHUB_ID and GITHUB_SECRET are correct
- Check that callback URL in GitHub OAuth settings matches: `http://localhost:3000/api/auth/callback/github`
- Ensure NEXTAUTH_SECRET is set in .env.local
- Clear browser cookies and session storage

### Getting Help

- Check the [GitHub Issues](https://github.com/drewtwo/kbb/issues)
- Review Yahoo Fantasy API documentation: https://developer.yahoo.com/fantasy/
- Enable debug mode: `DEBUG=* npm run dev`

## Development Notes

### Yahoo Fantasy API Integration

- The Yahoo Fantasy API returns XML responses; use xml2js to parse them
- All API requests require OAuth 2.0 authentication
- API endpoints follow the pattern: `/fantasy/v2/league/{league_id}/...`
- Cache API responses to minimize rate limit issues
- Implement exponential backoff for failed requests

### Chart Optimization

- Use Chart.js with responsive options for mobile compatibility
- Implement lazy loading for charts below the fold
- Use data aggregation to reduce the number of data points
- Consider using canvas rendering for better performance with large datasets
- Implement chart animations carefully to avoid performance issues

### Code Style

This project follows strict code style guidelines:

- **ESLint**: Enforces code quality rules
- **Prettier**: Ensures consistent formatting
- **TypeScript**: Provides type safety

Run quality checks before committing:

```bash
npm run lint
npm run typecheck
```

For detailed linting guidelines, configuration documentation, and best practices, see [AGENTS.md](AGENTS.md).

### Git Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and commit: `git commit -am 'Add feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Create a Pull Request on GitHub

### Commit Message Convention

Follow the Conventional Commits format:

```
type(scope): subject

body

footer
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `chore`

Example:
```
feat(league): add league statistics view

Implement league statistics page with team rankings
and performance charts.

Closes #123
```

### Performance Optimization

- Use React.memo for expensive components
- Implement code splitting with dynamic imports
- Optimize API requests with SWR caching
- Use Chart.js efficiently with proper data aggregation
- Monitor bundle size: `npm run build -- --analyze`

### Security Best Practices

- Never commit secrets to version control
- Use environment variables for sensitive data
- Validate and sanitize all user inputs
- Use HTTPS in production
- Keep dependencies updated: `npm audit`
- Review security advisories regularly
- Protect OAuth tokens securely

### Debugging

Enable debug logging:

```bash
DEBUG=* npm run dev
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run quality checks
5. Submit a pull request

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Support

For support, please open an issue on [GitHub](https://github.com/drewtwo/kbb/issues) or contact the development team.

---

**Last Updated**: 2024
**Maintained by**: Development Team
