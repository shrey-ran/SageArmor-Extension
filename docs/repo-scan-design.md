# Design Document

## Design Goal
Add GitHub repo scanning to existing UI without disrupting current snippet workflow.

## UI Additions
1. Scanner panel now includes:
- GitHub repository URL input
- Branch input
- Hunt query input
- Scan GitHub Repo action button

2. Existing result tabs are reused:
- Findings
- Attack View
- Breach Simulation
- AI Copilot

## Interaction Model
1. User can continue snippet scan as before.
2. User can optionally run repo scan from same scanner block.
3. Result rendering remains unchanged, reducing visual and interaction risk.

## Wireframe (Text)

Scanner Panel
- Snippet editor
- ---
- Repo URL input
- Branch input
- Hunt query input
- [Scan GitHub Repo]

Analysis Results
- Existing tabs and cards remain unchanged.

## UX Principles
- Keep current dashboard layout intact.
- Add feature as optional advanced mode.
- Reuse existing visual language and components.
