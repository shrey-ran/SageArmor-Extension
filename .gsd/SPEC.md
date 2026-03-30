# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
To build SageArmor AI, an autonomous AI-powered digital security engineer that automatically analyzes Application Code, Cloud Infrastructure (IaC), and IAM Policies instantly during developer PR workflows. It aims to reduce security review time from days to seconds while providing AI-generated educational insights and auto-remediation patches.

## Goals
1. **Unified Security Scanning:** Support real-time scanning for Code (Python/JS), IaC (Terraform/YAML), and IAM configurations.
2. **AI Reasoning Engine:** Utilize Claude 3.5 Sonnet to accurately detect vulnerabilities, explain their risks, and formulate precise drop-in code fixes with zero false positives.
3. **Immersive Dashboard & Automation:** Provide a stunning, kinetic dark-mode React UI for manual oversight and deep GitHub PR integration for hands-off autonomous code reviews.

## Non-Goals (Out of Scope)
- Automatically executing git merges with fixes (fixes require human review/approval).
- Dynamic AppSec testing or active pentesting network targets.
- Supporting non-AWS AI environments (locked to Bedrock Claude 3.5 for standardizations).

## Users
- Developers seeking instant security checks on their branches.
- DevOps Engineers auditing infrastructure templates.
- Security Teams monitoring organizational security postures.

## Constraints
- **Technical:** Completely serverless backend using AWS Lambda and EventBridge.
- **Aesthetic:** Mandatory dark-mode aesthetic utilizing strictly configured Tailwind CSS v4 variables with "Kinetic Command Center" styling principles.
- **Security:** Zero sensitive data leakage or PII exposure to external logs.

## Success Criteria
- [ ] MTTR for security reviews reduced to under 60 seconds.
- [ ] Webhook receiver cleanly intercepts, parses, and acts upon GitHub PRs.
- [ ] React UI dynamically displays AI API results for code snippets.
- [ ] AI models consistently return structured, parseable JSON payloads.
