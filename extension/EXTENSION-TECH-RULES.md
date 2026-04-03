# Sage Armor VS Code Extension - Tech Rules

## 1. Canonical Stack
- Language: TypeScript
- Runtime: Node.js (VS Code extension host)
- API layer: axios
- Build: esbuild
- Packaging: vsce
- Linting: ESLint
- Test strategy: unit + integration + extension-host smoke tests

## 2. Source of Truth
- PRD: EXTENSION-PRD.md
- Design: EXTENSION-DESIGN.md
- Tech constraints: EXTENSION-TECH-RULES.md
- Execution plan: EXTENSION-TODO.md

## 3. Architecture Rules
- Keep extension modules focused and small:
  - extension.ts: activation, command registration, lifecycle
  - client.ts: backend API contract and normalization
  - scanner.ts: scan orchestration and triggers
  - diagnostics.ts: issue-to-diagnostic mapping
  - settings.ts: configuration handling
- Avoid tight coupling between UI providers and API client.
- Prefer explicit schemas for backend response normalization.

## 4. Reliability Rules
- Never assume backend payload shape; normalize and guard arrays/fields.
- All async commands must handle errors and report user-friendly messages.
- Quick-fix actions must use deterministic lookup keys, not transient object state.
- Avoid mutating shared state without clear lifecycle cleanup.

## 5. Security Rules
- No credentials in repository files.
- .env files must remain gitignored.
- Backend URL must be validated before requests.
- Do not log secrets or full tokens.

## 6. Performance Rules
- Debounce keystroke-triggered scans.
- Avoid full-workspace heavy operations on each keystroke/save.
- Keep extension host responsive; no blocking loops on main thread.

## 7. Testing Rules
For every feature increment:
1. Compile must pass.
2. Get workspace errors and resolve extension-related issues.
3. Manual smoke test command flow in Extension Development Host.
4. Add or update automated tests where practical.

## 8. Definition of Done (Per Feature)
- Build passes.
- No new errors introduced.
- Feature acceptance criteria pass manually.
- Failure paths verified (backend down, invalid payload, timeout).
- Documented in EXTENSION-TODO.md as completed.

## 9. Hardcoded/Mocked Policy
Allowed:
- Minimal user-facing fallback text when backend fields are absent.
- Local fallback scan mode if explicitly marked and surfaced.

Not allowed for release-critical paths:
- Mock data powering production UX without explicit flags.
- Hardcoded remediation replacing backend-generated remediation by default.

## 10. Release Safety Rules
- Keep changes incremental and reversible.
- Validate before and after each phase increment.
- Do not merge broad refactors with feature work unless necessary.
