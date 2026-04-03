import * as vscode from 'vscode';

export class SettingsManager {
	private config = vscode.workspace.getConfiguration('sageArmor');

	get backendUrl(): string {
		return this.config.get('backendUrl', 'http://localhost:3000');
	}

	get apiKey(): string {
		return this.config.get('apiKey', '');
	}

	get scanOnSave(): boolean {
		return this.config.get('scanOnSave', true);
	}

	get scanOnKeystroke(): boolean {
		return this.config.get('scanOnKeystroke', false);
	}

	get severityFilter(): string[] {
		return this.config.get('severityFilter', ['Critical', 'High', 'Medium']);
	}

	get supportedLanguages(): string[] {
		return this.config.get('supportedLanguages', ['python', 'javascript', 'typescript']);
	}

	async setApiKey(key: string) {
		await this.config.update('apiKey', key, vscode.ConfigurationTarget.Global);
	}

	async setBackendUrl(url: string) {
		await this.config.update('backendUrl', url, vscode.ConfigurationTarget.Workspace);
		this.refresh();
	}

	async setScanOnSave(enabled: boolean) {
		await this.config.update('scanOnSave', enabled, vscode.ConfigurationTarget.Workspace);
		this.refresh();
	}

	async setScanOnKeystroke(enabled: boolean) {
		await this.config.update('scanOnKeystroke', enabled, vscode.ConfigurationTarget.Workspace);
		this.refresh();
	}

	async setSeverityFilter(levels: string[]) {
		await this.config.update('severityFilter', levels, vscode.ConfigurationTarget.Workspace);
		this.refresh();
	}

	refresh() {
		this.config = vscode.workspace.getConfiguration('sageArmor');
	}

	validateSettings(): string | null {
		if (!this.backendUrl) {
			return 'Backend URL not configured';
		}
		if (!this.backendUrl.startsWith('http')) {
			return 'Backend URL must start with http:// or https://';
		}
		return null;
	}
}
