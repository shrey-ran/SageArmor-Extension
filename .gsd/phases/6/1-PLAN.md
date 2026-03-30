---
phase: 6
plan: 1
wave: 1
---

# Plan 6.1: Auto-Remediation Engine

## Objective
Standardize and enrich the patch generation pipeline so that every AI finding ships with a structured, copy-pasteable remediation block. Additionally, surface a one-click "Copy Fix" button on the dashboard so developers can instantly apply fixes without manually selecting text.

## Context
- .gsd/ROADMAP.md
- backend/src/prompt_builder.py
- frontend/src/App.tsx

## Tasks

<task type="auto">
  <name>Structured Fix Schema Enforcement</name>
  <files>
    backend/src/prompt_builder.py
  </files>
  <action>
    - Open `backend/src/prompt_builder.py`.
    - Upgrade the `suggested_fix` field definition in the `## Required Output Format` section.
    - Replace the current single-string `suggested_fix` with an object named `remediation` that has two sub-fields:
      - `patch` (string): The minimal drop-in code or config block that directly fixes the vulnerability.
      - `explanation` (string): A one-sentence explanation of why this specific fix is effective.
    - Update the JSON schema comment in the prompt accordingly.
  </action>
  <verify>grep -q 'remediation' backend/src/prompt_builder.py && echo "Success"</verify>
  <done>AI findings now ship with a validated, structured two-part remediation payload.</done>
</task>

<task type="auto">
  <name>Dashboard Copy-Fix UX Upgrade</name>
  <files>
    frontend/src/App.tsx
  </files>
  <action>
    - Open `frontend/src/App.tsx`.
    - Add a new state variable: `const [copiedIdx, setCopiedIdx] = useState<number | null>(null);`.
    - Add a handler function `handleCopyFix` that writes `v.remediation?.patch ?? v.suggested_fix` to the clipboard using `navigator.clipboard.writeText(...)` and briefly sets `copiedIdx` to the finding's index for 2 seconds to provide visual feedback.
    - Update the "Suggested Fix" rendering block:
      - Replace the raw `v.suggested_fix` display with `v.remediation?.patch ?? v.suggested_fix`.
      - Add a small "Copy Fix" icon-button in the top-right corner of the fix block (absolutely positioned) using the `content_copy` material icon.
      - When `copiedIdx === idx`, show the `check_circle` icon in green (`text-primary`) with text "Copied!" instead.
      - Below the code block, if `v.remediation?.explanation` exists, render it as a small italic note in `text-on-surface-variant`.
  </action>
  <verify>grep -q 'copiedIdx' frontend/src/App.tsx && echo "Success"</verify>
  <done>One-click copy-fix button shipped. Developers can now apply AI patches with zero friction.</done>
</task>

## Success Criteria
- [ ] `suggested_fix` schema upgraded to structured `remediation` object in the prompt.
- [ ] Frontend gracefully handles both old (`suggested_fix`) and new (`remediation.patch`) field schemas.
- [ ] "Copy Fix" button works and provides visual confirmation feedback.
