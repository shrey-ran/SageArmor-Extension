---
phase: 9
plan: 1
wave: 1
---

# Plan 9.1: Unit Testing — Backend Security Engine

## Objective
Establish a baseline unit test suite for the backend Python modules. Tests must be runnable locally with zero AWS dependencies by mocking Bedrock and GitHub API calls.

## Context
- backend/src/handler.py
- backend/src/prompt_builder.py
- backend/src/github_commenter.py

## Tasks

<task type="auto">
  <name>Create pytest Unit Tests for Backend Modules</name>
  <files>
    backend/tests/__init__.py
    backend/tests/test_prompt_builder.py
    backend/tests/test_github_commenter.py
    backend/tests/test_handler.py
  </files>
  <action>
    - Create `backend/tests/__init__.py` (empty, marks the directory as a Python package).
    
    - Create `backend/tests/test_prompt_builder.py`:
      - Test that `build_security_prompt` returns a non-empty string.
      - Test that passing `language='terraform'` results in a prompt containing "IaC" mode text.
      - Test that passing `language='python'` results in a prompt containing "SAST" mode text.
      - Test that `poc_exploit_scenario` is mentioned in the prompt schema.
      - Test that `remediation` is mentioned in the prompt schema.
    
    - Create `backend/tests/test_github_commenter.py`:
      - Test that `_build_review_body([])` returns the clean "Security Review Passed" message.
      - Test that `_build_review_body([...])` with one High finding contains "🟠".
      - Test that `post_pr_review` returns `False` when `GITHUB_TOKEN` is not set (mock env, no real request).

    - Create `backend/tests/test_handler.py`:
      - Mock `boto3.client` to prevent real AWS calls.
      - Test that `review_code` returns 400 when body has no `code` key.
      - Test that `review_code` returns 401 when signature validation fails.
      - Use `unittest.mock.patch` throughout. Do not make any real network calls.

    - Add `pytest` and `pytest-mock` to `backend/requirements.txt`.
  </action>
  <verify>cd backend && source venv/bin/activate && python -m pytest tests/ -v --no-header 2>&1 | tail -15</verify>
  <done>Backend module unit tests passing with zero real cloud dependencies.</done>
</task>

## Success Criteria
- [ ] All pytest tests pass locally without real AWS or GitHub credentials.
- [ ] Prompt builder tests validate SAST vs IaC routing logic.
- [ ] GitHub commenter tests validate the Markdown render output.
- [ ] Handler tests validate the input validation and auth guard logic.
