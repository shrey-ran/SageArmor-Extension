# Product Requirement Document (PRD)

## Product Name
Selective GitHub Repository Security Scan Module

## Objective
Enable the existing AI Security Review Agent to scan large GitHub repositories (1,000+ files) using selective retrieval instead of brute-force full-file ingestion.

## Problem
Current snippet scanning works for pasted code, but repository-scale scanning requires:
- fast repo awareness
- token-efficient file selection
- minimal API-rate and model-token usage

## Proposed Solution
Add a 2-phase selective search pipeline:
1. Phase A: Lightweight repository mapping using directory traversal.
2. Phase B: Fast keyword search and ranking using native command-line search.

Only top-ranked files are sent for model review and attack intelligence processing.

## Core Features
1. GitHub repo URL scanning from dashboard.
2. Repository map generation with ignored heavy directories.
3. Keyword extraction from user query.
4. Native fast search (ripgrep/grep fallback).
5. Top-K file ranking and truncation-based grounding.
6. Vulnerability, attack path, risk score, and simulation output reuse.

## User Flow
1. User enters GitHub URL + branch + hunt query.
2. Backend clones shallow repo to temp storage.
3. Backend maps and filters candidate files.
4. Backend selects top-ranked files.
5. Existing security analysis pipeline runs.
6. UI shows findings + attack intelligence tabs.

## Success Metrics
- Scan startup under 5 seconds for typical repositories.
- Avoid loading more than Top-K files into model context.
- Maintain current snippet-scan behavior with zero regressions.
- Keep model token usage stable across large repositories.

## Constraints
- Only https GitHub repositories are allowed.
- Hidden/system directories and binary files are excluded.
- Large files are truncated before model prompting.
