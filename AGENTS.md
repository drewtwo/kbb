# AI Agents & Developer Linting Guidelines

This document provides comprehensive guidelines for AI agents and developers working on the King Bee Baseball project. It covers code quality standards, linting requirements, TypeScript configuration, and best practices to ensure consistent, maintainable code.

## Table of Contents

- [Overview](#overview)
- [ESLint Configuration](#eslint-configuration)
- [TypeScript Configuration](#typescript-configuration)
- [Pre-Commit Validation Checklist](#pre-commit-validation-checklist)
- [Common Linting and Typecheck Errors](#common-linting-and-typecheck-errors)
- [CI/CD Validation Requirements](#cicd-validation-requirements)
- [Best Practices](#best-practices)
- [Quick Reference](#quick-reference)

## Overview

This project enforces strict code quality standards through:

- **ESLint**: Enforces code quality rules and catches common mistakes
- **TypeScript**: Provides type safety with strict mode enabled
- **Pre-commit Validation**: Required checks before committing code
- **CI/CD Pipeline**: All PRs must pass linting and type checking

All developers and AI agents must follow these guidelines to maintain code quality and consistency.

## ESLint Configuration

### Configuration File

The project uses `.eslintrc.json` with the following configuration:

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "react/no-unescaped-entities": "off",
    "@next/next/no-html-link-for-pages": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Base Configuration

The project extends two ESLint configurations:

1. **`next/core-web-vitals`**: Enforces Next.js best practices and Core Web Vitals optimization
2. **`next/typescript`**: Provides TypeScript-specific linting rules

### Custom Rules

#### 1. `react/no-unescaped-entities: off`
- **Purpose**: Allows unescaped entities in JSX (e.g., `&`, `<`, `>`)
- **When to use**: When displaying special characters in text content
- **Example**:
  ```tsx
  // This is allowed:
  <p>Tom & Jerry</p>
  
  // Instead of:
  <p>Tom &amp; Jerry</p>
  ```

#### 2. `@next/next/no-html-link-for-pages: off`
- **Purpose**: Allows using HTML `<a>` tags instead of Next.js `<Link>` component
- **When to use**: For external links or when Next.js Link is not appropriate
- **Example**:
  ```tsx
  // This is allowed:
  <a href="https://example.com">External Link</a>
  
  // Use Link for internal navigation:
  <Link href="/dashboard">Dashboard</Link>
  ```

#### 3. `@typescript-eslint/no-unused-vars: warn`
- **Purpose**: Warns about unused variables but allows prefixing with underscore to suppress
- **Pattern**: `argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"`, `caughtErrorsIgnorePattern: "^_"`
- **Example**:
  ```tsx
  // Unused parameter - will warn:
  function handleClick(event) {
    console.log('Clicked');
  }
  
  // Suppress warning with underscore prefix:
  function handleClick(_event) {
    console.log('Clicked');
  }
  
  // Unused variable - will warn:
  const unused = getValue();
  
  // Suppress warning with underscore prefix:
  const _unused = getValue();
  ```

#### 4. `react-hooks/exhaustive-deps: warn`
- **Purpose**: Warns when dependencies are missing in useEffect, useMemo, useCallback
- **Severity**: Warning (not error) to allow flexibility in specific cases
- **Example**:
  ```tsx
  // This will warn - missing 'count' in dependencies:
  useEffect(() => {
    console.log(count);
  }, []); // ⚠️ Warning: 'count' is missing
  
  // Correct:
  useEffect(() => {
    console.log(count);
  }, [count]); // ✓ Correct
  ```

### Running ESLint

```bash
# Check for linting errors
npm run lint

# Fix auto-fixable linting errors
npm run lint:fix
```

### Interpreting Lint Errors

ESLint output format:

```
path/to/file.tsx
  123:45  error    Rule name: Error message
  234:56  warning  Rule name: Warning message
```

- **error**: Must be fixed before committing
- **warning**: Should be addressed but may be acceptable in some cases

### Common ESLint Rules in This Project

| Rule | Severity | Description |
|------|----------|-------------|
| `no-console` | error | Disallows console.log in production code |
| `no-var` | error | Requires const/let instead of var |
| `prefer-const` | warn | Suggests const for variables that are never reassigned |
| `eqeqeq` | error | Requires === instead of == |
| `no-implicit-coercion` | warn | Disallows implicit type coercion |
| `react/jsx-uses-react` | error | Ensures React is imported when using JSX |
| `react/jsx-key` | error | Requires key prop in lists |
| `react-hooks/rules-of-hooks` | error | Enforces Rules of Hooks |

## TypeScript Configuration

### Configuration File

The project uses `tsconfig.json` with strict mode enabled:

```json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### Strict Mode Settings

The `"strict": true` option enables all strict type checking options:

#### 1. `noImplicitAny: true`
- **Requirement**: All variables and parameters must have explicit types
- **Error**: `Parameter 'x' implicitly has an 'any' type`
- **Solution**:
  ```tsx
  // ❌ Error - implicit any:
  function getValue(key) {
    return data[key];
  }
  
  // ✓ Correct:
  function getValue(key: string): unknown {
    return data[key];
  }
  ```

#### 2. `strictNullChecks: true`
- **Requirement**: null and undefined must be explicitly handled
- **Error**: `Object is possibly 'null'`
- **Solution**:
  ```tsx
  // ❌ Error - possible null:
  const value = getValue();
  console.log(value.length);
  
  // ✓ Correct:
  const value = getValue();
  if (value !== null) {
    console.log(value.length);
  }
  
  // ✓ Or use optional chaining:
  console.log(value?.length);
  ```

#### 3. `strictFunctionTypes: true`
- **Requirement**: Function parameter types must be compatible
- **Error**: `Type '(x: string) => void' is not assignable to type '(x: string | number) => void'`
- **Solution**: Use proper type signatures for callbacks

#### 4. `strictBindCallApply: true`
- **Requirement**: bind, call, and apply must have correct types
- **Error**: `The 'this' context of type 'X' is not assignable to method's 'this' of type 'Y'`

#### 5. `strictPropertyInitialization: true`
- **Requirement**: Class properties must be initialized or marked as optional
- **Error**: `Property 'x' has no initializer and is not definitely assigned in the constructor`
- **Solution**:
  ```tsx
  // ❌ Error:
  class MyClass {
    value: string;
    constructor() {}
  }
  
  // ✓ Correct - initialize:
  class MyClass {
    value: string;
    constructor() {
      this.value = '';
    }
  }
  
  // ✓ Or mark as optional:
  class MyClass {
    value?: string;
    constructor() {}
  }
  ```

#### 6. `noImplicitThis: true`
- **Requirement**: 'this' must have explicit type
- **Error**: `'this' implicitly has type 'any'`

#### 7. `alwaysStrict: true`
- **Requirement**: All files are in strict mode
- **Effect**: Automatically adds `'use strict'` to all files

### Type Safety Requirements

1. **Always provide explicit return types for functions**:
   ```tsx
   // ✓ Good:
   function getValue(): string {
     return 'value';
   }
   
   // ✓ Also good (inferred):
   const getValue = (): string => 'value';
   ```

2. **Use proper types for React components**:
   ```tsx
   // ✓ Good:
   interface Props {
     title: string;
     count?: number;
   }
   
   export const MyComponent: React.FC<Props> = ({ title, count = 0 }) => {
     return <div>{title}: {count}</div>;
   };
   ```

3. **Avoid 'any' type**:
   ```tsx
   // ❌ Avoid:
   const value: any = getData();
   
   // ✓ Use specific types:
   const value: string = getData();
   
   // ✓ Or use unknown with type guard:
   const value: unknown = getData();
   if (typeof value === 'string') {
     console.log(value);
   }
   ```

4. **Use union types for multiple possibilities**:
   ```tsx
   // ✓ Good:
   type Status = 'loading' | 'success' | 'error';
   
   function handleStatus(status: Status): void {
     // ...
   }
   ```

### Running TypeScript Type Checking

```bash
# Check for type errors (does not emit files)
npm run typecheck

# This is equivalent to:
tsc --noEmit
```

## Pre-Commit Validation Checklist

Before committing code, you MUST run the following commands and ensure they all pass:

### Required Commands

```bash
# 1. Run ESLint to check for code quality issues
npm run lint

# 2. Run TypeScript type checker
npm run typecheck

# 3. (Optional) Fix auto-fixable linting issues
npm run lint:fix
```

### Validation Steps

- [ ] **ESLint passes**: `npm run lint` shows no errors
- [ ] **TypeScript passes**: `npm run typecheck` shows no type errors
- [ ] **No console.log statements** in production code (except for debugging)
- [ ] **All functions have explicit return types**
- [ ] **All parameters have explicit types**
- [ ] **No 'any' types** (use specific types or 'unknown' with type guards)
- [ ] **All React hooks dependencies are correct**
- [ ] **No unused variables** (or prefixed with `_` if intentionally unused)
- [ ] **Code follows project conventions** (naming, formatting, structure)

### Git Pre-Commit Hook (Recommended)

Create `.git/hooks/pre-commit` to automatically run validation:

```bash
#!/bin/sh
npm run lint || exit 1
npm run typecheck || exit 1
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Common Linting and Typecheck Errors

### ESLint Errors

#### 1. `Unexpected console statement`
**Error**: `console.log is not allowed`

**Cause**: console.log in production code

**Solution**:
```tsx
// ❌ Error:
console.log('Debug info');

// ✓ Solution 1 - Remove it:
// (removed)

// ✓ Solution 2 - Use in development only:
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}

// ✓ Solution 3 - Disable for specific line:
// eslint-disable-next-line no-console
console.log('Debug info');
```

#### 2. `'x' is assigned a value but never used`
**Error**: `'unused' is assigned a value but never used`

**Cause**: Variable declared but not used

**Solution**:
```tsx
// ❌ Error:
const unused = getValue();

// ✓ Solution 1 - Remove it:
getValue();

// ✓ Solution 2 - Use it:
const value = getValue();
console.log(value);

// ✓ Solution 3 - Prefix with underscore:
const _unused = getValue();
```

#### 3. `Missing 'key' prop for element in list`
**Error**: `Missing 'key' prop for element in list`

**Cause**: Array rendering without key prop

**Solution**:
```tsx
// ❌ Error:
{items.map((item) => (
  <div>{item.name}</div>
))}

// ✓ Solution:
{items.map((item) => (
  <div key={item.id}>{item.name}</div>
))}
```

#### 4. `React Hook 'useEffect' has missing dependencies`
**Error**: `React Hook 'useEffect' has a missing dependency: 'count'`

**Cause**: Missing dependency in useEffect

**Solution**:
```tsx
// ❌ Error:
useEffect(() => {
  console.log(count);
}, []); // Missing 'count'

// ✓ Solution:
useEffect(() => {
  console.log(count);
}, [count]);
```

#### 5. `Expected '===' and instead saw '=='`
**Error**: `Expected '===' and instead saw '=='`

**Cause**: Using loose equality instead of strict

**Solution**:
```tsx
// ❌ Error:
if (value == 0) {
  // ...
}

// ✓ Solution:
if (value === 0) {
  // ...
}
```

### TypeScript Errors

#### 1. `Parameter 'x' implicitly has an 'any' type`
**Error**: `Parameter 'event' implicitly has an 'any' type`

**Cause**: Parameter without explicit type

**Solution**:
```tsx
// ❌ Error:
function handleClick(event) {
  // ...
}

// ✓ Solution:
function handleClick(event: React.MouseEvent<HTMLButtonElement>): void {
  // ...
}
```

#### 2. `Object is possibly 'null'`
**Error**: `Object is possibly 'null'`

**Cause**: Not handling null/undefined

**Solution**:
```tsx
// ❌ Error:
const value = getValue(); // returns string | null
console.log(value.length);

// ✓ Solution 1 - Type guard:
const value = getValue();
if (value !== null) {
  console.log(value.length);
}

// ✓ Solution 2 - Optional chaining:
console.log(value?.length);

// ✓ Solution 3 - Non-null assertion (use sparingly):
console.log(value!.length);
```

#### 3. `Type 'string' is not assignable to type 'number'`
**Error**: `Type 'string' is not assignable to type 'number'`

**Cause**: Type mismatch

**Solution**:
```tsx
// ❌ Error:
const count: number = '5';

// ✓ Solution 1 - Correct type:
const count: string = '5';

// ✓ Solution 2 - Convert value:
const count: number = parseInt('5', 10);

// ✓ Solution 3 - Use union type:
const count: number | string = '5';
```

#### 4. `Property 'x' does not exist on type 'Y'`
**Error**: `Property 'name' does not exist on type 'User'`

**Cause**: Accessing non-existent property

**Solution**:
```tsx
// ❌ Error:
interface User {
  id: number;
}
const user: User = { id: 1 };
console.log(user.name); // 'name' doesn't exist

// ✓ Solution 1 - Add property to interface:
interface User {
  id: number;
  name: string;
}

// ✓ Solution 2 - Use optional property:
interface User {
  id: number;
  name?: string;
}

// ✓ Solution 3 - Check before accessing:
if ('name' in user) {
  console.log(user.name);
}
```

#### 5. `Property 'x' has no initializer and is not definitely assigned`
**Error**: `Property 'value' has no initializer and is not definitely assigned in the constructor`

**Cause**: Class property not initialized

**Solution**:
```tsx
// ❌ Error:
class MyClass {
  value: string;
}

// ✓ Solution 1 - Initialize in constructor:
class MyClass {
  value: string;
  constructor() {
    this.value = '';
  }
}

// ✓ Solution 2 - Make optional:
class MyClass {
  value?: string;
}

// ✓ Solution 3 - Initialize with default:
class MyClass {
  value: string = '';
}
```

## CI/CD Validation Requirements

### GitHub Actions / CI Pipeline

All pull requests must pass the following checks before merging:

1. **ESLint Check**:
   ```bash
   npm run lint
   ```
   - Must have zero errors
   - Warnings are acceptable but should be addressed

2. **TypeScript Type Check**:
   ```bash
   npm run typecheck
   ```
   - Must have zero type errors
   - All types must be properly defined

3. **Build Check**:
   ```bash
   npm run build
   ```
   - Must complete successfully
   - No build warnings should be ignored

### PR Requirements

- [ ] All CI checks pass (lint, typecheck, build)
- [ ] Code review approved
- [ ] No merge conflicts
- [ ] Commit messages follow Conventional Commits
- [ ] Changes are documented (if applicable)

### Failing CI Checks

If CI checks fail:

1. **Pull the latest changes**:
   ```bash
   git pull origin main
   ```

2. **Run validation locally**:
   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

3. **Fix errors**:
   ```bash
   npm run lint:fix
   ```

4. **Commit and push**:
   ```bash
   git add .
   git commit -m "fix: resolve linting and type errors"
   git push origin feature/your-feature
   ```

## Best Practices

### TypeScript Patterns

#### 1. Use Interfaces for Props
```tsx
interface ButtonProps {
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  disabled = false,
  variant = 'primary',
}) => (
  <button onClick={onClick} disabled={disabled} className={variant}>
    {label}
  </button>
);
```

#### 2. Use Type Aliases for Complex Types
```tsx
type Status = 'loading' | 'success' | 'error' | 'idle';
type ApiResponse<T> = {
  data: T;
  status: Status;
  error?: string;
};

const response: ApiResponse<User> = {
  data: user,
  status: 'success',
};
```

#### 3. Use Generics for Reusable Components
```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
}

export const List = <T,>({
  items,
  renderItem,
  keyExtractor,
}: ListProps<T>): React.ReactElement => (
  <ul>
    {items.map((item) => (
      <li key={keyExtractor(item)}>{renderItem(item)}</li>
    ))}
  </ul>
);
```

### React Hooks Best Practices

#### 1. Always Include Dependencies
```tsx
// ❌ Bad - missing dependency:
useEffect(() => {
  console.log(count);
}, []);

// ✓ Good:
useEffect(() => {
  console.log(count);
}, [count]);
```

#### 2. Use useCallback for Event Handlers
```tsx
const handleClick = useCallback((id: number) => {
  fetchData(id);
}, []);
```

#### 3. Use useMemo for Expensive Computations
```tsx
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

#### 4. Separate State Logic with useReducer
```tsx
interface State {
  count: number;
  error?: string;
}

type Action = { type: 'INCREMENT' } | { type: 'DECREMENT' } | { type: 'ERROR'; error: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'ERROR':
      return { ...state, error: action.error };
    default:
      return state;
  }
};

const [state, dispatch] = useReducer(reducer, { count: 0 });
```

### Code Organization Guidelines

#### 1. Component Structure
```tsx
// 1. Imports
import React, { useCallback, useState } from 'react';
import { fetchData } from '@/lib/api';

// 2. Types/Interfaces
interface Props {
  id: number;
  title: string;
}

interface State {
  data: unknown;
  loading: boolean;
}

// 3. Component
export const MyComponent: React.FC<Props> = ({ id, title }) => {
  const [state, setState] = useState<State>({ data: null, loading: false });

  const handleClick = useCallback(() => {
    // ...
  }, []);

  return <div>{title}</div>;
};

// 4. Exports
export default MyComponent;
```

#### 2. File Organization
```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx        # Component
│   │   ├── Button.test.tsx   # Tests
│   │   └── index.ts          # Export
│   └── Card/
│       ├── Card.tsx
│       ├── Card.test.tsx
│       └── index.ts
├── lib/
│   ├── api.ts                # API utilities
│   ├── utils.ts              # General utilities
│   └── hooks.ts              # Custom hooks
├── types/
│   ├── index.ts              # Type definitions
│   └── api.ts                # API types
└── pages/
    ├── index.tsx             # Home page
    └── dashboard.tsx         # Dashboard page
```

#### 3. Naming Conventions
- **Components**: PascalCase (e.g., `MyComponent.tsx`)
- **Files**: kebab-case (e.g., `my-component.tsx`)
- **Functions**: camelCase (e.g., `handleClick`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (e.g., `UserProps`)

### Error Handling

#### 1. Use Try-Catch with Proper Types
```tsx
async function fetchData(id: number): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      console.error('Fetch error:', error.message);
    }
    throw error;
  }
}
```

#### 2. Handle Null/Undefined
```tsx
function getValue(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected string for key '${key}'`);
  }
  return value;
}
```

### Performance Optimization

#### 1. Memoize Components
```tsx
interface Props {
  title: string;
  count: number;
}

export const Card = React.memo<Props>(({ title, count }) => (
  <div>{title}: {count}</div>
));
```

#### 2. Use Dynamic Imports
```tsx
const HeavyComponent = dynamic(() => import('@/components/Heavy'), {
  loading: () => <div>Loading...</div>,
});
```

#### 3. Optimize Re-renders
```tsx
const handleClick = useCallback(() => {
  // ...
}, [dependency]);

const memoizedValue = useMemo(() => {
  return expensiveComputation(data);
}, [data]);
```

## Quick Reference

### Commands

| Command | Purpose |
|---------|---------|
| `npm run lint` | Check for linting errors |
| `npm run lint:fix` | Fix auto-fixable linting errors |
| `npm run typecheck` | Check for TypeScript type errors |
| `npm run build` | Build for production |
| `npm run dev` | Start development server |

### Common Patterns

| Pattern | Usage |
|---------|-------|
| `const [state, setState] = useState<Type>(initial)` | State management |
| `useEffect(() => { ... }, [deps])` | Side effects |
| `useCallback(() => { ... }, [deps])` | Memoized callbacks |
| `useMemo(() => { ... }, [deps])` | Memoized values |
| `useReducer(reducer, initial)` | Complex state |
| `React.FC<Props>` | Typed component |
| `interface Props { ... }` | Component props |
| `type Status = 'a' \| 'b'` | Union types |

### Type Checking Shortcuts

| Shortcut | Meaning |
|----------|---------|
| `T \| null` | Optional value |
| `T[]` | Array of T |
| `Record<K, V>` | Object with K keys and V values |
| `Partial<T>` | All properties optional |
| `Required<T>` | All properties required |
| `Pick<T, K>` | Select properties K from T |
| `Omit<T, K>` | Exclude properties K from T |
| `Readonly<T>` | All properties readonly |

### ESLint Disable Comments

```tsx
// Disable for next line
// eslint-disable-next-line rule-name
const value = any;

// Disable for block
/* eslint-disable rule-name */
const value1 = any;
const value2 = any;
/* eslint-enable rule-name */

// Disable all rules for line
// eslint-disable-next-line
const value = any;
```

---

**Last Updated**: 2024
**Maintained by**: Development Team

For questions or clarifications, please refer to the main [README.md](README.md) or open an issue on GitHub.
