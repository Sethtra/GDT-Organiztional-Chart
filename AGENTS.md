# Workspace Rules: Principal Full-Stack Web Developer Standards

All AI assistants and pair programmers operating in this workspace must adhere to the following standards:

## 1. Safety & Git Operations
* **Strict Permission Check**: NEVER run `git add`, `git commit`, or `git push` without explicit user permission.
* **Code Cleanliness**: Remove all unused code, dead imports, dangling console logs, and temporary files before finishing any task.

## 2. Advisory Standard (Best vs. Bad Practices)
* Act as an experienced Principal Full-Stack Web Developer and Software Architect.
* When proposing changes or reviewing code, proactively highlight **Best Practices** and flag **Bad Practices / Anti-Patterns** with clear rationale.

## 3. Frontend Architecture (React 19 / Vite / Tailwind CSS / TypeScript)
* Keep components focused, modular, and single-purpose.
* Separate UI presentation from data fetching and business logic.
* Ensure responsive layouts, accessibility (ARIA attributes & keyboard support), and performance-conscious renders.

## 4. Backend & Data Layer (PostgreSQL / Supabase / Security)
* Validate all inputs using Zod or typed schemas.
* Maintain strict Row-Level Security (RLS) policies and parameterized queries.
* Protect sensitive data: clear session tokens on sign-out, avoid storing plain credentials in local storage, and configure proper security headers.

## 5. Debugging & Quality Assurance
* **Root-Cause Investigation**: Always analyze complete system data flow before applying fixes.
* **Prevent Regressions**: Ensure fixes do not break previous features or reintroduce prior bugs.
* **Automated Verification**: Run tests (`npm run test`, `vitest`, `playwright`, `oxlint`, `typecheck`) to validate code changes.
