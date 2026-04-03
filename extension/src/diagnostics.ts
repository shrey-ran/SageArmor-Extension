import * as vscode from 'vscode';
import { Vulnerability } from './client';

export class DiagnosticsManager {
	private diagnosticsCollection = vscode.languages.createDiagnosticCollection('sageArmor');
	private remediationMap = new Map<string, string>();
	private detailsMap = new Map<string, Vulnerability>();
	private fixRangeMap = new Map<string, vscode.Range>();

	createDiagnostics(vulnerabilities: Vulnerability[], uri: vscode.Uri): vscode.Diagnostic[] {
		this.remediationMap.clear();
		this.detailsMap.clear();
		this.fixRangeMap.clear();

		return vulnerabilities.map((vuln, idx) => {
			// Keep diagnostics line-wide so quick-fix lightbulb is consistently available.
			const range = new vscode.Range(
				new vscode.Position(vuln.line, 0),
				new vscode.Position(vuln.line, 1000)
			);

			const severity = this.mapSeverity(vuln.severity);

			const diagnostic = new vscode.Diagnostic(
				range,
				`${vuln.title}: ${vuln.description}`,
				severity
			);

			const key = `${uri.toString()}#${vuln.line}:${idx}`;

			// Code for Quick Fix (includes key for lookup)
			diagnostic.code = `sage-armor-fix:${key}`;
			const fixRange = new vscode.Range(
				new vscode.Position(vuln.line, Math.max(0, vuln.column || 0)),
				new vscode.Position(vuln.endLine, Math.max(0, vuln.endColumn || vuln.column || 0))
			);

			// Store remediation/details for Quick Fix + Hover
			this.remediationMap.set(key, vuln.remediation);
			this.detailsMap.set(key, vuln);
			this.fixRangeMap.set(key, fixRange);

			return diagnostic;
		});
	}

	getRemediation(key: string): string {
		return this.remediationMap.get(key) || '';
	}

	getDetails(key: string): Vulnerability | undefined {
		return this.detailsMap.get(key);
	}

	getFixRange(key: string): vscode.Range | undefined {
		return this.fixRangeMap.get(key);
	}

	setDiagnostics(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]) {
		this.diagnosticsCollection.set(uri, diagnostics);
	}

	clearDiagnostics(uri?: vscode.Uri) {
		if (uri) {
			this.diagnosticsCollection.delete(uri);
		} else {
			this.diagnosticsCollection.clear();
		}
		this.remediationMap.clear();
		this.detailsMap.clear();
		this.fixRangeMap.clear();
	}

	dispose() {
		this.diagnosticsCollection.dispose();
		this.remediationMap.clear();
		this.detailsMap.clear();
		this.fixRangeMap.clear();
	}

	private mapSeverity(severity: string): vscode.DiagnosticSeverity {
		switch (severity.toLowerCase()) {
			case 'critical':
			case 'high':
				return vscode.DiagnosticSeverity.Error;
			case 'medium':
				return vscode.DiagnosticSeverity.Warning;
			case 'low':
				return vscode.DiagnosticSeverity.Information;
			default:
				return vscode.DiagnosticSeverity.Warning;
		}
	}
}
