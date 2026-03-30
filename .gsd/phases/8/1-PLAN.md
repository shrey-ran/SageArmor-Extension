---
phase: 8
plan: 1
wave: 1
---

# Plan 8.1: GitHub PR Auto-Comment Integration

## Objective
Wire the SageArmor AI backend directly into GitHub's Pull Request review system. When a PR webhook is received, the AI findings should be automatically posted back as inline GitHub code review comments — turning SageArmor into a fully autonomous security reviewer that appears natively inside GitHub's PR interface.

## Context
- .gsd/ROADMAP.md
- backend/src/handler.py
- backend/src/prompt_builder.py
- backend/serverless.yml

## Tasks

<task type="auto">
  <name>Build GitHub PR Comment Poster</name>
  <files>
    backend/src/github_commenter.py
  </files>
  <action>
    - Create `backend/src/github_commenter.py`.
    - Write a function `post_pr_review(repo_full_name: str, pr_number: int, vulnerabilities: list) -> bool`.
    - The function should use the GitHub REST API (`https://api.github.com/repos/{repo}/pulls/{pr_number}/reviews`) to post a PR review using `GITHUB_TOKEN` from environment variables.
    - Build a formatted review body by iterating over vulnerabilities and rendering each as a GitHub Markdown block with:
      - Severity badge (🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low)
      - Issue title in bold
      - Explanation paragraph
      - Attack Scenario block (using ```diff... ``` fenced code block)
      - Remediation patch in a code fence
    - Submit the review with `event: "COMMENT"` (non-blocking, does not approve/reject).
    - Return `True` on success, `False` on failure, with error logging.
  </action>
  <verify>test -f backend/src/github_commenter.py && grep -q 'post_pr_review' backend/src/github_commenter.py && echo "Success"</verify>
  <done>GitHub PR comment poster module created and ready for integration.</done>
</task>

<task type="auto">
  <name>Wire PR Commenter into Webhook Handler</name>
  <files>
    backend/src/handler.py
  </files>
  <action>
    - Open `backend/src/handler.py`.
    - Import `post_pr_review` from `github_commenter`.
    - In the GitHub Webhook flow (where `'pull_request' in body`), after the AI analysis is complete and `analysis_result` is parsed:
      - Extract `repo_full_name = body['repository']['full_name']` and `pr_number = body['pull_request']['number']`.
      - Call `post_pr_review(repo_full_name, pr_number, analysis_result.get('vulnerabilities', []))`.
      - Log the result but do NOT block the response — fire-and-forget style.
    - This path should be skipped for direct code snippet requests from the frontend dashboard.
  </action>
  <verify>grep -q 'post_pr_review' backend/src/handler.py && echo "Success"</verify>
  <done>Webhook handler now autonomously posts AI findings back to GitHub PRs after each scan.</done>
</task>

<task type="auto">
  <name>Dashboard Integration Status Indicator</name>
  <files>
    frontend/src/App.tsx
  </files>
  <action>
    - Open `frontend/src/App.tsx`.
    - In the "Analysis Results" header section, add a small badge/pill next to "Live Scan Mode" indicating the GitHub integration status.
    - Render text: "GitHub PR Auto-Review: Active" with a small green pulsing dot, using the same `animate-pulse` style as the existing system status dot.
    - This is a static indicator — it communicates capability, not real-time webhook state.
  </action>
  <verify>grep -q 'Auto-Review' frontend/src/App.tsx && echo "Success"</verify>
  <done>Dashboard now communicates the GitHub autonomous review capability to users at a glance.</done>
</task>

## Success Criteria
- [ ] `github_commenter.py` posts structured Markdown AI reviews to the GitHub PR review API.
- [ ] Handler automatically triggers the commenter for webhook-received PRs.
- [ ] Frontend communicates the GitHub PR integration capability is active.
