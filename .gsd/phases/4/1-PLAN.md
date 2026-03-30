---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: Specialized Security Analysis Routing

## Objective
Enhance the AI's detection capabilities by categorizing inputs into Infrastructure-as-Code (IaC) vs. Application Code (SAST) and routing tailored context mapping for highly granular, specialized findings.

## Context
- .gsd/ROADMAP.md
- frontend/src/App.tsx
- backend/src/handler.py
- backend/src/prompt_builder.py

## Tasks

<task type="auto">
  <name>Add Language Context to Frontend</name>
  <files>
    frontend/src/App.tsx
  </files>
  <action>
    - Open `frontend/src/App.tsx`.
    - Introduce a new state variable: `const [language, setLanguage] = useState('python');`.
    - Modify the `handleScan` payload body to `JSON.stringify({ code: codeSnippet, language })`.
    - Next to the "Snippet Scanner" heading, inject a sleek, dark-mode styling `<select>` dropdown using Tailwind giving options like `Python`, `JavaScript`, `Terraform`, `YAML`, `Go`. Bind its exact value to `setLanguage`.
  </action>
  <verify>grep -q 'language' frontend/src/App.tsx && echo "Success"</verify>
  <done>Frontend accurately categorizes manual test payloads into strict language definitions for the AI engine.</done>
</task>

<task type="auto">
  <name>Implement AI Branch Routing & Heuristics</name>
  <files>
    backend/src/handler.py
    backend/src/prompt_builder.py
  </files>
  <action>
    - In `backend/src/handler.py`, parse `"language"` from the request body. If a pull request, detect language heuristics (if diff contains `.tf` or `.yml`, use `"terraform"` or `"yaml"`, otherwise fallback to generic).
    - Update the function signature to `build_security_prompt(code_snippet: str, language: str)`.
    - In `backend/src/prompt_builder.py`, implement an `if/else` check on `language`. 
    - If `language` is `terraform` or `yaml`, heavily emphasize Cloud formation, IAM scopes, and AWS encryption misconfigurations.
    - If `language` is `javascript`, `python`, `go`, emphasize Injection flaws, XSS, Path Traversal, and logic abuse according to standard SAST definitions.
  </action>
  <verify>grep -q 'language: str' backend/src/prompt_builder.py && echo "Success"</verify>
  <done>Backend now surgically routes logic down SAST or IaC analysis paths for maximum LLM precision.</done>
</task>

## Success Criteria
- [ ] Users can toggle the snippet scanner's language via the React dashboard.
- [ ] API payloads securely transmit this context.
- [ ] Bedrock's prompt builder correctly switches sub-prompts based on language context.
