# Sage Armor Extension - Execution Todo

## Phase 1 - MVP Baseline
- [x] Activation and commands registered
- [x] Scan current file
- [x] Scan workspace
- [x] Settings command and config keys
- [x] Diagnostics with severity mapping
- [x] Hover details and suggested fix display
- [x] Quick-fix action discoverability (lightbulb)
- [x] Quick-fix apply reliability improvements
- [x] Backend connectivity test command
- [x] Multi-language activation expansion
- [x] Build passes without extension errors

## Phase 2 - Enhanced UX and Reliability (Current Focus)
- [x] Workspace scan progress UI with per-file feedback
- [x] Aggregate stats in status bar/sidebar (critical/high/medium/low)
- [x] Better quick-fix insertion strategy for multiline patches
- [x] Clearer remediation preview before apply
- [x] Advanced settings UX (guided controls)
- [x] Error-state UX polishing for timeout/auth/quota paths

## Phase 3 - Testing and QA
- [x] Add unit tests for payload normalization in client.ts
- [x] Add unit tests for diagnostics mapping and severity
- [x] Add integration tests for scan workflow orchestration
- [x] Add quick-fix apply tests for single-line and multiline cases
- [x] Add extension-host smoke test script/checklist

## Phase 4 - Release and Ops
- [ ] VSIX packaging smoke test
- [ ] Marketplace metadata final pass
- [ ] Changelog and semantic versioning workflow
- [x] CI workflow: lint + build + test + package

## Phase 5 - Advanced Features
- [x] Sidebar vulnerability explorer with click-to-jump
- [ ] Batch fix operations (apply all / rollback all)
- [ ] GitHub PR integration hooks
- [ ] Team-oriented policy/reporting features

## Quality Gate (Run After Every Increment)
- [ ] npm run compile
- [ ] extension workspace errors check
- [ ] manual command smoke test in Extension Host
- [ ] regression check for scan, hover, quick-fix, settings

## Testing Documentation
- [x] Full validation checklist documented in EXTENSION-FULL-VALIDATION-CHECKLIST.md
- [x] Automated + manual testing guide documented in EXTENSION-TESTING.md

## Hardcoded/Mocked Audit (Update Continuously)
- [ ] Record hardcoded fallback strings still used
- [ ] Record mocked/local fallback paths still active
- [ ] Mark which user-visible fixes are backend-generated vs fallback-generated
