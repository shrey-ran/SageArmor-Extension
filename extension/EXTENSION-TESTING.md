# Sage Armor - Testing Guide

## Automated Test Commands
Run from extension folder:

1. Compile extension runtime bundle
- Command: npm run compile
- Expected: out/extension.js generated, exit code 0

2. Compile testable utility bundle
- Command: npm run compile:testables
- Expected: out/testable.js generated, exit code 0

3. Run automated tests
- Command: npm test
- Expected: all tests pass (7/7 current)

4. Run lint checks
- Command: npm run lint
- Expected: no lint errors

## Current Automated Coverage
- client normalization mapping
- backend error mapping (timeout/quota)
- scan severity filtering and summary stats
- quick-fix remediation normalization (single-line/multiline)

## Manual Integration Checklist
1. Launch Extension Development Host (F5)
2. Run command: Sage Armor: Test Backend Connection
3. Run command: Sage Armor: Scan Current File
4. Verify diagnostics and hover details
5. Verify Quick Fix + Preview Fix actions
6. Run command: Sage Armor: Scan Workspace
7. Verify progress UI and final summary message
8. Open Sage Armor explorer panel and verify grouped issues
9. Click issue from sidebar and verify jump-to-line
10. Open Sage Armor: Advanced Settings and update values
11. Toggle Scan on Save and Scan on Keystroke and verify behavior
12. Change severity filter and verify diagnostics update
13. Apply a fix, then Undo, and verify the issue count returns immediately

## Pass Criteria
- Build, tests, lint all pass
- No extension errors in VS Code problems view
- Core command flows work without crashes
- Sidebar stats and navigation behave correctly
- Quick-fix apply and preview both work

## Known Notes
- Lint may show a TypeScript version support warning from @typescript-eslint parser.
- This warning is non-blocking as long as lint exits successfully.
- VSIX packaging smoke test passed locally and produced `sage-armor-scanner-0.1.0.vsix`.
