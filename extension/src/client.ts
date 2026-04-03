import axios, { AxiosInstance } from 'axios';
import { SettingsManager } from './settings';

export interface Vulnerability {
	title: string;
	description: string;
	severity: 'Critical' | 'High' | 'Medium' | 'Low';
	line: number;
	column: number;
	endLine: number;
	endColumn: number;
	attack_vector: string;
	attack_scenario: string;
	remediation: string;
	remediation_description: string;
}

export interface ReviewResponse {
	vulnerabilities: Vulnerability[];
	language: string;
	analysis_mode: string;
}

type RawVulnerability = Partial<Vulnerability> & {
	issue?: string;
	explanation?: string;
	poc_exploit_scenario?: string;
	suggested_fix?: string;
	remediation?: string | { patch?: string; description?: string };
	matched_code?: string;
};

export function normalizeReviewResponse(data: any, fallbackLanguage: string): ReviewResponse {
	const rawVulns = Array.isArray(data?.vulnerabilities) ? data.vulnerabilities : [];
	const vulnerabilities: Vulnerability[] = rawVulns.map((v: RawVulnerability) => {
		const remediationObj =
			typeof v.remediation === 'object' && v.remediation !== null
				? (v.remediation as { patch?: string; description?: string })
				: null;

		const remediationPatch =
			remediationObj
				? (remediationObj.patch ?? '')
				: typeof v.remediation === 'string'
				? v.remediation
				: '';

		const remediationDescription =
			remediationObj
				? (remediationObj.description ?? '')
				: '';

		const line = typeof v.line === 'number' ? Math.max(0, v.line - 1) : 0;
		const column = typeof v.column === 'number' ? Math.max(0, v.column - 1) : 0;
		const endLineRaw = typeof v.endLine === 'number'
			? v.endLine
			: typeof (v as any).end_line === 'number'
			? (v as any).end_line
			: line + 1;
		const endColumnRaw = typeof v.endColumn === 'number'
			? v.endColumn
			: typeof (v as any).end_column === 'number'
			? (v as any).end_column
			: column + 1;
		const endLine = Math.max(0, endLineRaw - 1);
		const endColumn = Math.max(0, endColumnRaw - 1);

		return {
			title: v.title ?? v.issue ?? 'Security issue',
			description: v.description ?? v.explanation ?? 'Potential vulnerability detected.',
			severity: (v.severity as Vulnerability['severity']) ?? 'Medium',
			line,
			column,
			endLine,
			endColumn,
			attack_vector: v.attack_vector ?? 'Unknown attack vector',
			attack_scenario: v.attack_scenario ?? v.poc_exploit_scenario ?? 'No scenario provided',
			remediation: remediationPatch || v.suggested_fix || 'Apply input validation and secure coding practices.',
			remediation_description:
				remediationDescription || 'Use the proposed fix and re-run scan to verify remediation.',
		};
	});

	return {
		vulnerabilities,
		language: data?.language ?? fallbackLanguage,
		analysis_mode: data?.analysis_mode ?? 'unknown',
	};
}

export function mapBackendError(error: any, backendUrl: string): string {
	if (error?.response?.status === 429) {
		const retryAfter = error.response?.data?.retry_after_seconds || 5;
		return `Quota exceeded. Retry in ${retryAfter} seconds`;
	}
	if (error?.response?.status === 401) {
		return 'Invalid API key. Check Sage Armor settings';
	}
	if (error?.response?.status >= 500) {
		return 'Backend server error. Please retry shortly.';
	}
	if (error?.code === 'ECONNREFUSED') {
		return `Cannot connect to backend at ${backendUrl}`;
	}
	if (error?.code === 'ECONNABORTED') {
		return 'Backend request timed out. Check network or backend health.';
	}
	if (error?.message) {
		return `Backend error: ${error.message}`;
	}
	return 'Backend error: Unknown error';
}

export class ExtensionClient {
	private client: AxiosInstance;
	private settingsManager: SettingsManager;
	private lastRequestTime = 0;
	private requestCount = 0;

	constructor(settingsManager: SettingsManager) {
		this.settingsManager = settingsManager;
		this.client = axios.create({
			baseURL: settingsManager.backendUrl,
			timeout: 30000, // 30 seconds
		});
	}

	async reviewCode(code: string, language: string): Promise<ReviewResponse> {
		try {
			const validation = this.settingsManager.validateSettings();
			if (validation) {
				throw new Error(validation);
			}

			this.client.defaults.baseURL = this.settingsManager.backendUrl;

			const response = await this.client.post<any>('/review', {
				code,
				language,
			});

			return normalizeReviewResponse(response.data, language);
		} catch (error: any) {
			throw new Error(mapBackendError(error, this.settingsManager.backendUrl));
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			this.client.defaults.baseURL = this.settingsManager.backendUrl;
			
			// Try to call a simple endpoint to test connection
			const response = await this.client.post('/review', {
				code: '# test',
				language: 'python',
			}, {
				timeout: 5000,
			});

			return response.status === 200;
		} catch (error) {
			console.error('Connection test failed:', error);
			return false;
		}
	}

	updateBaseUrl(url: string) {
		this.client.defaults.baseURL = url;
	}
}
