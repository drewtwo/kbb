# AGENTS.md - Guidelines for AI Code Generation Agents

## Purpose

This document provides guidelines and best practices for AI code generation agents working on the **kbb** project. It establishes standards for code quality, validation, and implementation procedures to ensure consistency and reliability across all automated code changes.

## Table of Contents

1. [Pre-Commit Validation Requirements](#pre-commit-validation-requirements)
2. [Plan Template](#plan-template)
3. [Common Linting and Type Check Errors](#common-linting-and-type-check-errors)
4. [CI/CD Validation Requirements](#cicd-validation-requirements)
5. [Best Practices](#best-practices)

---

## Pre-Commit Validation Requirements

Before committing any code changes, the following validation steps are **mandatory**:

### 1. Yarn Lint

All code must pass the project's linting standards. Run the following command to verify:

```bash
yarn lint
```

**What it checks:**
- Code style consistency (ESLint rules)
- Formatting standards
- Code quality issues
- Unused variables and imports

**Expected output:**
- No errors or warnings (or only pre-existing warnings)
- All files pass linting checks

### 2. Yarn Typecheck

All TypeScript code must pass type checking. Run the following command to verify:

```bash
yarn typecheck
```

**What it checks:**
- TypeScript type correctness
- Type safety violations
- Missing type annotations
- Incompatible type assignments

**Expected output:**
- No type errors
- All type definitions are valid

### Validation Workflow

Before submitting any code changes:

1. Make your code changes
2. Run `yarn lint` and fix any issues
3. Run `yarn typecheck` and fix any type errors
4. Verify both commands pass without errors
5. Only then proceed with committing changes

---

## Plan Template

When implementing code changes, follow this standard structure:

```markdown
## Implementation Plan

### Step 1: [Brief Description]
- Action: [create/modify]
- Files: [list of files]
- Details: [what will be done]

### Step 2: [Brief Description]
- Action: [create/modify]
- Files: [list of files]
- Details: [what will be done]

### Validation Steps

After implementation:

1. Run `yarn lint` to verify no linting errors
2. Run `yarn typecheck` to verify no TypeScript type errors
3. Test the changes locally if applicable
4. Verify all files are properly formatted
```

### Key Points for Plans

- **Always include validation steps** at the end of your plan
- **Specify file paths** clearly for each action
- **Document dependencies** between steps if they exist
- **Include rollback procedures** for complex changes
- **Test incrementally** rather than all at once

---

## Common Linting and Type Check Errors

### Linting Errors

#### 1. Unused Variables
**Error:** `'variable' is defined but never used`

**Solution:**
- Remove the unused variable
- Or prefix with underscore if intentionally unused: `const _unused = value;`

#### 2. Missing Semicolons
**Error:** `Missing semicolon`

**Solution:**
- Add semicolons at the end of statements
- Or configure ESLint to auto-fix: `yarn lint --fix`

#### 3. Incorrect Spacing
**Error:** `Unexpected spaces around keyword`

**Solution:**
- Follow the project's spacing rules
- Use `yarn lint --fix` to auto-correct formatting

#### 4. Unused Imports
**Error:** `'Component' is defined but never used`

**Solution:**
- Remove unused import statements
- Use `yarn lint --fix` to auto-remove

### TypeScript Type Errors

#### 1. Type Mismatch
**Error:** `Type 'string' is not assignable to type 'number'`

**Solution:**
- Ensure variable types match expected types
- Use type casting if necessary: `value as number`
- Check function parameter types

#### 2. Missing Type Annotation
**Error:** `Parameter 'x' implicitly has an 'any' type`

**Solution:**
- Add explicit type annotations: `const x: string = "value";`
- Or enable `noImplicitAny: false` in tsconfig.json if appropriate

#### 3. Property Does Not Exist
**Error:** `Property 'name' does not exist on type 'object'`

**Solution:**
- Verify the property exists on the object
- Check the object's type definition
- Add the property to the interface if needed

#### 4. Null/Undefined Check
**Error:** `Object is possibly 'null' or 'undefined'`

**Solution:**
- Add null checks: `if (value !== null && value !== undefined) { ... }`
- Use optional chaining: `value?.property`
- Use non-null assertion if certain: `value!.property`

### Auto-Fix Commands

Many linting issues can be automatically fixed:

```bash
# Auto-fix linting issues
yarn lint --fix

# For specific files
yarn lint --fix src/path/to/file.ts
```

---

## CI/CD Validation Requirements

All pull requests must pass the following validation checks before merging:

### Required Checks

1. **Lint Check**
   - Command: `yarn lint`
   - Status: Must pass without errors
   - Failure: PR cannot be merged

2. **Type Check**
   - Command: `yarn typecheck`
   - Status: Must pass without errors
   - Failure: PR cannot be merged

3. **Build Check** (if applicable)
   - Command: `yarn build`
   - Status: Must complete successfully
   - Failure: PR cannot be merged

### Pre-Merge Checklist

Before requesting review:

- [ ] All code changes are complete
- [ ] `yarn lint` passes without errors
- [ ] `yarn typecheck` passes without errors
- [ ] No console errors or warnings introduced
- [ ] Tests pass (if applicable)
- [ ] Code follows project conventions
- [ ] Commit messages are clear and descriptive

### Handling CI Failures

If a PR fails CI checks:

1. **Identify the failure** - Check the CI logs
2. **Fix locally** - Run the same command locally to reproduce
3. **Verify the fix** - Run the command again to confirm it passes
4. **Push the fix** - Commit and push the corrected code
5. **Re-run CI** - CI will automatically re-run on new commits

---

## Best Practices

### TypeScript Best Practices

1. **Always use explicit types**
   ```typescript
   // Good
   const name: string = "John";
   const age: number = 30;
   
   // Avoid
   const name = "John";
   const age = 30;
   ```

2. **Use interfaces for object shapes**
   ```typescript
   interface User {
     id: number;
     name: string;
     email: string;
   }
   
   const user: User = { id: 1, name: "John", email: "john@example.com" };
   ```

3. **Avoid `any` type**
   ```typescript
   // Good
   const value: string | number = getValue();
   
   // Avoid
   const value: any = getValue();
   ```

4. **Use strict null checks**
   ```typescript
   // Good
   if (value !== null && value !== undefined) {
     console.log(value);
   }
   
   // Or use optional chaining
   console.log(value?.property);
   ```

### React Best Practices

1. **Use functional components with hooks**
   ```typescript
   const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
     const [state, setState] = useState<string>("");
     
     return <div>{state}</div>;
   };
   ```

2. **Type component props**
   ```typescript
   interface MyComponentProps {
     title: string;
     onClick: (id: number) => void;
   }
   
   const MyComponent: React.FC<MyComponentProps> = ({ title, onClick }) => {
     return <button onClick={() => onClick(1)}>{title}</button>;
   };
   ```

3. **Use useCallback for event handlers**
   ```typescript
   const handleClick = useCallback(() => {
     // Handle click
   }, [dependencies]);
   ```

### Code Organization

1. **Follow the project structure**
   - Keep related files together
   - Use consistent naming conventions
   - Organize by feature or domain

2. **Keep components small and focused**
   - Single responsibility principle
   - Extract reusable logic into custom hooks
   - Break large components into smaller ones

3. **Use meaningful variable and function names**
   ```typescript
   // Good
   const getUserById = (id: number): User => { ... };
   
   // Avoid
   const getUser = (x: number): any => { ... };
   ```

4. **Add comments for complex logic**
   ```typescript
   // Calculate the total price including tax
   const totalPrice = basePrice * (1 + taxRate);
   ```

### File Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)
- **Types/Interfaces**: PascalCase (e.g., `User.ts`)

### Import/Export Best Practices

1. **Use named exports for utilities and types**
   ```typescript
   export interface User { ... }
   export const formatDate = (date: Date) => { ... };
   ```

2. **Use default exports for components**
   ```typescript
   const MyComponent = () => { ... };
   export default MyComponent;
   ```

3. **Organize imports**
   ```typescript
   // External libraries first
   import React, { useState } from 'react';
   import axios from 'axios';
   
   // Internal imports
   import { User } from '../types/User';
   import { formatDate } from '../utils/formatDate';
   ```

---

## Additional Resources

- [ESLint Documentation](https://eslint.org/docs/rules/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Project README](./README.md)

---

**Last Updated:** 2024
**Version:** 1.0
