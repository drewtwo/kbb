# KBB - Knowledge Base Builder

A comprehensive knowledge base management system built with modern web technologies. This project provides a robust platform for creating, managing, and organizing knowledge base content with advanced features like OAuth authentication, real-time updates, and comprehensive search capabilities.

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

KBB is a full-stack knowledge base management application designed to help teams organize, share, and maintain their collective knowledge. The platform supports multiple authentication methods, real-time collaboration features, and a powerful search engine to quickly locate information.

### Key Features

- **User Authentication**: OAuth 2.0 integration with multiple providers
- **Knowledge Base Management**: Create, edit, and organize knowledge base articles
- **Search & Discovery**: Full-text search capabilities with advanced filtering
- **Real-time Updates**: Live synchronization across multiple clients
- **Role-based Access Control**: Granular permission management
- **API-First Architecture**: RESTful API with comprehensive documentation

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher (or yarn v1.22.0+)
- **Git**: For version control
- **Docker** (optional): For containerized deployment
- **PostgreSQL**: v12 or higher (if using local database)

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

### 4. Initialize the Database

```bash
npm run db:setup
```

This will create the necessary database tables and seed initial data if needed.

### 5. Start Development Server

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
APP_NAME=KBB
APP_URL=http://localhost:3000
APP_PORT=3000
APP_SECRET=your-secret-key-here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/kbb_dev
DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=5000

# Authentication
AUTH_SECRET=your-auth-secret-key
AUTH_ENABLED=true

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# OAuth - Microsoft
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_CALLBACK_URL=http://localhost:3000/auth/microsoft/callback

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@kbb.local

# API Configuration
API_RATE_LIMIT=100
API_RATE_LIMIT_WINDOW=15m

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Session
SESSION_SECRET=your-session-secret
SESSION_TIMEOUT=86400

# Redis (optional, for caching and sessions)
REDIS_URL=redis://localhost:6379
REDIS_DB=0
```

### OAuth Setup Guides

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://yourdomain.com/auth/google/callback` (production)
6. Copy the Client ID and Client Secret to your `.env.local`

#### GitHub OAuth

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: KBB
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Copy the Client ID and Client Secret to your `.env.local`

#### Microsoft OAuth

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory > App registrations
3. Click "New registration"
4. Configure redirect URIs:
   - `http://localhost:3000/auth/microsoft/callback` (development)
   - `https://yourdomain.com/auth/microsoft/callback` (production)
5. Create a client secret
6. Copy the Application (client) ID and client secret to your `.env.local`

### Database Configuration

#### PostgreSQL Setup

```bash
# Create database
createdb kbb_dev

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

#### Using Docker

```bash
# Start PostgreSQL in Docker
docker run --name kbb-postgres \
  -e POSTGRES_USER=kbb_user \
  -e POSTGRES_PASSWORD=kbb_password \
  -e POSTGRES_DB=kbb_dev \
  -p 5432:5432 \
  -d postgres:14

# Update DATABASE_URL in .env.local
DATABASE_URL=postgresql://kbb_user:kbb_password@localhost:5432/kbb_dev
```

## Available Scripts

### Development

```bash
# Start development server with hot reload
npm run dev

# Start development server with debugging
npm run dev:debug

# Run development server on specific port
npm run dev -- --port 3001
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm run start

# Build and start in one command
npm run build && npm run start
```

### Database

```bash
# Run database migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Seed database with initial data
npm run db:seed

# Reset database (development only)
npm run db:reset

# Generate migration file
npm run db:generate-migration <name>
```

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- <filename>

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Run TypeScript type checking
npm run type-check

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check

# Run all quality checks
npm run quality-check
```

### Documentation

```bash
# Generate API documentation
npm run docs:api

# Generate project documentation
npm run docs:generate

# Serve documentation locally
npm run docs:serve
```

### Utilities

```bash
# Clean build artifacts
npm run clean

# Install dependencies
npm install

# Update dependencies
npm update

# Audit dependencies for vulnerabilities
npm audit

# Fix security vulnerabilities
npm audit fix
```

## Project Structure

```
kbb/
├── src/
│   ├── api/                    # API routes and controllers
│   │   ├── auth/              # Authentication endpoints
│   │   ├── articles/          # Article management endpoints
│   │   ├── search/            # Search endpoints
│   │   └── users/             # User management endpoints
│   ├── components/            # React components
│   │   ├── common/            # Reusable components
│   │   ├── layout/            # Layout components
│   │   ├── articles/          # Article-related components
│   │   └── auth/              # Authentication components
│   ├── pages/                 # Next.js pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── articles/          # Article pages
│   │   └── index.tsx          # Home page
│   ├── lib/                   # Utility functions and helpers
│   │   ├── auth/              # Authentication utilities
│   │   ├── db/                # Database utilities
│   │   ├── api/               # API client utilities
│   │   └── utils/             # General utilities
│   ├── middleware/            # Express/Next.js middleware
│   │   ├── auth.ts            # Authentication middleware
│   │   ├── errorHandler.ts    # Error handling middleware
│   │   └── logging.ts         # Logging middleware
│   ├── models/                # Data models and schemas
│   │   ├── Article.ts
│   │   ├── User.ts
│   │   └── Category.ts
│   ├── services/              # Business logic services
│   │   ├── ArticleService.ts
│   │   ├── UserService.ts
│   │   ├── SearchService.ts
│   │   └── AuthService.ts
│   ├── types/                 # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── api.ts
│   │   └── models.ts
│   ├── styles/                # Global styles
│   │   ├── globals.css
│   │   └── variables.css
│   └── config/                # Configuration files
│       ├── database.ts
│       ├── auth.ts
│       └── constants.ts
├── public/                    # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
├── tests/                     # Test files
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # End-to-end tests
├── migrations/                # Database migrations
├── docs/                      # Documentation
├── .env.example               # Example environment variables
├── .env.local                 # Local environment variables (git ignored)
├── .eslintrc.json            # ESLint configuration
├── .prettierrc.json          # Prettier configuration
├── tsconfig.json             # TypeScript configuration
├── next.config.js            # Next.js configuration
├── jest.config.js            # Jest configuration
├── package.json              # Project dependencies
└── README.md                 # This file
```

## Key Technologies

### Frontend

- **Next.js**: React framework for production
- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **SWR**: Data fetching library
- **React Query**: Server state management
- **Zustand**: Client state management

### Backend

- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **TypeScript**: Type-safe JavaScript
- **PostgreSQL**: Relational database
- **Prisma**: ORM for database access
- **Passport.js**: Authentication middleware
- **JWT**: Token-based authentication

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **Cypress**: E2E testing
- **Docker**: Containerization
- **GitHub Actions**: CI/CD

### DevOps & Deployment

- **Docker**: Container platform
- **Docker Compose**: Multi-container orchestration
- **Vercel**: Frontend deployment (optional)
- **Heroku**: Backend deployment (optional)
- **GitHub Actions**: Continuous integration

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

#### Database Connection Error

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

# Start PostgreSQL (Linux with systemd)
sudo systemctl start postgresql

# Verify DATABASE_URL in .env.local is correct
```

#### OAuth Callback URL Mismatch

**Problem**: `Error: Redirect URI mismatch`

**Solution**:
- Verify the callback URL in your OAuth provider settings matches exactly
- Check for trailing slashes and protocol (http vs https)
- Ensure APP_URL in .env.local matches your OAuth configuration

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

#### TypeScript Compilation Error

**Problem**: `error TS2307: Cannot find module`

**Solution**:
```bash
# Run type checking
npm run type-check

# Rebuild TypeScript
npm run build

# Clear cache and rebuild
rm -rf .next dist
npm run build
```

#### Authentication Issues

**Problem**: Session not persisting or login not working

**Solution**:
- Verify SESSION_SECRET is set in .env.local
- Check that cookies are enabled in your browser
- Clear browser cookies and cache
- Verify AUTH_ENABLED=true in .env.local
- Check OAuth credentials are correct

#### Slow Performance

**Problem**: Application running slowly

**Solution**:
```bash
# Check database query performance
npm run db:analyze

# Enable query logging
LOG_LEVEL=debug npm run dev

# Check for memory leaks
npm run test:memory

# Profile application
npm run profile
```

### Getting Help

- Check the [GitHub Issues](https://github.com/drewtwo/kbb/issues)
- Review the [Documentation](./docs)
- Check logs: `tail -f logs/app.log`
- Enable debug mode: `DEBUG=kbb:* npm run dev`

## Development Notes

### Code Style

This project follows strict code style guidelines:

- **ESLint**: Enforces code quality rules
- **Prettier**: Ensures consistent formatting
- **TypeScript**: Provides type safety

Run quality checks before committing:

```bash
npm run quality-check
```

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

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(auth): add Google OAuth integration

Implement Google OAuth 2.0 authentication flow
with automatic user profile sync.

Closes #123
```

### Testing Guidelines

- Write tests for all new features
- Aim for >80% code coverage
- Use descriptive test names
- Mock external dependencies

```bash
# Run tests before committing
npm run test:coverage
```

### Performance Optimization

- Use React.memo for expensive components
- Implement code splitting with dynamic imports
- Optimize database queries with proper indexing
- Use caching strategies for API responses
- Monitor bundle size: `npm run build -- --analyze`

### Security Best Practices

- Never commit secrets to version control
- Use environment variables for sensitive data
- Validate and sanitize all user inputs
- Implement CSRF protection
- Use HTTPS in production
- Keep dependencies updated: `npm audit`
- Review security advisories regularly

### Database Best Practices

- Always write migrations for schema changes
- Test migrations in development first
- Keep migrations small and focused
- Document complex queries
- Use indexes for frequently queried columns
- Monitor query performance

### Debugging

Enable debug logging:

```bash
DEBUG=kbb:* npm run dev
```

Use VS Code debugger:

```bash
npm run dev:debug
```

Then attach VS Code debugger to the running process.

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Run quality checks
6. Submit a pull request

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Support

For support, please open an issue on [GitHub](https://github.com/drewtwo/kbb/issues) or contact the development team.

---

**Last Updated**: 2024
**Maintained by**: Development Team
