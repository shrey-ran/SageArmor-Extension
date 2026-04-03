# Sage Armor Extension + Backend

This repository contains only the files required to run Sage Armor end-to-end right now:

- VS Code extension package: `extension/sage-armor-scanner-0.1.2.vsix`
- Extension source/config: `extension/`
- Backend API: `backend/`

## Prerequisites

- Python 3.9+
- VS Code 1.75+

## 1) Start Backend

```bash
cd backend
python3 -m pip install -r requirements.txt
cp .env.example .env
python3 server.py
```

Backend runs at `http://localhost:3000` by default.

Set your API key in `backend/.env` if you want model-backed analysis.

## 2) Install Extension

Install the prebuilt VSIX file:

- Open VS Code
- Go to Extensions panel
- Click `...` -> `Install from VSIX...`
- Choose `extension/sage-armor-scanner-0.1.2.vsix`

## 3) Configure Extension

In VS Code settings, confirm:

```json
{
  "sageArmor.backendUrl": "http://localhost:3000"
}
```

## 4) Use It

1. Open a supported code file.
2. Run `Sage Armor: Scan Current File`.
3. Review diagnostics and apply fixes.

## Notes

- This repo intentionally excludes non-runtime project files.
- For users, installing the VSIX + running backend is sufficient.
