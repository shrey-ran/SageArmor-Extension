# Sage Armor VS Code Extension - Product Requirements Document

## 1. Product Summary
Sage Armor is a VS Code extension that brings security scanning directly into the coding workflow. Instead of manually copying code into a web app, developers get in-editor vulnerability detection, explanations, and actionable fixes.

## 2. Problem Statement
Current pain points:
- Security checks are often manual and delayed.
- Developers context-switch between IDE and browser tools.
- Vulnerabilities are discovered too late in the SDLC.
- Fix guidance is not always available where code is written.

Desired outcome:
- Security feedback should be integrated into normal coding flow.
- Vulnerabilities should be surfaced early, clearly, and with remediation.

## 3. Goals and Non-Goals
Goals:
- Real-time and on-demand vulnerability scanning in VS Code.
- Clear inline diagnostics with attack context and suggested remediation.
- One-click/quick-fix workflows.
- Reliable behavior with clear error handling and testing.
- Release-ready extension packaging and CI quality gates.

Non-goals (initial releases):
- Full SAST replacement.
- Organization-wide policy engine in v1.
- Deep PR governance/blocking in v1.

## 4. Target Users
- Individual developers (backend/full-stack/security-minded).
- Teams adopting secure-by-default coding practices.
- Engineering managers requiring pre-commit vulnerability feedback.

## 5. User Stories
- As a developer, I want automatic scan-on-save so I catch issues early.
- As a developer, I want clear diagnostics and suggested fixes at the vulnerable line.
- As a developer, I want workspace-wide scans before commit.
- As a team lead, I want predictable quality and stable extension behavior.

## 6. Functional Requirements (All Phases)
- Scan current file via command.
- Scan workspace via command.
- Trigger scans on save (optional).
- Severity filtering in settings.
- Hover details with attack vector/scenario/remediation.
- Quick-fix action for suggested remediation.
- Backend connectivity test command.
- Multi-language support expansion.

## 7. Phase Plan

### Phase 1 - MVP Foundation (Completed/Mostly Completed)
Scope:
- Extension activation and core commands.
- Current-file scanning and diagnostics.
- Hover details and suggested fixes.
- Basic quick-fix support.
- Settings integration.

Acceptance criteria:
- Scans run successfully on supported files.
- Diagnostics render with severity mapping.
- Backend errors are surfaced clearly.
- No TypeScript build errors.

### Phase 2 - Enhanced UX and Reliability (In Progress)
Scope:
- Workspace scan improvements (progress and aggregate stats).
- Better quick-fix reliability and deterministic remediation mapping.
- Advanced settings behavior and responsiveness.
- User-friendly failures (network/auth/quota).

Acceptance criteria:
- Workspace scan gives progress and final summary.
- Quick fix consistently applies intended code change.
- Settings updates are reflected without restart.
- All error states have actionable messages.

### Phase 3 - Test and QA Hardening
Scope:
- Unit tests for core modules.
- Integration tests for scan/diagnostic/fix flows.
- End-to-end extension-host test scenarios.
- Cross-platform validation checklist.

Acceptance criteria:
- Test suite passes in CI.
- No regressions in core workflows.
- Build + lint + tests green on release branch.

### Phase 4 - Release and Operationalization
Scope:
- Marketplace-quality metadata, docs, visuals.
- VSIX packaging and install smoke-tests.
- CI/CD pipeline for lint/test/build/package/publish.
- Changelog and semantic versioning workflow.

Acceptance criteria:
- VSIX install works outside debug host.
- Release pipeline reproducible.
- User docs cover setup/troubleshooting clearly.

### Phase 5 - Advanced Capabilities
Scope:
- GitHub PR integration and PR comments.
- Batch remediation operations.
- Team/org-level controls and reporting.
- Custom rule and policy extensions.

Acceptance criteria:
- PR scan insights can be published automatically.
- Team settings are manageable and auditable.
- Advanced features do not degrade core extension performance.

## 8. UX Requirements
- Non-intrusive diagnostics using native VS Code affordances.
- Hover content must include: issue, severity, attack context, suggested fix.
- Quick-fix action must be discoverable via lightbulb and command palette.
- Status bar must reflect ready/scanning/error states.

## 9. Performance and Reliability Requirements
- No UI thread blocking operations.
- Backend call timeout and graceful failure paths.
- Debounced re-scan behavior to avoid spam.
- Stable handling for malformed backend responses.

## 10. Security and Privacy Requirements
- No secrets committed to source control.
- API credentials managed in backend or secure settings.
- No telemetry unless explicitly introduced and documented.
- Code sent only to configured backend endpoint.

## 11. Quality Gates (Must Pass Per Phase)
- Build passes: compile succeeds.
- Static checks pass: lint/type checks.
- Feature-level tests pass.
- Manual smoke test checklist passes.
- Regression check on core commands passes.

## 12. Implementation Protocol (No-Break Policy)
For each phase item:
1. Define acceptance criteria.
2. Implement smallest safe increment.
3. Run compile + error scan.
4. Run targeted manual test flow.
5. Mark item done only after evidence.

## 13. Hardcoded/Mocked Audit Requirement
At phase completion, report explicitly:
- Any hardcoded fallback text/logic.
- Any mock-only paths still in runtime code.
- Any temporary stubs behind feature flags.
- Which production paths are fully real backend-driven.

## 14. Success Metrics
- Core commands success rate > 95% in manual QA runs.
- Quick-fix apply success rate > 90% on supported finding shapes.
- Workspace scan completion without crash on representative projects.
- User-reported false positives and UX friction trending down.
