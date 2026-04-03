# VS Code Extension - Design Document

## 🎨 Design Principles
1. **Non-intrusive**: Doesn't interrupt user workflow
2. **Lightweight**: Fast, minimal resource usage
3. **Informative**: Clear, actionable information
4. **Accessible**: Easy to understand even for non-security experts

## 🖼️ UI Components

### 1. Inline Diagnostics (Main View)
```
Line 12: cursor.execute("SELECT * FROM users WHERE id = " + user_id)
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         🔴 SQL Injection Vulnerability
         Severity: CRITICAL | Line 12 | Column 0
```

**Visual Style:**
- Red squiggly underline for critical
- Orange for high
- Yellow for medium
- Gray for low/info
- Same as typical IDE error/warning style

**On Hover:**
```
┌─────────────────────────────────────────┐
│ SQL Injection Vulnerability             │
│ Severity: CRITICAL (9.5/10)            │
├─────────────────────────────────────────┤
│ Description:                            │
│ SQL query is built by concatenating    │
│ user input directly into the SQL       │
│ string.                                 │
│                                         │
│ Attack Vector: External input via      │
│ user-supplied query parameters         │
│                                         │
│ Simulated Attack:                      │
│ Admin login bypass: Supply user_id     │
│ as '1 OR 1=1'                          │
│                                         │
│ [Apply Fix] [Show Details]              │
└─────────────────────────────────────────┘
```

### 2. Quick Fix Code Action (Lightbulb)
```
Line 12:  cursor.execute(...invalid query...)
          ^
          💡 (lightbulb icon)
          
Click → Shows:
┌─────────────────────────────────────┐
│ ✅ Use parameterized query          │
│ cursor.execute(                     │
│   "SELECT * FROM users WHERE id=?", │
│   (user_id,)                        │
│ )                                   │
└─────────────────────────────────────┘
[Apply Fix]  [Copy Fix]
```

### 3. Sidebar Panel
```
┌─────────────────────────────┐
│  🛡️  Sage Armor Scanner     │
├─────────────────────────────┤
│  Current File: main.py      │
│  Total Issues: 3            │
├─────────────────────────────┤
│  🔴 Critical (1)            │
│    [12] SQL Injection       │
├─────────────────────────────┤
│  🟠 High (2)                │
│    [5]  Hardcoded Secret    │
│    [15] Command Injection   │
├─────────────────────────────┤
│ [Scan Workspace] [Settings] │
└─────────────────────────────┘
```

### 4. Status Bar
```
Bottom Left: "🛡️ Sage Armor: 3 issues found (scan @ 14:23:45)"
Click → opens sidebar
```

### 5. Settings Panel
```
┌─────────────────────────────────────┐
│  Sage Armor Settings                │
├─────────────────────────────────────┤
│  API Configuration                  │
│  ┌─────────────────────────────────┐│
│  │ Backend URL:                    ││
│  │ [http://localhost:3000]         ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ Gemini API Key:                 ││
│  │ [••••••••••••••••]              ││
│  └─────────────────────────────────┘│
│                                     │
│  Scan Settings                      │
│  ☑ Scan on file save               │
│  ☐ Scan on keystroke (aggressive)   │
│  ☐ Real-time background scan       │
│                                     │
│  Severity Filter                    │
│  ☑ Show critical                   │
│  ☑ Show high                       │
│  ☑ Show medium                     │
│  ☐ Show low                        │
│                                     │
│  [Scan Workspace] [Test Connection] │
│  [Reset to Defaults]                │
└─────────────────────────────────────┘
```

## 🎯 Interaction Flows

### Flow 1: File Save → Scan → Display
```
User saves file
    ↓
File watcher triggered
    ↓
Check: Is file .py / .js / etc?
    ↓ YES
Read file content
    ↓
Call backend /review endpoint
    ↓
Show spinner in status bar
    ↓
Receive vulnerabilities from Gemini
    ↓
Render diagnostics in editor
    ↓
Update sidebar with findings
    ↓
Show "Scan complete" in status bar
```

### Flow 2: User Hovers on Vulnerability
```
Cursor on squiggly line
    ↓
Show hover tooltip (attack vector + fix)
    ↓
User sees "Apply Fix" button
    ↓
User clicks "Apply Fix"
    ↓
Code is replaced with suggested fix
    ↓
Diagnostics refreshed for that line
```

### Flow 3: User Opens Settings
```
Command palette: "Sage Armor: Settings"
    ↓
Settings panel opens in sidebar
    ↓
User enters Gemini API key
    ↓
User clicks "Test Connection"
    ↓
Extension calls test endpoint
    ↓
Show "✅ Connection successful" or error
```

## 📐 Layout Decisions

**Left Sidebar Icon**: Shield icon (🛡️) in activity bar
**Sidebar Panel**: Always visible, toggleable
**Hover Tooltips**: Standard VS Code markdown hover
**Diagnostics**: Standard VS Code squiggly lines
**Status Bar**: Right side, shows scan status

## 🎨 Color Scheme (Dark Mode)
- Critical (Red): #f85149
- High (Orange): #fb8500
- Medium (Yellow): #fbbf24
- Low (Gray): #6b7280
- Fixed (Green): #10b981

## 📱 Responsive Design
- Works on small displays (laptop)
- Sidebar collapses on narrow screens
- Tooltip repositions to avoid overflow
- Status bar text truncates gracefully
