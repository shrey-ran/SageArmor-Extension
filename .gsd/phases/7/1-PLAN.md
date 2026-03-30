---
phase: 7
plan: 1
wave: 1
---

# Plan 7.1: Frontend Dashboard API Connection

## Objective
Escape manual mock data by wiring the React dashboard to the AWS Serverless AI backend, allowing users to submit new scans and visually analyze real Claude 3.5 findings.

## Context
- .gsd/SPEC.md
- frontend/src/App.tsx
- frontend/.env

## Tasks

<task type="auto">
  <name>Setup React State and Fetcher</name>
  <files>
    frontend/src/App.tsx
  </files>
  <action>
    - Import `useState` in `App.tsx`.
    - Create `codeSnippet` state (defaulting to a mock vulnerable Python snippet with SQL injection or similar risk).
    - Create `scanResults` state to hold the AI findings object, and `isScanning` (boolean).
    - Implement a `handleScan` async function using `fetch` or `axios` against `import.meta.env.VITE_API_BASE_URL + '/review'` using HTTP POST. Send `{"code": codeSnippet}` as body so the AI analyzes it.
    - Wire `handleScan` to the "New Scan" UI button. Alter the button text/icon conditionally to display "Scanning..." using the `isScanning` variable.
  </action>
  <verify>grep -q 'handleScan' frontend/src/App.tsx && echo "Success"</verify>
  <done>React component structure has initialized states capable of tracking the asynchronous network call.</done>
</task>

<task type="auto">
  <name>Render API Findings Dynamically</name>
  <files>
    frontend/src/App.tsx
  </files>
  <action>
    - Modify the hardcoded Vulnerabilities metrics. Instead of arbitrary numbers, count how many findings are "High", "Medium", or "Low" inside `scanResults` and render them in the corresponding UI blocks. Compute an "Overall Security Score" derived from these.
    - Overhaul the "Active Pull Request Review" right column. If `scanResults` exists, map over `scanResults.vulnerabilities`.
    - Inside each iteration, render the AI's exact Issue Title (`v.issue`), exact explanation (`v.explanation`), and the code diff replacement `v.suggested_fix` mirroring the existing aesthetic block designs.
    - Provide empty/null handling when no scan exists yet.
  </action>
  <verify>grep -q 'map' frontend/src/App.tsx && echo "Success"</verify>
  <done>Frontend accurately parses the JSON response from AWS Bedrock and re-renders dynamically.</done>
</task>

## Success Criteria
- [ ] Users can trigger a live AI scan inside the Dashboard.
- [ ] The dashboard loading state correctly informs the user that Claude 3.5 is reasoning over the code.
- [ ] Live security cards update identically when vulnerabilities are physically returned.
