export function normalizeRemediation(remediation: string, indentation: string): string {
	const lines = remediation.replace(/\r\n/g, '\n').split('\n');
	if (lines.length <= 1) {
		return remediation;
	}

	return lines
		.map((line, idx) => (idx === 0 || line.trim().length === 0 ? line : `${indentation}${line}`))
		.join('\n');
}