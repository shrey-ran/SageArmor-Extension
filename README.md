# Sage Armor

Sage Armor is an AI-assisted secure coding platform that combines:

- A VS Code extension for inline vulnerability detection and remediation
- A backend analysis service (model-first with local SAST fallback)
- A frontend/dashboard layer for broader workflow integration

This repository is organized for end-to-end secure development from local coding to deployment-ready packaging.

## 1. Repository Structure

```text
Sage-Armor-hack/
├── backend/                 # Python backend API + SAST logic
├── extension/               # VS Code extension (TypeScript)
├── frontend/                # Frontend application
├── docs/                    # Project docs
├── scripts/                 # Utility scripts
└── README.md                # This file
```

## 2. Core Capabilities

- Real-time vulnerability scanning in editor
- Inline diagnostics and security hover details
- Quick Fix actions with language-aware remediation
- Sidebar issue explorer with severity counts
- Workspace scanning and issue summarization
- Model-backed analysis path with deterministic fallback

## 3. Prerequisites

- Node.js 18+
- npm 9+
- Python 3.9+
- VS Code 1.75+

## 4. Backend Setup

From `backend/`:

```bash
cd backend
python3 -m pip install -r requirements.txt
```

Create `backend/.env`:

```env
MODEL_PROVIDER=gemini
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
AWS_REGION=us-east-1
```

Run backend locally:

```bash
python3 server.py
```

Expected startup:

- `Starting Sage Armor backend on http://localhost:3000`

## 5. Extension Setup (Development)

From `extension/`:

```bash
cd extension
npm install
npm run compile
```

To run in Extension Development Host:

- Open `extension/` in VS Code
- Press `F5`

## 6. Extension Setup (VSIX Distribution)

Build VSIX:

```bash
cd extension
npm run package
```

Install in VS Code:

- Extensions panel -> `...` -> `Install from VSIX...`
- Select the generated `.vsix` file
- Reload window

## 7. Extension Configuration

In VS Code Settings (`sageArmor`):

- `sageArmor.backendUrl` (default: `http://localhost:3000`)
- `sageArmor.scanOnSave`
- `sageArmor.scanOnKeystroke`
- `sageArmor.severityFilter`

Recommended local config:

```json
{
  "sageArmor.backendUrl": "http://localhost:3000",
  "sageArmor.scanOnSave": true,
  "sageArmor.scanOnKeystroke": false
}
```

## 8. Using Sage Armor

Typical flow:

1. Start backend service
2. Open a supported source file in VS Code
3. Run `Sage Armor: Scan Current File`
4. Review diagnostics and hover details
5. Use `Quick Fix...` -> `Apply suggested fix`
6. Re-scan and verify issue count decreases

## 9. Supported Languages

Current extension language support includes:

- JavaScript / TypeScript
- Python
- Java
- Go
- C / C++ / C#
- Ruby
- PHP
- Swift
- Kotlin
- Rust
- SQL

## 10. Build, Test, and Quality Gates

From `extension/`:

```bash
npm run compile
npm test
npm run lint
npm run package
```

From `backend/`, run your service-level checks as needed for your environment.

## 11. Troubleshooting

### Extension installed but scan does not work

- Confirm backend is running
- Confirm `sageArmor.backendUrl` is correct
- Run `Sage Armor: Test Backend Connection`

### API quota exhausted

- Backend may fall back to local SAST mode
- Update API key or quota on provider side
- Restart backend after key update

### Quick Fix appears but does not change code

- Ensure the latest VSIX is installed
- Reload VS Code window
- Re-run scan before applying fix

## 12. Deployment Notes

### Backend

- Deploy `backend/` to your runtime (container/VM/serverless)
- Set secrets through environment variables (do not commit keys)
- Expose HTTPS API endpoint

### Extension

- Package VSIX for private/internal distribution
- Publish to marketplace/Open VSX when credentials are available

## 13. Security and Secret Management

- Keep API keys server-side (backend env)
- Never hardcode secrets in source
- Rotate keys if exposed
- Use secret manager in production (Vault/Cloud Secret Manager/AWS Secrets Manager)

## 14. License

See the `extension/LICENSE` and repository licensing terms.

## 15. Contact and Maintenance

For project updates, contribution flow, and release notes, refer to repository docs and changelog files in `extension/` and `docs/`.
