import type { Vulnerability } from './client';

export interface ScanSummary {
	total: number;
	critical: number;
	high: number;
	medium: number;
	low: number;
}

export function filterBySeverity(
	vulnerabilities: Vulnerability[],
	severityFilter: string[]
): Vulnerability[] {
	return vulnerabilities.filter((v) => severityFilter.includes(v.severity));
}

export function summarizeVulnerabilities(vulnerabilities: Vulnerability[]): ScanSummary {
	const summary: ScanSummary = {
		total: vulnerabilities.length,
		critical: 0,
		high: 0,
		medium: 0,
		low: 0,
	};

	for (const vuln of vulnerabilities) {
		switch (vuln.severity) {
			case 'Critical':
				summary.critical += 1;
				break;
			case 'High':
				summary.high += 1;
				break;
			case 'Medium':
				summary.medium += 1;
				break;
			case 'Low':
				summary.low += 1;
				break;
			default:
				summary.low += 1;
		}
	}

	return summary;
}