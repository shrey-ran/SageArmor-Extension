# Sage Armor Extension Stabilization Requirements (Pre-Release)

## Objective
Deliver a production-ready VS Code extension behavior equivalent to or better than pre-VSIX Development Host behavior, with model/API-key-first scanning and reliable editor UX.

## Scope
- Extension frontend reliability in VS Code editor.
- Backend request strategy for direct scans.
- Quick-fix correctness and diagnostic lifecycle.
- Regression safety checks before VSIX packaging.

## Must-Fix Functional Requirements

### R1: API-Key-First Scan Path
- Direct scans must call model-backed analysis first when configured.
- Local SAST fallback is allowed only when model call fails or an explicit local-only override is enabled.
- Behavior must be deterministic and documented.

Acceptance:
- `/review` returns model analysis when API path is healthy.
- On model error/429/timeout, fallback returns valid findings with `analysis_mode` indicating fallback.

### R2: Quick-Fix Applies Correct Code
- Applying a quick-fix must replace the intended vulnerable code block without corrupting syntax.
- Multiline remediation text must preserve indentation and compile syntax where applicable.

Acceptance:
- Applying fix changes source text immediately.
- No duplicate declarations introduced by partial replacements.
- Resulting file remains syntactically valid for representative JS/TS cases.

### R3: Count and Diagnostics Consistency
- Issue counts must refresh after:
  - quick-fix apply,
  - manual edits,
  - undo,
  - redo,
  - explicit rescan command.
- Sidebar summary and status bar must match active diagnostics.

Acceptance:
- Count decreases after successful mitigation and rescan.
- Count reappears correctly on undo/redo.

### R4: Lightbulb and Code Action Reliability
- Lightbulb and quick-fix entries must appear consistently on vulnerable lines.
- Code action availability must not depend on exact cursor column over a tiny token.

Acceptance:
- Vulnerable lines show code action affordance on line context.
- `Apply suggested fix` and `Preview fix` actions are available when remediation exists.

### R5: Backend Range Fidelity
- Backend should return line/column metadata where available.
- Extension may widen user-visible diagnostic range for action UX while retaining mapping for diagnostics identity.

Acceptance:
- Response schema includes `line`, optional `column`, optional `end_line`, optional `end_column`.
- Extension handles missing range fields safely.

## Non-Functional Requirements
- No blocking regressions in compile/test/lint pipeline.
- No noisy console errors during normal scan/fix flow.
- Degraded model quota state must not break editor UX.

## Validation Matrix

### V1: Build Integrity
- `npm run compile`
- `npm test`
- `npm run lint`

### V2: Direct Scan Flow
- Scan current file with model path available.
- Confirm findings appear and quick-fix is offered.

### V3: Fallback Flow
- Simulate model failure/quota.
- Confirm fallback findings and no UX break.

### V4: Quick-Fix Lifecycle
- Apply fix on each supported category in fixture.
- Confirm code insertion correctness and count decrement.

### V5: Undo/Redo
- Undo applied fix and confirm count increase.
- Redo and confirm count decrease.

### V6: VSIX Parity Check
- Package VSIX.
- Install from VSIX.
- Repeat V2-V5 in installed extension context.

## Release Gate (Go/No-Go)
Release only if all are true:
- V1-V6 passed.
- No known P1/P2 defects in fix workflow.
- API-key-first behavior verified in installed VSIX.

## Notes
- Keep local-only mode as opt-in environment override only.
- Maintain backward compatibility for existing settings and commands.
