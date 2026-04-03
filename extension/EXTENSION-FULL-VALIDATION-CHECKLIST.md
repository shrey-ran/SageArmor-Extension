# Sage Armor - Full Validation Checklist

Use this checklist after all implementation is done. Run top to bottom in one session.

## Pre-Run Setup
- [ ] Backend server running on configured URL
- [ ] Extension compiled successfully (`npm run compile`)
- [ ] Extension Development Host launched (F5)
- [ ] Test workspace has vulnerable sample files

## Phase 1 - Core MVP Checks
### Activation and Commands
- [ ] Command palette shows:
  - [ ] Sage Armor: Scan Current File
  - [ ] Sage Armor: Scan Workspace
  - [ ] Sage Armor: Settings
  - [ ] Sage Armor: Test Backend Connection

### Scan Current File
- [ ] Vulnerabilities appear as diagnostics
- [ ] Severity reflects issue level
- [ ] Hover shows title, description, and suggested fix

### Quick Fix
- [ ] Lightbulb appears on vulnerable line
- [ ] Quick Fix list includes apply action
- [ ] Apply action changes code as expected
- [ ] Diagnostics refresh after apply

## Phase 2 - Enhanced UX/Reliability Checks
### Workspace Scan
- [ ] Workspace scan shows progress notification
- [ ] Final summary includes scanned files and issue count
- [ ] No extension freeze while scanning

### Sidebar/Stats
- [ ] Sage Armor explorer panel shows issue summary
- [ ] Totals by severity are visible
- [ ] File groups and issue items are visible
- [ ] Clicking issue jumps to exact line

### Settings Behavior
- [ ] Settings page opens from command
- [ ] Advanced Settings panel opens from command
- [ ] Backend URL updates successfully
- [ ] Scan-on-save toggle updates behavior
- [ ] Severity filter updates visible diagnostics

### Error UX
- [ ] Invalid backend URL shows actionable error
- [ ] Backend down shows connection error
- [ ] Invalid auth shows auth error (if applicable)
- [ ] Timeout path fails gracefully

## Phase 3 - Testing/QA Checks
### Local Quality Gates
- [ ] `npm run compile` passes
- [ ] `npm run compile:testables` passes
- [ ] `npm test` passes with all tests green
- [ ] `npm run lint` passes (if configured)
- [ ] VS Code Problems view has no extension errors

### Automated Test Evidence
- [ ] Client normalization tests passed:
  - [ ] backend field mapping
  - [ ] timeout/quota error mapping
- [ ] Scan utility tests passed:
  - [ ] severity filtering
  - [ ] aggregate counts
- [ ] Fix utility tests passed:
  - [ ] single-line remediation behavior
  - [ ] multiline indentation normalization

### Manual Regression
- [ ] Scan current file still works
- [ ] Scan workspace still works
- [ ] Hover and quick-fix still work
- [ ] Settings and test connection still work
- [ ] Undoing a fix restores the original diagnostic count immediately

## Phase 4 - Release Readiness Checks
### Packaging
- [x] `npm run package` creates VSIX
- [ ] VSIX installs successfully in clean VS Code profile
- [ ] Commands and scanning work in installed VSIX

### Metadata and Assets
- [ ] `package.json` has valid icon and metadata
- [ ] README includes setup and troubleshooting
- [ ] CHANGELOG updated for release version

### CI
- [ ] CI workflow exists for build/lint/test/package
- [ ] CI passes on push/PR

## Phase 5 - Advanced Features Checks
### Optional Advanced Features
- [ ] Batch fixes action behaves safely
- [ ] PR integration flow tested (if enabled)
- [ ] Team/policy features tested (if enabled)

## Hardcoded/Mocked Audit
- [ ] List hardcoded user-facing fallback strings
- [ ] List runtime fallback modes (local/static fallback)
- [ ] Confirm primary remediation path is backend-driven
- [ ] Confirm no UI mock data in production flows

## Final Go/No-Go
- [ ] All critical checks passed
- [ ] Known non-critical issues documented
- [ ] Release candidate approved
