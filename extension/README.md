# Sage Armor Security Scanner - VS Code Extension

## 🛡️ Overview

Sage Armor Security Scanner brings real-time vulnerability detection directly into VS Code. Scan your code as you write it and get instant security feedback powered by Gemini AI.

## ✨ Features

### MVP (Phase 1)
- 🔍 **Real-time Scanning**: Automatic vulnerability detection on file save
- 🚨 **Inline Warnings**: Red squiggles for critical/high severity issues
- 💡 **Quick Fixes**: One-click code remediation for detected vulnerabilities
- 🎯 **Attack Vectors**: Detailed hover tooltips with attack scenarios
- 📊 **Sidebar Panel**: View all issues across your workspace

### Coming Soon (Phase 2+)
- Workspace-wide scanning
- Advanced settings panel
- GitHub PR integration
- Custom severity filtering
- Batch fix application

## 🚀 Quick Start

### 1. Install Extension
```bash
# From VS Code Marketplace (coming soon)
# Or install locally:
cd extension
npm install
npm run compile
# Press F5 to debug
```

### 2. Configure Backend URL
1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "Sage Armor"
3. Set backend URL: `http://localhost:3000` (or your server)
4. Add Gemini API key (optional, if using self-hosted)

### 3. Start Using
1. Open any Python/JavaScript/TypeScript file
2. Extension activates automatically
3. Edit and save → vulnerabilities appear as squiggles
4. Hover on squiggle → see details and fix
5. Click "Apply Fix" → code updates instantly

## 🔧 Requirements

- VS Code 1.75.0 or higher
- Node.js 16+ (for development)
- Sage Armor backend running on localhost:3000 (or configured URL)
- Gemini API key (for model-powered scanning)

## ⚙️ Settings

Available in VS Code Settings under `sageArmor`:

```json
{
  "sageArmor.backendUrl": "http://localhost:3000",
  "sageArmor.scanOnSave": true,
  "sageArmor.scanOnKeystroke": false,
  "sageArmor.severityFilter": ["Critical", "High", "Medium"],
  "sageArmor.supportedLanguages": ["python", "javascript", "typescript"]
}
```

## 🎯 Commands

| Command | Description |
|---------|-------------|
| `Sage Armor: Scan Current File` | Manually scan active editor |
| `Sage Armor: Scan Workspace` | Scan all files in workspace |
| `Sage Armor: Settings` | Open extension settings |
| `Sage Armor: Test Connection` | Verify backend connection |

## 🐛 Troubleshooting

### Extension not activating?
- Make sure file is .py, .js, or .ts
- Check VS Code output channel for error logs

### "Cannot connect to backend"?
- Verify backend is running on configured URL
- Check firewall settings
- Run "Sage Armor: Test Connection" command

### Scans returning no issues?
- Check backend logs for errors
- Verify Gemini API key is valid
- Ensure backend has Gemini quota available

### Quota exceeded error?
- You've hit the Gemini API limit
- Wait for quota reset (usually daily)
- Enable billing for higher limits

## 📚 Development

### Project Structure
```
extension/
├── src/
│   ├── extension.ts      # Entry point
│   ├── client.ts         # Backend API client
│   ├── scanner.ts        # File watching & scanning
│   ├── diagnostics.ts    # VS Code diagnostics
│   └── settings.ts       # Configuration management
├── package.json
├── tsconfig.json
└── README.md
```

### Build
```bash
npm install
npm run compile        # Build once
npm run watch         # Watch mode
npm run lint          # Check code style
```

### Test
```bash
npm test
```

### Debug
```bash
# Open extension folder in VS Code
# Press F5 to launch debug window
# Breakpoints work automatically
```

## 🔒 Security & Privacy

- ✅ No telemetry or analytics
- ✅ No user tracking
- ✅ API key stored in VS Code secure storage
- ✅ Code sent only to your configured backend
- ✅ Results cached only in memory

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📞 Support

- 📧 Email: support@sagearmor.io
- 🐛 Issues: GitHub repository
- 💬 Discussions: GitHub discussions

## 🎉 Changelog

### v0.1.0 (MVP)
- Initial release
- Real-time file scanning
- Inline vulnerability display
- Quick fix application
- Sidebar panel with issue list
