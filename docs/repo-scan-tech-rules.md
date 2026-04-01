# Tech Rules: Selective GitHub Repo Scan

## Backend
- Runtime: Python 3.11 (existing serverless backend)
- Endpoint: POST /repo-scan
- Module: backend/src/repo_selective_scan.py

## Search Strategy
1. Use os.walk for repository mapping.
2. Skip heavy/sensitive directories:
- .git
- node_modules
- venv/.venv
- build/dist
- hidden directories

3. Use native search tools:
- Prefer ripgrep (rg)
- Fallback to grep -rlI

4. Rank by:
- keyword frequency
- security-path bonus (auth/api/iam/db/infra)

5. Read limits:
- max file size threshold
- excerpt truncation (4,000 chars)
- Top-K selected files only

## Security Rules
- Allow only https://github.com URLs.
- Do not execute repository code.
- Never expose token in API response.
- Keep clone in temp directory and auto-cleanup.

## Integration Rules
- Preserve existing /review behavior.
- Reuse existing attack intelligence pipeline.
- Keep response JSON compatible with current dashboard tabs.

## Reliability Rules
- Validate input fields and top_k type.
- Return clear 4xx errors for invalid requests.
- Provide local fallback vulnerability review when model fails.
