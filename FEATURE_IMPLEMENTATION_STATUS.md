# Feature Implementation Status

_Last updated: 2026-04-01_

## Summary Counts

- Total tracked features: **25**
- Fully functional: **16**
- Partially functional: **6**
- Needs testing: **3**

## Status Criteria

- **Fully functional**: Implemented and currently validated (unit tests and/or successful frontend build and local flow checks).
- **Partially functional**: Implemented, but constrained by environment/provider dependencies or known hardening gaps.
- **Needs testing**: Implemented/planned, but lacks sufficient automated or performance validation.

## Feature Matrix

| # | Feature | Area | Status | Evidence / Notes |
|---|---|---|---|---|
| 1 | Snippet security scan (`/review`) | Backend | Fully functional | Endpoint present and exercised in backend tests; local fallback path available. |
| 2 | GitHub webhook trigger handling (`/webhook`) | Backend | Fully functional | Route active; signature validation and webhook action handling covered in tests. |
| 3 | GitHub PR comment automation | Backend | Partially functional | Implemented, but requires valid `GITHUB_TOKEN` and repo permissions at runtime. |
| 4 | Attack path generation (`/attack-path`) | Backend | Fully functional | Route active; covered in handler tests and integrated in UI Attack View. |
| 5 | Risk scoring (`/risk-score`) | Backend | Fully functional | Route active and used by Risk Panel rendering. |
| 6 | Breach simulation (`/simulate`) | Backend | Fully functional | Route active; empty-list safety guards added and tested. |
| 7 | AI Copilot (`/copilot`) | Backend | Partially functional | Works with model provider; degrades to local fallback on provider errors. |
| 8 | GitHub selective repo scan (`/repo-scan`) | Backend | Fully functional | Route active; selective scan engine integrated and handler tests passing. |
| 9 | Repo map generation (os.walk + ignore rules) | Backend | Fully functional | Implemented in `repo_selective_scan.py` and used in `/repo-scan`. |
| 10 | Native keyword search (`rg`/`grep` fallback) | Backend | Fully functional | Implemented with OS-native search fallback logic. |
| 11 | Ranking + Top-K file selection | Backend | Fully functional | Implemented and used in repo-scan path selection. |
| 12 | Local SAST scanner patterns | Backend | Fully functional | Implemented and used when model path unavailable. |
| 13 | Gemini as primary provider | Backend | Fully functional | Provider selection implemented; env-configured model invocation path present. |
| 14 | AWS Bedrock as secondary provider | Backend | Partially functional | Still available as fallback provider, requires valid AWS runtime setup/access. |
| 15 | Frontend snippet scan UX (New Scan) | Frontend | Fully functional | Present in `App.tsx`; build passes. |
| 16 | Frontend repo scan controls | Frontend | Fully functional | Repo URL/branch/hunt query controls + trigger button implemented. |
| 17 | Findings tab rendering | Frontend | Fully functional | Findings list with remediation and attack vector shown. |
| 18 | Attack View graph (React Flow) | Frontend | Fully functional | Graph renders with dark-theme visibility fixes and controls. |
| 19 | Breach Simulation tab | Frontend | Fully functional | Chain/access/impact data displayed from backend simulation output. |
| 20 | AI Copilot tab UI | Frontend | Fully functional | Chat panel integrated with `/copilot` endpoint. |
| 21 | Security score + severity counters | Frontend | Fully functional | Score/risk panel logic updated and rendering stable in build. |
| 22 | Deduped risk display | Full stack | Partially functional | Dedup logic added, but should be validated with more mixed-repo cases. |
| 23 | Repo-scan utility unit tests (`repo_selective_scan.py`) | Testing | Needs testing | Explicitly still pending in `docs/repo-scan-todo.md`. |
| 24 | Frontend integration tests for repo scan flow | Testing | Needs testing | Not yet implemented. |
| 25 | 1k+ file performance benchmark | Testing | Needs testing | Planned but not yet executed/documented. |

## Current Verification Snapshot

- Backend tests: **pass** (`python3 -m unittest discover -s tests -q`)
- Frontend build: **pass** (`npm run build`)

## Recommended Next Validation Pass

1. Add unit tests for `backend/src/repo_selective_scan.py` (filtering, ranking, truncation).
2. Add frontend integration tests for full repo-scan user flow and tab transitions.
3. Run documented performance test on a large repository (1000+ files) and record timings.
4. Run one end-to-end provider test for both Gemini-primary and Bedrock-secondary modes.
