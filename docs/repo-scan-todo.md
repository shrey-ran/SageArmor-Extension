# TODO: Selective GitHub Repo Scan

## Phase 1: Planning and Contracts
- [x] Write PRD for selective repo scan
- [x] Write design document for UI integration
- [x] Write tech rules and constraints
- [x] Define endpoint contract for /repo-scan

## Phase 2: Backend Engine
- [x] Build repository map utility (os.walk)
- [x] Add directory/file filtering rules
- [x] Add keyword extraction logic
- [x] Add native search (rg/grep fallback)
- [x] Add ranking and Top-K selection

## Phase 3: Backend API Integration
- [x] Add /repo-scan handler in backend
- [x] Reuse vulnerability + attack intelligence pipeline
- [x] Return repo stats, selected files, findings

## Phase 4: Frontend Integration
- [x] Add repo scan controls in scanner panel
- [x] Wire UI to /repo-scan endpoint
- [x] Reuse existing results tabs for rendering

## Phase 5: Testing and Validation
- [x] Add unit tests for /repo-scan behavior
- [ ] Add tests for repo_selective_scan utility module
- [ ] Add frontend integration tests for repo scan flow
- [ ] Run performance test with 1k+ file repository

## Phase 6: Hardening
- [ ] Add optional progress events / staged statuses
- [ ] Add per-scan timeout and cancellation support
- [ ] Add token/secret masking before prompting
- [ ] Add repo scan result caching by commit SHA
