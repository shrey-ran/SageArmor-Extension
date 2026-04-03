import * as vscode from 'vscode';
import { SettingsManager } from './settings';
import { ExtensionClient } from './client';

export class AdvancedSettingsPanel {
	private panel: vscode.WebviewPanel | undefined;

	constructor(private settings: SettingsManager, private client: ExtensionClient) {}

	show(_context: vscode.ExtensionContext) {
		if (this.panel) {
			this.panel.reveal(vscode.ViewColumn.Beside);
			this.panel.webview.html = this.renderHtml();
			return;
		}

		this.panel = vscode.window.createWebviewPanel(
			'sageArmorAdvancedSettings',
			'Sage Armor: Advanced Settings',
			vscode.ViewColumn.Beside,
			{ enableScripts: true }
		);

		this.panel.webview.html = this.renderHtml();

		this.panel.webview.onDidReceiveMessage(async (msg) => {
			if (msg?.type === 'save') {
				await this.settings.setBackendUrl(msg.payload.backendUrl);
				await this.settings.setScanOnSave(!!msg.payload.scanOnSave);
				await this.settings.setScanOnKeystroke(!!msg.payload.scanOnKeystroke);
				await this.settings.setSeverityFilter(msg.payload.severityFilter || ['Critical', 'High', 'Medium']);
				vscode.window.showInformationMessage('Sage Armor settings saved');
				this.panel!.webview.html = this.renderHtml();
			}

			if (msg?.type === 'testConnection') {
				const ok = await this.client.testConnection();
				vscode.window.showInformationMessage(ok ? 'Backend connection successful' : 'Backend connection failed');
			}

			if (msg?.type === 'openNative') {
				await vscode.commands.executeCommand('workbench.action.openSettings', 'sageArmor');
			}
		});

		this.panel.onDidDispose(() => {
			this.panel = undefined;
		});
	}

	private renderHtml(): string {
		const levels = this.settings.severityFilter;
		return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; padding: 16px; }
label { display:block; margin: 8px 0 4px; }
input[type=text] { width: 100%; padding: 8px; }
.row { margin: 10px 0; }
button { margin-right: 8px; padding: 8px 12px; }
.card { border: 1px solid #444; padding: 12px; border-radius: 8px; }
</style>
</head>
<body>
<h2>Sage Armor Advanced Settings</h2>
<div class="card">
<label>Backend URL</label>
<input id="backendUrl" type="text" value="${this.settings.backendUrl}" />

<div class="row">
<label><input id="scanOnSave" type="checkbox" ${this.settings.scanOnSave ? 'checked' : ''}/> Scan on Save</label>
<label><input id="scanOnKeystroke" type="checkbox" ${this.settings.scanOnKeystroke ? 'checked' : ''}/> Scan on Keystroke</label>
</div>

<div class="row">
<label>Severity Filter</label>
<label><input id="sevCritical" type="checkbox" ${levels.includes('Critical') ? 'checked' : ''}/> Critical</label>
<label><input id="sevHigh" type="checkbox" ${levels.includes('High') ? 'checked' : ''}/> High</label>
<label><input id="sevMedium" type="checkbox" ${levels.includes('Medium') ? 'checked' : ''}/> Medium</label>
<label><input id="sevLow" type="checkbox" ${levels.includes('Low') ? 'checked' : ''}/> Low</label>
</div>

<div class="row">
<button id="saveBtn">Save</button>
<button id="testBtn">Test Connection</button>
<button id="openNative">Open Native Settings</button>
</div>
</div>

<script>
const vscode = acquireVsCodeApi();

const byId = (id) => document.getElementById(id);

byId('saveBtn').addEventListener('click', () => {
  const severity = [];
  if (byId('sevCritical').checked) severity.push('Critical');
  if (byId('sevHigh').checked) severity.push('High');
  if (byId('sevMedium').checked) severity.push('Medium');
  if (byId('sevLow').checked) severity.push('Low');

  vscode.postMessage({
    type: 'save',
    payload: {
      backendUrl: byId('backendUrl').value,
      scanOnSave: byId('scanOnSave').checked,
      scanOnKeystroke: byId('scanOnKeystroke').checked,
      severityFilter: severity,
    }
  });
});

byId('testBtn').addEventListener('click', () => {
  vscode.postMessage({ type: 'testConnection' });
});

byId('openNative').addEventListener('click', () => {
  vscode.postMessage({ type: 'openNative' });
});
</script>
</body>
</html>`;
	}
}
