import * as vscode from 'vscode';

export interface SeveritySummary {
	total: number;
	critical: number;
	high: number;
	medium: number;
	low: number;
}

class SidebarNode extends vscode.TreeItem {
	children?: SidebarNode[];

	constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, children?: SidebarNode[]) {
		super(label, collapsibleState);
		this.children = children;
	}
}

export class SageArmorSidebarProvider implements vscode.TreeDataProvider<SidebarNode> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<SidebarNode | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private rootNodes: SidebarNode[] = [];
	private summary: SeveritySummary = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };

	refresh(): void {
		this.rebuildNodes();
		this._onDidChangeTreeData.fire();
	}

	getSummary(): SeveritySummary {
		return this.summary;
	}

	getTreeItem(element: SidebarNode): vscode.TreeItem {
		return element;
	}

	getChildren(element?: SidebarNode): Thenable<SidebarNode[]> {
		if (!element) {
			return Promise.resolve(this.rootNodes);
		}
		return Promise.resolve(element.children || []);
	}

	private rebuildNodes(): void {
		const diagnosticsByFile = vscode.languages.getDiagnostics();
		const summary: SeveritySummary = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
		const fileNodes: SidebarNode[] = [];

		for (const [uri, diagnostics] of diagnosticsByFile) {
			const sageDiagnostics = diagnostics.filter(
				(d) => typeof d.code === 'string' && d.code.startsWith('sage-armor-fix:')
			);

			if (sageDiagnostics.length === 0) {
				continue;
			}

			const issueNodes = sageDiagnostics.map((diag) => {
				const issueTitle = diag.message.split(':')[0] || 'Security issue';
				const issueNode = new SidebarNode(
					issueTitle,
					vscode.TreeItemCollapsibleState.None
				);
				issueNode.description = `L${diag.range.start.line + 1} • ${this.severityLabel(diag.severity)}`;
				issueNode.tooltip = diag.message;
				issueNode.iconPath = this.severityIcon(diag.severity);
				issueNode.command = {
					command: 'sageArmor.openIssue',
					title: 'Open Issue',
					arguments: [uri, diag.range],
				};
				return issueNode;
			});

			const fileNode = new SidebarNode(
				`${this.fileName(uri)} (${issueNodes.length})`,
				vscode.TreeItemCollapsibleState.Collapsed,
				issueNodes
			);
			fileNode.iconPath = new vscode.ThemeIcon('file-code');
			fileNodes.push(fileNode);

			for (const diag of sageDiagnostics) {
				summary.total += 1;
				if (diag.severity === vscode.DiagnosticSeverity.Error) {
					summary.high += 1;
				} else if (diag.severity === vscode.DiagnosticSeverity.Warning) {
					summary.medium += 1;
				} else if (diag.severity === vscode.DiagnosticSeverity.Information) {
					summary.low += 1;
				} else {
					summary.low += 1;
				}
			}
		}

		this.summary = summary;

		const overviewNodes: SidebarNode[] = [];
		const totalNode = new SidebarNode(`Total Issues: ${summary.total}`, vscode.TreeItemCollapsibleState.None);
		totalNode.iconPath = new vscode.ThemeIcon('shield');
		overviewNodes.push(totalNode);

		const highNode = new SidebarNode(`High: ${summary.high}`, vscode.TreeItemCollapsibleState.None);
		highNode.iconPath = new vscode.ThemeIcon('error');
		overviewNodes.push(highNode);

		const mediumNode = new SidebarNode(`Medium: ${summary.medium}`, vscode.TreeItemCollapsibleState.None);
		mediumNode.iconPath = new vscode.ThemeIcon('warning');
		overviewNodes.push(mediumNode);

		const lowNode = new SidebarNode(`Low: ${summary.low}`, vscode.TreeItemCollapsibleState.None);
		lowNode.iconPath = new vscode.ThemeIcon('info');
		overviewNodes.push(lowNode);

		this.rootNodes = [...overviewNodes, ...fileNodes];
	}

	private severityLabel(severity: vscode.DiagnosticSeverity): string {
		if (severity === vscode.DiagnosticSeverity.Error) {
			return 'High';
		}
		if (severity === vscode.DiagnosticSeverity.Warning) {
			return 'Medium';
		}
		if (severity === vscode.DiagnosticSeverity.Information) {
			return 'Low';
		}
		return 'Low';
	}

	private severityIcon(severity: vscode.DiagnosticSeverity): vscode.ThemeIcon {
		if (severity === vscode.DiagnosticSeverity.Error) {
			return new vscode.ThemeIcon('error');
		}
		if (severity === vscode.DiagnosticSeverity.Warning) {
			return new vscode.ThemeIcon('warning');
		}
		return new vscode.ThemeIcon('info');
	}

	private fileName(uri: vscode.Uri): string {
		const parts = uri.path.split('/');
		return parts[parts.length - 1] || uri.fsPath;
	}
}
