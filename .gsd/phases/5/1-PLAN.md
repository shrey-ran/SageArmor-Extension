---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: Attack Simulation & Heuristic Validation (Red Teaming)

## Objective
Implement heuristics that simulate attacker exploit chains to verify exploitability and aggressively squelch false positives. Instead of doubling latency with a second validation AI pass, we will force the primary AI to act as a "Red Team" against itself: requiring a tangible Proof of Concept (PoC) exploit step. If it cannot easily construct a PoC, the vulnerability must be discarded as non-exploitable noise.

## Context
- .gsd/ROADMAP.md
- backend/src/prompt_builder.py
- frontend/src/App.tsx

## Tasks

<task type="auto">
  <name>Red Team Context Injection</name>
  <files>
    backend/src/prompt_builder.py
  </files>
  <action>
    - Open `backend/src/prompt_builder.py`.
    - In the `instructions` variables for both IaC and SAST, inject a strict rule: "You must simulate an attacker's exploit path for every finding. If you cannot describe a realistic attack scenario that leverages this flaw, YOU MUST DISCARD IT to prevent false positives."
    - Add a required field `poc_exploit_scenario` to the JSON schema in the `## Required Output Format` block.
    - Set its definition to: `(string: A clear, step-by-step description or snippet showing exactly how an attacker triggers this exploit)`.
  </action>
  <verify>grep -q 'poc_exploit_scenario' backend/src/prompt_builder.py && echo "Success"</verify>
  <done>AI Prompt structurally demands attack modeling to self-filter unexploitable bugs.</done>
</task>

<task type="auto">
  <name>Display Exploit Validation on Dashboard</name>
  <files>
    frontend/src/App.tsx
  </files>
  <action>
    - Open `frontend/src/App.tsx`.
    - Inside the vulnerability rendering map (`scanResults.vulnerabilities.map(...)`), insert a new prominent block directly under the Explanation section to represent the `v.poc_exploit_scenario`.
    - Style this block with a distinct aggressive security theme (e.g., matching the dark red or hacker green "Kinetic Command Center" style), labeled "Simulated Attack Scenario".
    - Use a `<pre>` tag similar to the `suggested_fix` block.
  </action>
  <verify>grep -q 'poc_exploit_scenario' frontend/src/App.tsx && echo "Success"</verify>
  <done>Frontend displays the verified attack heuristics validating the bug's existence.</done>
</task>

## Success Criteria
- [ ] Bedrock payload requires `poc_exploit_scenario` schema field.
- [ ] False positive rate practically zeroed as unexploitable noise fails the scenario criteria.
- [ ] Frontend visually distinguishes the Exploit Scenario separately from the remediation path.
