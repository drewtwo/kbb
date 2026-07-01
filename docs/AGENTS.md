# AI Agent Guidelines for KBB Project

This document provides guidelines, known issues, and solutions for AI agents (LLMs) working on the KBB (Next Auth KBB) project.

## Project Overview

**KBB** is a Next.js 15 application with TypeScript, NextAuth for authentication, React 19, and various utilities for managing league and team data. The project uses Yahoo data integration and includes protected routes, API endpoints, and chart visualizations.

### Key Technologies
- **Next.js**: 15.1.3
- **React**: 19.0.0
- **TypeScript**: 5.7.2
- **NextAuth**: 4.24.14
- **ESLint**: 9.0.0
- **Node.js**: >=20.0.0
- **Package Manager**: Yarn (>=1.22.0)

## Project Structure

```
kbb/
├── pages/                    # Next.js pages and API routes
│   ├── api/                 # API endpoints
│   │   ├── auth/           # NextAuth configuration
│   │   ├── examples/       # Example endpoints
│   │   ├── leagueinfo/     # League data endpoints
│   │   ├── teams.ts        # Teams endpoint
│   │   └── teamstats/      # Team statistics endpoints
│   ├── game/               # Game-related pages with dynamic routes
│   ├── index.tsx           # Home page
│   ├── protected.tsx       # Protected route example
│   ├── teams.tsx           # Teams page
│   ├── teamstable.tsx      # Teams table page
│   └── _app.tsx            # App wrapper
├── components/             # React components
│   ├── header.tsx          # Header component
│   ├── footer.tsx          # Footer component
│   ├── layout.tsx          # Layout wrapper
│   ├── leaguecard.tsx      # League card component
│   ├── statcard.tsx        # Statistics card component
│   └── access-denied.tsx   # Access denied component
├── utils/                  # Utility functions
│   └── yahooData.ts        # Yahoo data integration
├── types/                  # TypeScript type definitions
│   ├── next.d.ts          # Next.js types
│   ├── next-auth.d.ts     # NextAuth types
│   └── environment.d.ts   # Environment variable types
├── styles/                # CSS modules and global styles
├── public/                # Static assets
├── certificates/          # SSL certificates for local development
├── docs/                  # Documentation
├── .github/workflows/     # GitHub Actions workflows
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── next.config.js        # Next.js configuration
├── .eslintrc.json        # ESLint configuration
├── .env.example          # Environment variables template
└── yarn.lock             # Yarn lock file

```

## Common Tasks & Solutions

### Running the Project

```bash
# Install dependencies
yarn install

# Development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Lint code
yarn lint

# Type check
yarn typecheck
```

### Environment Setup

1. Copy `.env.example` to `.env.local`
2. Configure NextAuth credentials and providers
3. Set up Yahoo API credentials if needed
4. See `docs/ENVIRONMENT_SETUP.md` for detailed instructions

### Adding New API Routes

1. Create a new file in `pages/api/`
2. Export a default handler function: `export default function handler(req, res)`
3. Use NextAuth session for protected routes: `const session = await getSession({ req })`
4. Return JSON responses

Example:
```typescript
import { getSession } from "next-auth/react";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.status(200).json({ message: "Success" });
}
```

### Adding New Pages

1. Create a new `.tsx` file in `pages/`
2. Export a default React component
3. Use `getServerSideProps` for server-side data fetching if needed
4. Wrap with `Layout` component for consistent styling

### Working with TypeScript

- Type definitions are in `types/` directory
- Use strict mode (enabled in `tsconfig.json`)
- Run `yarn typecheck` to verify types before building
- Common types: `NextApiRequest`, `NextApiResponse`, `GetServerSideProps`

### NextAuth Configuration

- Main config: `pages/api/auth/[...nextauth].ts`
- Providers are configured in the NextAuth config
- Session callbacks can be customized
- JWT strategy is used for sessions

## Known Issues & Solutions

### Issue 1: Yarn Lock File Out of Sync
**Problem**: `yarn.lock` file may be out of sync with `package.json` after dependency updates.

**Solution**:
```bash
# Remove old lock file
rm yarn.lock

# Reinstall all dependencies
yarn install

# Verify build works
yarn lint
yarn build
```

### Issue 2: TypeScript Compilation Errors
**Problem**: Type errors prevent building or linting.

**Solution**:
```bash
# Check for type errors
yarn typecheck

# Ensure all imports have proper type definitions
# Check tsconfig.json for strict mode settings
# Update @types packages if needed
```

### Issue 3: NextAuth Session Not Available
**Problem**: `getSession()` returns null even for authenticated users.

**Solution**:
- Ensure `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are set in `.env.local`
- Verify the session callback in `[...nextauth].ts` is properly configured
- Check that the provider is correctly configured
- Ensure cookies are enabled in the browser

### Issue 4: ESLint Errors on Build
**Problem**: ESLint errors prevent the build from completing.

**Solution**:
```bash
# Run linter to see all errors
yarn lint

# Fix auto-fixable errors
yarn lint --fix

# Common issues:
# - Unused variables: remove or prefix with _
# - Missing dependencies in useEffect: add to dependency array
# - Implicit any types: add explicit type annotations
```

### Issue 5: Dynamic Routes Not Working
**Problem**: Pages with `[param]` in filename don't render correctly.

**Solution**:
- Ensure the file is in `pages/` directory (not `app/`)
- Use `useRouter()` hook to access route parameters
- For API routes, access params via `req.query`
- Verify the route matches the file structure

Example:
```typescript
// pages/game/[gameid]/index.tsx
import { useRouter } from "next/router";

export default function GamePage() {
  const router = useRouter();
  const { gameid } = router.query;
  // Use gameid...
}
```

### Issue 6: CSS Module Import Errors
**Problem**: CSS modules not importing correctly.

**Solution**:
- Ensure file extension is `.module.css`
- Import as: `import styles from './component.module.css'`
- Use as: `<div className={styles.className}>`
- Verify the CSS class names match the import

### Issue 7: Build Fails with "Module not found"
**Problem**: Build fails with module resolution errors.

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
yarn install

# Verify all imports use correct paths
# Check for circular dependencies
# Ensure all external packages are in package.json
```

## Code Style & Conventions

### TypeScript
- Use strict mode
- Avoid `any` types
- Use interfaces for object shapes
- Use enums for constants

### React Components
- Use functional components with hooks
- Name components with PascalCase
- Use `React.FC<Props>` for typed components
- Keep components focused and single-responsibility

### File Naming
- Components: PascalCase (e.g., `Header.tsx`)
- Utilities: camelCase (e.g., `yahooData.ts`)
- Pages: lowercase with hyphens for multi-word (e.g., `protected.tsx`)
- CSS modules: `.module.css` suffix

### Imports
- Group imports: React, Next.js, external packages, local files
- Use absolute imports where configured
- Avoid circular dependencies

## Testing & Validation

Before committing changes:

```bash
# Type check
yarn typecheck

# Lint
yarn lint

# Build
yarn build

# Test locally
yarn dev
```

## Debugging Tips

### Enable Debug Logging
```typescript
// Add to any file
console.log('Debug:', variable);
```

### Check NextAuth Session
```typescript
import { useSession } from "next-auth/react";

export default function Component() {
  const { data: session, status } = useSession();
  console.log('Session:', session, 'Status:', status);
  // ...
}
```

### Inspect API Responses
```typescript
// In browser console
fetch('/api/endpoint')
  .then(r => r.json())
  .then(d => console.log(d));
```

### Check Environment Variables
```typescript
// Ensure variables are prefixed with NEXT_PUBLIC_ for client-side access
console.log(process.env.NEXT_PUBLIC_VAR);
```

## Performance Considerations

- Use `Image` component from Next.js for optimized images
- Implement code splitting with dynamic imports
- Use SWR for data fetching with caching
- Optimize bundle size by checking unused dependencies
- Use CSS modules to avoid global style conflicts

## Security Best Practices

- Never commit `.env.local` file
- Keep `NEXTAUTH_SECRET` secure and unique
- Validate all user inputs on the server
- Use HTTPS in production
- Implement CSRF protection (NextAuth handles this)
- Sanitize data before displaying in templates

## Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [ESLint Documentation](https://eslint.org/docs/latest/)

## Future Improvements

- [ ] Add unit tests with Jest
- [ ] Add E2E tests with Playwright or Cypress
- [ ] Implement error boundary components
- [ ] Add logging service
- [ ] Implement rate limiting on API routes
- [ ] Add API documentation with Swagger/OpenAPI
- [ ] Implement caching strategies
- [ ] Add monitoring and analytics

## Contact & Support

For issues or questions about this project, refer to the main README.md or check the GitHub repository.

---

**Last Updated**: 2024
**Node Version**: >=20.0.0
**Yarn Version**: >=1.22.0
