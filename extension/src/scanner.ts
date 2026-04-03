import * as vscode from 'vscode';
import { ExtensionClient } from './client';
import { DiagnosticsManager } from './diagnostics';
import { SettingsManager } from './settings';
import { filterBySeverity } from './scanUtils';

export class ScannerManager {
	private client: ExtensionClient;
	private diagnosticsManager: DiagnosticsManager;
	private settingsManager: SettingsManager;
	private scanInProgress = false;
	private debounceTimer: NodeJS.Timeout | null = null;
	private debounceResolve: (() => void) | null = null;

	constructor(
		client: ExtensionClient,
		diagnosticsManager: DiagnosticsManager,
		settingsManager: SettingsManager
	) {
		this.client = client;
		this.diagnosticsManager = diagnosticsManager;
		this.settingsManager = settingsManager;
	}

	isSupportedLanguage(languageId: string): boolean {
		const supported = {
			python: 'python',
			javascript: 'javascript',
			typescript: 'typescript',
			javascriptreact: 'javascript',
			typescriptreact: 'typescript',
			java: 'java',
			go: 'go',
			cpp: 'cpp',
			c: 'c',
			csharp: 'csharp',
			ruby: 'ruby',
			php: 'php',
			swift: 'swift',
			kotlin: 'kotlin',
			rust: 'rust',
			sql: 'sql',
		};

		return Object.keys(supported).includes(languageId);
	}

	getLanguageForId(languageId: string): string {
		const mapping: Record<string, string> = {
			python: 'python',
			javascript: 'javascript',
			typescript: 'typescript',
			javascriptreact: 'javascript',
			typescriptreact: 'typescript',
			java: 'java',
			go: 'go',
			cpp: 'cpp',
			c: 'c',
			csharp: 'csharp',
			ruby: 'ruby',
			php: 'php',
			swift: 'swift',
			kotlin: 'kotlin',
			rust: 'rust',
			sql: 'sql',
		};

		return mapping[languageId] || languageId;
	}

	async scanFile(document: vscode.TextDocument, showNotification = false): Promise<void> {
		if (this.scanInProgress) {
			return;
		}

		// Debounce if keystroke scanning is enabled
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			if (this.debounceResolve) {
				this.debounceResolve();
				this.debounceResolve = null;
			}
		}

		await new Promise<void>((resolve) => {
			this.debounceResolve = resolve;
			this.debounceTimer = setTimeout(async () => {
				try {
					await this._performScan(document, showNotification);
				} finally {
					if (this.debounceResolve) {
						this.debounceResolve();
						this.debounceResolve = null;
					}
					this.debounceTimer = null;
				}
			}, 500);
		});
	}

	async scanWorkspace(): Promise<void> {
		if (!vscode.workspace.workspaceFolders) {
			vscode.window.showWarningMessage('No workspace open');
			return;
		}

		const pattern = '{**/*.py,**/*.js,**/*.ts,**/*.jsx,**/*.tsx,**/*.java,**/*.go,**/*.cpp,**/*.c,**/*.cs,**/*.rb,**/*.php,**/*.swift,**/*.kt,**/*.rs,**/*.sql}';
		const files = await vscode.workspace.findFiles(pattern);

		if (files.length === 0) {
			vscode.window.showInformationMessage('No supported files found in workspace');
			return;
		}

		let scannedCount = 0;
		let errorCount = 0;
		let issueCount = 0;

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Sage Armor: Scanning workspace',
				cancellable: false,
			},
			async (progress) => {
				for (let i = 0; i < files.length; i++) {
					const fileUri = files[i];
					try {
						const document = await vscode.workspace.openTextDocument(fileUri);
						const issuesInFile = await this._performScan(document, false);
						scannedCount++;
						issueCount += issuesInFile;
					} catch (error) {
						errorCount++;
						console.error(`Error scanning ${fileUri}:`, error);
					}

					const increment = Math.round(100 / files.length);
					progress.report({
						increment,
						message: `${i + 1}/${files.length} • ${fileUri.path.split('/').pop() || 'file'}`,
					});
				}
			}
		);

		vscode.window.showInformationMessage(
			`Scan complete: ${scannedCount} files scanned, ${issueCount} issue(s) found${errorCount > 0 ? `, ${errorCount} errors` : ''}`
		);
	}

	private async _performScan(document: vscode.TextDocument, showNotification = true): Promise<number> {
		if (this.scanInProgress) {
			return 0;
		}

		this.scanInProgress = true;

		try {
			const code = document.getText();
			const language = this.getLanguageForId(document.languageId);

			const result = await this.client.reviewCode(code, language);
			const vulnerabilities = Array.isArray(result.vulnerabilities)
				? result.vulnerabilities
				: [];

			// Filter by severity
			const filtered = filterBySeverity(vulnerabilities, this.settingsManager.severityFilter);

			// Create and set diagnostics
			const diagnostics = this.diagnosticsManager.createDiagnostics(filtered, document.uri);
			this.diagnosticsManager.setDiagnostics(document.uri, diagnostics);

			if (showNotification && filtered.length > 0) {
				vscode.window.showWarningMessage(
					`Found ${filtered.length} security issue(s) in ${document.fileName}`
				);
			}

			return filtered.length;
		} catch (error: any) {
			this.diagnosticsManager.clearDiagnostics(document.uri);

			const errorMsg = error.message || 'Unknown error';
			console.error('Scan error:', errorMsg);

			if (showNotification) {
				vscode.window.showErrorMessage(`Sage Armor scan failed: ${errorMsg}`);
			}

			return 0;
		} finally {
			this.scanInProgress = false;
		}
	}
}
