---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: GitHub Webhook Integration

## Objective
Implement a secure GitHub Webhook receiver that automatically fetches full PR diffs for the AI to review, including support for Terraform and YAML detection.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- backend/src/handler.py
- backend/requirements.txt

## Tasks

<task type="auto">
  <name>Install Requests and Github Webhook Validation setup</name>
  <files>
    backend/requirements.txt
    backend/.env.example
  </files>
  <action>
    - Add `requests==2.31.0` to `backend/requirements.txt`.
    - Add `GITHUB_TOKEN=` and `GITHUB_WEBHOOK_SECRET=` to `backend/.env.example` if they don't already exist.
  </action>
  <verify>grep -q "requests" backend/requirements.txt && echo "Success"</verify>
  <done>Requirements updated to support standard HTTP calls to GitHub APIs.</done>
</task>

<task type="auto">
  <name>Implement GitHub PR Diff Fetching</name>
  <files>
    backend/src/handler.py
  </files>
  <action>
    - Import `import requests`, `import hmac`, and `import hashlib`.
    - Create a helper to validate `X-Hub-Signature-256` from event `headers` against `os.getenv('GITHUB_WEBHOOK_SECRET')` (but catch gracefully if token is absent, so frontend calls still work).
    - In `review_code`, detect GitHub PR context. If the body contains a `pull_request` and `action` is "opened" or "synchronize", fetch the `diff_url` using `requests.get` with an optional generic Bearer `GITHUB_TOKEN`.
    - Feed the full raw diff content to the Bedrock prompt instead of the simple mock string.
    - Update the system prompt to instruct Claude to treat PR diffs directly (e.g. noticing Terraform or YAML file patterns in the diffs natively).
  </action>
  <verify>grep -q "requests.get" backend/src/handler.py && echo "Success"</verify>
  <done>Webhook payloads correctly download GitHub PR diffs and pass them to Claude 3.5 Sonnet.</done>
</task>

## Success Criteria
- [ ] Dependencies updated for HTTP requests.
- [ ] handler.py securely verifies payloads and fetches remote PR diffs before analyzing.
