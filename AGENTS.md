# AGENTS.md

Project: opencode-cli
Runtime: Bun + TypeScript (ESM)
Entry: index.ts

This file guides autonomous agents working in this repository.
If instructions conflict with repo files, follow repo files.

------------------------------------------------------------
Quick Start
------------------------------------------------------------
1) Install dependencies
   bun install

2) Run the CLI
   bun run index.ts

3) Type check (no emit)
   bun x tsc --noEmit

There is no build step defined beyond running `index.ts`.

------------------------------------------------------------
Build, Lint, Test Commands
------------------------------------------------------------
Build
- No explicit build script in package.json.
- Use `bun run index.ts` to execute the CLI directly.

Lint
- No linter configured.
- Do not introduce new lint tooling without request.

Test
- No test framework configured.
- There are no test files in the repo.

Single Test
- Not applicable: no test runner configured.
- If tests are introduced later, prefer `bun test <file>`.

------------------------------------------------------------
Repository Layout
------------------------------------------------------------
- index.ts: CLI entry point and main logic.
- package.json: dependency list only.
- tsconfig.json: strict TypeScript configuration.
- README.md: minimal run instructions.

------------------------------------------------------------
Code Style Guidelines
------------------------------------------------------------
General
- TypeScript, ESM, top-level await permitted.
- Keep code readable and direct; avoid unnecessary abstractions.
- Prefer small helper functions for discrete logic blocks.

Formatting
- 2-space indentation.
- No semicolons.
- Double quotes for strings.
- Keep line length reasonable; wrap long template strings.

Imports
- Use named imports from packages.
- One import per line at the top of the file.
- Prefer absolute package imports over relative when possible.

Types
- Use explicit union types for function results (see ParsedArgs).
- Favor `type` aliases for structured unions.
- Keep types near the functions that use them.
- Avoid `any` unless required by SDK typing gaps.
- Use `as const` sparingly for literal narrowing.

Naming Conventions
- camelCase for variables and functions.
- PascalCase for type aliases.
- SCREAMING_SNAKE_CASE for constants.
- Prefer descriptive, action-based function names.

Control Flow
- Validate inputs early and return typed error results.
- Favor early returns over deep nesting.
- Use `try/finally` to guarantee cleanup (see server close).

Error Handling
- Check SDK responses for `.error` before using `.data`.
- Throw errors to let the outer handler terminate.
- Print user-facing errors to stdout/stderr, then exit non-zero.
- Keep error strings concise and actionable.

Async Patterns
- Use `async`/`await` consistently.
- Avoid mixing promise chains with `await`.
- For event streams, manage state in Maps (see seenText/seenTool).

Console Output
- Use `process.stdout.write` for streaming output.
- Use `console.log` for simple messages and usage lines.
- Preserve existing output format; do not add noisy logs.

CLI Behavior
- `parseArgs` returns typed results; do not throw for usage.
- Keep usage text short and consistent.
- Avoid breaking current CLI interface unless requested.

SDK Usage
- Use `createOpencode` with explicit config.
- Keep permissions restrictive by default.
- Verify session creation before streaming events.

Configuration
- Do not change `opencodeConfig` behavior unless requested.
- Avoid new permissions that widen access without approval.

------------------------------------------------------------
Cursor/Copilot Rules
------------------------------------------------------------
- No Cursor rules found in `.cursor/rules/` or `.cursorrules`.
- No Copilot instructions found in `.github/copilot-instructions.md`.

------------------------------------------------------------
Agent Workflow Expectations
------------------------------------------------------------
- Read existing code before making changes.
- Keep edits minimal and aligned with current patterns.
- Update README.md only if the public usage changes.
- If introducing tests or linting, document commands here.
- If unsure about behavior changes, ask a targeted question.

------------------------------------------------------------
Common Pitfalls
------------------------------------------------------------
- Do not add unused dependencies.
- Do not add Node-only APIs without Bun support.
- Do not expand command permissions beyond Nix tools.
- Ensure session streams are closed cleanly.

------------------------------------------------------------
Suggested Verification
------------------------------------------------------------
- Run `bun run index.ts` with a sample command.
- Run `bun x tsc --noEmit` after type changes.
