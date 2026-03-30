# ROADMAP.md

> **Current Phase**: Phase 2 (Input Processing)
> **Milestone**: v1.0

## Must-Haves (from SPEC)
- [ ] Functional AWS Bedrock Lambda integration.
- [ ] GitHub webhook ingestion for PR diffs.
- [ ] Dynamic React dashboard plotting live API data.

## Phases

### Phase 1: Setup
**Status**: ✅ Complete
**Objective**: Initialize AWS Account, EventBridge, Lambda, and local environment secrets.

### Phase 2: Input Processing
**Status**: ✅ Complete
**Objective**: Build webhook APIs to intercept GitHub events and parse Terraform/YAML source configs.

### Phase 3: AI Engine
**Status**: ✅ Complete
**Objective**: Establish Bedrock model logic, system prompts, Knowledge Base RAG elements (NIST/CIS).

### Phase 4: Security Analysis
**Status**: ⬜ Not Started
**Objective**: Fine-tune prompts for specific Code vulnerability detection, IAM policy issues, and Misconfigurations.

### Phase 5: Exploit Validation
**Status**: ⬜ Not Started
**Objective**: Implement heuristics simulating attack scenarios to verify exploitability and squelch false positives.

### Phase 6: Auto-Remediation
**Status**: ⬜ Not Started
**Objective**: Standardize patch generation and suggested fix formats.

### Phase 7: Frontend Dashboards
**Status**: ✅ Complete
**Objective**: Connect the newly created React UI directly to the Python backend to escape manual mock data.

### Phase 8: Integration
**Status**: ⬜ Not Started
**Objective**: GitHub Action/App integration to post inline line-by-line comments on PRs.

### Phase 9: Testing
**Status**: ⬜ Not Started
**Objective**: Security and mock payload unit testing to verify pipeline efficiency.

### Phase 10: Deployment
**Status**: ⬜ Not Started
**Objective**: Prod deployment of Serverless App and Vite UI.
