---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: AI Knowledge Context (CIS/NIST Integration)

## Objective
Elevate the AI engine's reasoning by injecting formalized CIS/NIST security guidelines as contextual grounding (a lightweight static RAG setup) to prevent hallucinations, reduce false positives, and ensure industry-compliant remediation suggestions.

## Context
- .gsd/SPEC.md
- backend/src/handler.py

## Tasks

<task type="auto">
  <name>Construct Security Guidelines Knowledge Base</name>
  <files>
    backend/src/guidelines.json
  </files>
  <action>
    - Create `backend/src/guidelines.json` with a structured payload containing core security baseline rules.
    - Include rules like: "IAM Least Privilege" (never allow '*'), "S3 Secure Defaults" (Block Public Access, require Server-Side Encryption), and "Hardcoded Secrets" (never commit AWS keys, DB passwords, or tokens in source code).
    - Map each rule to a reference standard (e.g., "CIS AWS Foundations Benchmark v3.0.0").
  </action>
  <verify>test -f backend/src/guidelines.json && echo "Success"</verify>
  <done>Static formalized knowledge base created for Claude 3.5 Sonnet to ingest as grounded truth.</done>
</task>

<task type="auto">
  <name>Decouple Prompt Engineering Logic</name>
  <files>
    backend/src/prompt_builder.py
    backend/src/handler.py
  </files>
  <action>
    - Create `backend/src/prompt_builder.py`.
    - Write a function `build_security_prompt(code_snippet: str) -> str` that reads `guidelines.json`.
    - Construct an advanced system prompt that instructs Claude to strictly adhere to the provided guidelines.
    - Instruct Claude that it must output ONLY valid JSON using the existing expected schema (`vulnerabilities` array with `severity`, `issue`, `explanation`, `suggested_fix`).
    - Refactor `backend/src/handler.py` to import `build_security_prompt` from `prompt_builder` instead of using the hardcoded inline string.
  </action>
  <verify>grep -q 'prompt_builder' backend/src/handler.py && echo "Success"</verify>
  <done>Prompt logic successfully modularized and supercharged with context-aware RAG principles.</done>
</task>

## Success Criteria
- [ ] `prompt_builder.py` cleanly builds a dynamic prompt.
- [ ] `guidelines.json` is successfully parsed and injected into the AI's context window.
- [ ] `handler.py` imports and uses the streamlined prompt without hardcoded blocks.
