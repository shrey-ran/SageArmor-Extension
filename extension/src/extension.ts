import * as vscode from 'vscode';
import { ExtensionClient } from './client';
import { ScannerManager } from './scanner';
import { DiagnosticsManager } from './diagnostics';
import { SettingsManager } from './settings';
import { SageArmorSidebarProvider } from './sidebar';
import { AdvancedSettingsPanel } from './settingsPanel';
import { normalizeRemediation } from './fixUtils';

let diagnosticsManager: DiagnosticsManager;
let scannerManager: ScannerManager;
let client: ExtensionClient;
let settingsManager: SettingsManager;
let sidebarProvider: SageArmorSidebarProvider;
let advancedSettingsPanel: AdvancedSettingsPanel;

function adaptRemediationForLanguage(title: string, remediation: string, languageId: string): string {
	const t = title.toLowerCase();
	const jsLike = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'];
	const cLike = ['java', 'go', 'cpp', 'c', 'csharp', 'php', 'swift', 'kotlin', 'rust'];
	const pythonLike = ['python'];
	const rubyLike = ['ruby'];
	const sqlLike = ['sql'];

	const isJs = jsLike.includes(languageId);
	const isPython = pythonLike.includes(languageId);
	const isCLike = cLike.includes(languageId);
	const isRuby = rubyLike.includes(languageId);
	const isSql = sqlLike.includes(languageId);

	if (t.includes('path traversal')) {
		if (isJs) {
			return 'const path = require("path");\nconst safeBaseDir = "/app/data";\nconst safePath = path.resolve(safeBaseDir, requestedFile);\nif (!safePath.startsWith(safeBaseDir + path.sep)) {\n  throw new Error("Invalid path");\n}';
		}
		if (isPython) {
			return 'safe_path = os.path.normpath(os.path.join(base_dir, user_file))\nif not safe_path.startswith(base_dir):\n    raise ValueError("Invalid path")';
		}
		if (isRuby) {
			return 'safe_path = File.expand_path(File.join(base_dir, user_file))\nraise "Invalid path" unless safe_path.start_with?(File.expand_path(base_dir) + File::SEPARATOR)';
		}
		if (isCLike) {
			return '// Validate canonical path stays under base directory before reading file.';
		}
	}

	if (t.includes('weak cryptographic')) {
		if (isJs) {
			return 'const crypto = require("crypto");\nconst strongHash = crypto.createHash("sha256").update(req.body.password).digest("hex");';
		}
		if (isPython) {
			return 'import hashlib\nhash_obj = hashlib.sha256(password.encode())';
		}
		if (isRuby) {
			return 'require "digest"\npassword_hash = Digest::SHA256.hexdigest(password)';
		}
		if (isCLike) {
			return '// Replace MD5/SHA1 with SHA-256 or stronger using your language crypto library.';
		}
	}

	if (t.includes('authentication') || t.includes('authorization bypass')) {
		if (isJs) {
			return 'function checkAdmin(req, res, next) {\n  const isAdmin = req.user && req.user.role === "admin";\n  if (!isAdmin) {\n    return res.status(403).send("Forbidden");\n  }\n  return next();\n}';
		}
		if (isPython) {
			return '@require_auth\ndef secure_endpoint(request):\n    return {"ok": True}';
		}
		if (isRuby) {
			return 'before_action :require_admin\ndef require_admin\n  head :forbidden unless current_user&.admin?\nend';
		}
		if (isCLike) {
			return '// Enforce role-based authorization middleware before entering handler.';
		}
	}

	if (t.includes('cors')) {
		if (isJs) {
			return 'app.use(cors({\n  origin: ["https://app.example.com"],\n  credentials: true,\n}));';
		}
		if (isPython) {
			return 'CORS(app, resources={r"/*": {"origins": ["https://app.example.com"]}}, supports_credentials=True)';
		}
		if (isRuby) {
			return 'config.middleware.insert_before 0, Rack::Cors do\n  allow do\n    origins "https://app.example.com"\n    resource "*", headers: :any, methods: %i[get post], credentials: true\n  end\nend';
		}
		if (isCLike) {
			return '// Replace wildcard CORS origin with an explicit allowlist domain.';
		}
	}

	if (t.includes('open redirect')) {
		if (isJs) {
			return 'app.get("/go", (req, res) => {\n  const nextUrl = String(req.query.next || "/");\n  if (!nextUrl.startsWith("/") || nextUrl.startsWith("//") || nextUrl.includes("://")) {\n    return res.status(400).send("Invalid redirect target");\n  }\n  return res.redirect(nextUrl);\n});';
		}
		if (isPython) {
			return 'next_url = request.args.get("next", "/")\nif not next_url.startswith("/") or "//" in next_url:\n    raise ValueError("Invalid redirect")\nreturn redirect(next_url)';
		}
		if (isRuby) {
			return 'next_url = params[:next].to_s\nreturn head :bad_request unless next_url.start_with?("/") && !next_url.start_with?("//")\nredirect_to next_url';
		}
		if (isCLike) {
			return '// Validate redirect target against a relative-path or allowlist policy before redirecting.';
		}
	}

	if (t.includes('missing input validation')) {
		if (isJs) {
			return 'const value = req.body.displayName;\nif (typeof value !== "string" || value.length < 1 || value.length > 80) {\n  return res.status(400).send("Invalid input");\n}\nres.send(value);';
		}
		if (isPython) {
			return 'value = request.json.get("displayName", "")\nif not isinstance(value, str) or not (1 <= len(value) <= 80):\n    raise ValueError("Invalid input")';
		}
		if (isRuby) {
			return 'value = params[:displayName].to_s\nraise ArgumentError, "Invalid input" unless (1..80).cover?(value.length)';
		}
		if (isCLike) {
			return '// Validate user input for type, length, and format before use.';
		}
	}

	if (t.includes('ssrf') || t.includes('server-side request forgery')) {
		if (isJs) {
			return 'const { URL } = require("url");\nconst allowedHosts = new Set(["api.example.com"]);\nconst target = new URL(req.body.url);\nif (!allowedHosts.has(target.hostname)) {\n  throw new Error("Blocked URL");\n}\naxios.get(target.toString());';
		}
		if (isPython) {
			return 'from urllib.parse import urlparse\nparsed = urlparse(user_url)\nif parsed.hostname not in {"api.example.com"}:\n    raise ValueError("Blocked URL")';
		}
		if (isRuby) {
			return 'uri = URI.parse(user_url)\nallowed = ["api.example.com"]\nraise "Blocked URL" unless allowed.include?(uri.host)';
		}
		if (isCLike) {
			return '// Parse URL and enforce hostname allowlist before outbound requests.';
		}
	}

	if (t.includes('prototype pollution')) {
		if (isJs) {
			return 'const safe = Object.create(null);\nfor (const [k, v] of Object.entries(req.body || {})) {\n  if (k === "__proto__" || k === "constructor" || k === "prototype") continue;\n  safe[k] = v;\n}';
		}
		if (isPython || isRuby || isCLike || isSql) {
			return '// Reject dangerous keys like __proto__/constructor/prototype when merging untrusted objects.';
		}
	}

	if (t.includes('redos') || t.includes('regular expression denial of service')) {
		if (isJs) {
			return 'const allowedPattern = /^[a-z0-9_-]{1,32}$/i;\nconst userPattern = req.query.pattern;\nif (!allowedPattern.test(userPattern)) {\n  throw new Error("Invalid pattern");\n}\nconst pattern = new RegExp(userPattern);';
		}
		if (isPython) {
			return 'if not re.fullmatch(r"[a-zA-Z0-9_-]{1,32}", user_pattern):\n    raise ValueError("Invalid pattern")';
		}
		if (isRuby) {
			return 'raise "Invalid pattern" unless user_pattern.match?(/^[a-z0-9_-]{1,32}$/i)';
		}
		if (isCLike) {
			return '// Validate regex pattern length/charset before compiling dynamic regex.';
		}
	}

	if (t.includes('unsafe dynamic code execution') || t.includes('insecure deserialization')) {
		if (isJs) {
			return 'const allowedActions = { ping: () => "pong" };\nconst action = req.body.script;\nif (!allowedActions[action]) {\n  throw new Error("Invalid action");\n}\nallowedActions[action]();';
		}
		if (isPython) {
			return 'allowed_actions = {"ping": lambda: "pong"}\naction = payload.get("action")\nif action not in allowed_actions:\n    raise ValueError("Invalid action")\nallowed_actions[action]()';
		}
		if (isRuby) {
			return 'allowed = {"ping" => -> { "pong" }}\naction = params[:action].to_s\nraise "Invalid action" unless allowed.key?(action)\nallowed[action].call';
		}
		if (isCLike) {
			return '// Replace eval/dynamic execution with explicit allowlisted operations.';
		}
	}

	if (t.includes('sql injection')) {
		if (isJs) {
			return 'db.query("SELECT * FROM users WHERE id = ?", [userId]);';
		}
		if (isPython) {
			return 'cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))';
		}
		if (isRuby) {
			return 'User.where("id = ?", user_id)';
		}
		if (isSql || isCLike) {
			return '// Use parameterized queries / prepared statements instead of string concatenation.';
		}
	}

	if (t.includes('hardcoded secret') || t.includes('credential')) {
		if (isJs) {
			return 'const apiKey = process.env.API_KEY;\nif (!apiKey) {\n  throw new Error("Missing API_KEY env var");\n}';
		}
		if (isPython) {
			return 'api_key = os.getenv("API_KEY")\nif not api_key:\n    raise ValueError("Missing API_KEY env var")';
		}
		if (isRuby) {
			return 'api_key = ENV.fetch("API_KEY")';
		}
		if (isCLike || isSql) {
			return '// Load secrets from environment variables or secret manager, never hardcode in source.';
		}
	}

	if (t.includes('xss') || t.includes('cross-site scripting')) {
		if (isJs) {
			return 'const escape = require("escape-html");\nres.send("<h1>Results for: " + escape(userInput) + "</h1>");';
		}
		if (isPython) {
			return 'from markupsafe import escape\nreturn f"<h1>Results for: {escape(user_input)}</h1>"';
		}
		if (isRuby) {
			return 'safe_text = ERB::Util.html_escape(user_input)\nrender html: "<h1>Results for: #{safe_text}</h1>".html_safe';
		}
		if (isCLike || isSql) {
			return '// HTML-escape untrusted output before rendering it in the response.';
		}
	}

	return remediation;
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Sage Armor Scanner activated');

	// Initialize managers
	settingsManager = new SettingsManager();
	client = new ExtensionClient(settingsManager);
	diagnosticsManager = new DiagnosticsManager();
	scannerManager = new ScannerManager(client, diagnosticsManager, settingsManager);
	sidebarProvider = new SageArmorSidebarProvider();
	advancedSettingsPanel = new AdvancedSettingsPanel(settingsManager, client);

	// Create status bar item
	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBar.text = '🛡️ Sage Armor: Ready';
	statusBar.show();

	const sidebarView = vscode.window.createTreeView('sageArmorPanel', {
		treeDataProvider: sidebarProvider,
	});

	const refreshSidebarAndStatus = () => {
		sidebarProvider.refresh();
		const summary = sidebarProvider.getSummary();
		statusBar.text = summary.total > 0
			? `🛡️ Sage Armor: ${summary.total} issue(s)`
			: '🛡️ Sage Armor: Ready';
	};

	// Register Quick Fix action provider
	const codeActionProvider = vscode.languages.registerCodeActionsProvider(
		[
			'python', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
			'java', 'go', 'cpp', 'c', 'csharp', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'sql'
		],
		new SageArmorCodeActionProvider(diagnosticsManager),
		{ providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
	);

	// Register hover provider for better markdown rendering
	const hoverProvider = vscode.languages.registerHoverProvider(
		[
			'python', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact',
			'java', 'go', 'cpp', 'c', 'csharp', 'ruby', 'php', 'swift', 'kotlin', 'rust', 'sql'
		],
		{
			provideHover(document, position, _token) {
				const diags = vscode.languages.getDiagnostics(document.uri);
				const diagnostic = diags.find(
					(d) =>
						d.range.start.line === position.line &&
						typeof d.code === 'string' &&
						d.code.startsWith('sage-armor-fix:')
				);

				if (diagnostic && typeof diagnostic.code === 'string') {
					const key = diagnostic.code.replace('sage-armor-fix:', '');
					const rawRemediation = diagnosticsManager.getRemediation(key);
					const details = diagnosticsManager.getDetails(key);
					const title = details?.title || diagnostic.message.split(':')[0] || 'Security Issue';
					const remediation = adaptRemediationForLanguage(title, rawRemediation, document.languageId);

					if (!remediation) {
						return null;
					}

					const markdown = new vscode.MarkdownString();
					markdown.appendMarkdown(`# 🔒 Security Issue Detected\n\n`);
					const description = details?.description || diagnostic.message.split(':').slice(1).join(':').trim() || diagnostic.message;

					markdown.appendMarkdown(`**${title}**\n\n`);
					markdown.appendMarkdown(`${description}\n\n`);
					markdown.appendMarkdown(`---\n\n`);
					markdown.appendMarkdown(`## 🔧 Suggested Fix\n\n`);
					markdown.appendMarkdown(`\`\`\`\n${remediation}\n\`\`\`\n\n`);
					markdown.appendMarkdown(`**Apply the suggested fix above** → Click the lightbulb (💡) to auto-apply.\n\n`);
					markdown.isTrusted = true;
					return new vscode.Hover(markdown);
				}
				return null;
			}
		}
	);

	// Register commands
	const scanFileCmd = vscode.commands.registerCommand('sageArmor.scanFile', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor');
			return;
		}
		statusBar.text = '🛡️ Sage Armor: Scanning...';
		await scannerManager.scanFile(editor.document);
		refreshSidebarAndStatus();
	});

	const rescanActiveFileCmd = vscode.commands.registerCommand('sageArmor.rescanActiveFile', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		await scannerManager.scanFile(editor.document, false);
		refreshSidebarAndStatus();
	});

	const scanWorkspaceCmd = vscode.commands.registerCommand('sageArmor.scanWorkspace', async () => {
		if (!vscode.workspace.workspaceFolders) {
			vscode.window.showWarningMessage('No workspace open');
			return;
		}
		statusBar.text = '🛡️ Sage Armor: Scanning workspace...';
		await scannerManager.scanWorkspace();
		refreshSidebarAndStatus();
	});

	const openIssueCmd = vscode.commands.registerCommand(
		'sageArmor.openIssue',
		async (uri: vscode.Uri, range: vscode.Range) => {
			const document = await vscode.workspace.openTextDocument(uri);
			const editor = await vscode.window.showTextDocument(document);
			editor.selection = new vscode.Selection(range.start, range.start);
			editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
		}
	);

	const settingsCmd = vscode.commands.registerCommand('sageArmor.openSettings', async () => {
		await vscode.commands.executeCommand('workbench.action.openSettings', 'sageArmor');
	});

	const advancedSettingsCmd = vscode.commands.registerCommand('sageArmor.openAdvancedSettings', async () => {
		advancedSettingsPanel.show(context);
	});

	const previewFixCmd = vscode.commands.registerCommand(
		'sageArmor.previewFix',
		async (title: string, remediation: string) => {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: `// ${title}\n${remediation}\n`,
			});
			await vscode.window.showTextDocument(doc, { preview: true });
		}
	);

	const testCmd = vscode.commands.registerCommand('sageArmor.testConnection', async () => {
		try {
			const result = await client.testConnection();
			if (result) {
				vscode.window.showInformationMessage('✅ Backend connection successful');
			} else {
				vscode.window.showErrorMessage(
					`❌ Backend connection failed. Verify sageArmor.backendUrl and backend health.`
				);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`❌ Connection error: ${error}`);
		}
	});

	// Watch file saves
	const saveWatcher = vscode.workspace.onDidSaveTextDocument(async (document) => {
		if (settingsManager.scanOnSave && scannerManager.isSupportedLanguage(document.languageId)) {
			statusBar.text = '🛡️ Sage Armor: Scanning...';
			await scannerManager.scanFile(document);
			refreshSidebarAndStatus();
		}
	});

	const changeWatcher = vscode.workspace.onDidChangeTextDocument(async (event) => {
		const isUndoOrRedo =
			event.reason === vscode.TextDocumentChangeReason.Undo ||
			event.reason === vscode.TextDocumentChangeReason.Redo;

		if (!settingsManager.scanOnKeystroke && !isUndoOrRedo) {
			return;
		}

		if (!scannerManager.isSupportedLanguage(event.document.languageId)) {
			return;
		}

		statusBar.text = '🛡️ Sage Armor: Scanning...';
		await scannerManager.scanFile(event.document, false);
		refreshSidebarAndStatus();
	});

	const diagnosticsWatcher = vscode.languages.onDidChangeDiagnostics(() => {
		refreshSidebarAndStatus();
	});

	// Register subscriptions
	context.subscriptions.push(scanFileCmd);
	context.subscriptions.push(rescanActiveFileCmd);
	context.subscriptions.push(scanWorkspaceCmd);
	context.subscriptions.push(settingsCmd);
	context.subscriptions.push(advancedSettingsCmd);
	context.subscriptions.push(testCmd);
	context.subscriptions.push(openIssueCmd);
	context.subscriptions.push(previewFixCmd);
	context.subscriptions.push(saveWatcher);
	context.subscriptions.push(changeWatcher);
	context.subscriptions.push(diagnosticsWatcher);
	context.subscriptions.push(statusBar);
	context.subscriptions.push(sidebarView);
	context.subscriptions.push(codeActionProvider);
	context.subscriptions.push(hoverProvider);

	refreshSidebarAndStatus();

	// Show welcome message
	vscode.window.showInformationMessage('🛡️ Sage Armor Security Scanner loaded');
}

class SageArmorCodeActionProvider implements vscode.CodeActionProvider {
	private diagManager: DiagnosticsManager;

	constructor(diagManager: DiagnosticsManager) {
		this.diagManager = diagManager;
	}

	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		_token: vscode.CancellationToken
	): vscode.CodeAction[] {
		const actions: vscode.CodeAction[] = [];

		for (const diagnostic of context.diagnostics) {
			const isDiagnosticSageArmor =
				typeof diagnostic.code === 'string' && diagnostic.code.startsWith('sage-armor-fix:');

			if (!isDiagnosticSageArmor) {
				continue;
			}

			const key = (diagnostic.code as string).replace('sage-armor-fix:', '');
			const rawRemediation = this.diagManager.getRemediation(key);
			const fixRange = this.diagManager.getFixRange(key);
			const title = diagnostic.message.split(':')[0];

			if (!rawRemediation || rawRemediation.trim() === '') {
				console.log('[CodeAction] Skipping - no remediation for:', { key, title });
				continue;
			}

			// Adapt remediation for language
			const adaptedRemediation = adaptRemediationForLanguage(title, rawRemediation, document.languageId);

			if (!adaptedRemediation || adaptedRemediation.trim() === '') {
				console.log('[CodeAction] Skipping - no adapted remediation');
				continue;
			}

			// Get line text and normalize indentation
			const lineText = document.lineAt(diagnostic.range.start.line).text;
			const indentation = lineText.match(/^\s*/)?.[0] || '';
			const normalizedRemediation = normalizeRemediation(adaptedRemediation, indentation);
			const startLine = fixRange?.start.line ?? diagnostic.range.start.line;
			const endLine = fixRange?.end.line ?? diagnostic.range.end.line;
			const replacementRange = new vscode.Range(
				startLine,
				0,
				endLine,
				document.lineAt(endLine).text.length
			);

			// Create action with command
			const action = new vscode.CodeAction(
				`🔧 Apply suggested fix: ${title}`,
				vscode.CodeActionKind.QuickFix
			);
			action.edit = new vscode.WorkspaceEdit();
			action.edit.replace(document.uri, replacementRange, normalizedRemediation);

			action.command = {
				command: 'sageArmor.rescanActiveFile',
				title: 'Rescan Sage Armor diagnostics',
			};

			action.diagnostics = [diagnostic];
			action.isPreferred = true;
			actions.push(action);

			// Add preview action
			const preview = new vscode.CodeAction(
				`📋 Preview fix: ${title}`,
				vscode.CodeActionKind.QuickFix
			);
			preview.command = {
				command: 'sageArmor.previewFix',
				title: 'Preview Fix',
				arguments: [title, normalizedRemediation],
			};
			actions.push(preview);
		}

		return actions;
	}
}

export function deactivate() {
	console.log('Sage Armor Scanner deactivated');
	diagnosticsManager?.dispose();
}
