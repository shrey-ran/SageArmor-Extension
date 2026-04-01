"""
Real SAST (Static Application Security Testing) Scanner
Detects actual security vulnerabilities in source code using pattern matching
"""

import re
from typing import List, Dict, Any


class SASTScanner:
    """Performs real static analysis on source code to find actual vulnerabilities."""
    
    # Define real regex patterns for common vulnerabilities
    VULNERABILITY_PATTERNS = {
        'sql_injection': {
            'severity': 'High',
            'patterns': [
                r'execute\s*\(\s*["\'].*?\$|f["\'].*SELECT.*\{',  # String interpolation in SQL
                r'execute\s*\(\s*query\s*\+',  # String concatenation in execute
                r'execute\s*\(\s*["\']SELECT.*WHERE.*["\']\s*\+',  # SQL + concatenation
                r'query\s*=\s*["\']SELECT.*["\']\s*\+',  # SQL concatenation
                r'\.query\s*\(\s*["\']SELECT.*WHERE["\']\s*\+',  # ORM query concatenation
            ],
            'issue': 'SQL Injection Vulnerability',
            'explanation': 'SQL query is built by concatenating user input directly into the SQL string.',
        },
        'hardcoded_secret': {
            'severity': 'High',
            'patterns': [
                r'(?:api[_-]?key|password|secret|token|auth[_-]?token)\s*[:=]\s*["\'](?!{|<<)[A-Za-z0-9\-_.]{8,}',  # Actual hardcoded values
                r'(?:api[_-]?key|password|secret|token|auth[_-]?token)\s*[:=]\s*["\'][^"\']{20,}["\']',
                r'BEGIN RSA PRIVATE KEY|BEGIN PRIVATE KEY|BEGIN EC PRIVATE KEY',  # Private keys
                r'aws_access_key_id\s*=\s*AKIA[0-9A-Z]{16}',  # AWS keys
                r'github[_-]?token\s*[:=]\s*ghp_[A-Za-z0-9_]{36,}',  # GitHub tokens
            ],
            'issue': 'Hardcoded Secret / Credential Exposure',
            'explanation': 'Sensitive credentials are stored directly in source code and can be extracted.',
        },
        'command_injection': {
            'severity': 'High',
            'patterns': [
                r'subprocess\.(?:run|call|Popen)\s*\(\s*f["\']',  # subprocess with f-string
                r'subprocess\.(?:run|call|Popen)\s*\(\s*["\'].*\+',  # subprocess with concatenation
                r'os\.system\s*\(\s*(?:cmd|command|input|user|f["\'])',  # System calls with variables or f-string
                r'shell\s*=\s*True',  # shell=True flag with dynamic input
            ],
            'issue': 'Command Injection / Arbitrary Code Execution',
            'explanation': 'User input is passed to shell/system execution functions without sanitization.',
        },
        'path_traversal': {
            'severity': 'Medium',
            'patterns': [
                r'open\s*\(\s*(?:request\.|user_|input|path|file_path)',  # File open with user input
                r'os\.path\.join\s*\(\s*base_path\s*,\s*(?:request\.|user_|input)',  # Path join with user input
                r'\.\.\/|\.\.\\\\',  # Path traversal patterns in strings
            ],
            'issue': 'Path Traversal / Directory Escape',
            'explanation': 'File paths are constructed using unsanitized user input, allowing directory traversal.',
        },
        'insecure_deserialization': {
            'severity': 'High',
            'patterns': [
                r'pickle\.loads?\s*\(',  # Python pickle
                r'yaml\.load\s*\(\s*(?!Loader)',  # YAML without safe loader
                r'\.load\s*\(\s*.*\)|json\.loads\s*\(',  # Unsafe loading
                r'eval\s*\(\s*',  # Direct eval
                r'exec\s*\(\s*',  # Direct exec
            ],
            'issue': 'Insecure Deserialization',
            'explanation': 'User input is deserialized without validation, allowing arbitrary code execution.',
        },
        'weak_cryptography': {
            'severity': 'Medium',
            'patterns': [
                r'hashlib\.(?:md5|sha1)\(',  # md5 or sha1 hashing
                r'(?:md5|sha1|MD5|SHA1)\s*\(',  # Weak hashing functions
                r'AES\.MODE_ECB',  # ECB mode (no random IV)
                r'random\.(?:choice|Random)\s*\(',  # Weak random
            ],
            'issue': 'Weak Cryptographic Algorithm',
            'explanation': 'Code uses outdated or weak cryptographic algorithms (MD5, SHA1, ECB mode).',
        },
        'authentication_bypass': {
            'severity': 'High',
            'patterns': [
                r'@(?:app|route|api).*\(\s*["\'][^"\']*["\']?\s*\)(?:\s|.*?)def\s+\w+\s*\(.*\):\s*(?:return|pass)',  # Unprotected endpoints
                r'if\s+(?:request\.args\.get|request\.form\.get)\s*\(\s*["\']password|if\s+.*==\s*password',  # Weak auth
                r'jwt\.decode\s*\(\s*.*,\s*verify\s*=\s*False',  # JWT verification disabled
            ],
            'issue': 'Authentication / Authorization Bypass',
            'explanation': 'Authentication checks are missing or can be bypassed.',
        },
        'cors_misconfiguration': {
            'severity': 'Medium',
            'patterns': [
                r'Access-Control-Allow-Origin\s*[:=]\s*["\']?\*["\']?',  # Wildcard CORS header
                r'cors\s*=\s*["\']?\*["\']?|cors:\s*["\']?\*["\']?',  # cors setting with wildcard
                r'allowOrigin\s*=\s*["\']?\*["\']?',  # Allow all origins
                r'CORS_ORIGINS.*=\s*["\']?\*["\']?',  # Dictionary/config with wildcard
                r'cors["\']?\s*=\s*["\']?\*["\']?',  # Flask/Django CORS config
            ],
            'issue': 'Overly Permissive CORS Configuration',
            'explanation': 'CORS is configured to allow any origin, increasing exposure to cross-origin attacks.',
        },
        'unsafe_redirect': {
            'severity': 'Medium',
            'patterns': [
                r'redirect\s*\(\s*(?:request\.|url|user_input|param)',  # Redirect with user input
                r'location\s*[:=]\s*(?:request\.|user_|input)',  # Location header with user input
            ],
            'issue': 'Open Redirect',
            'explanation': 'User input is used for redirects without validation, allowing phishing attacks.',
        },
        'missing_validation': {
            'severity': 'Medium',
            'patterns': [
                r'return\s+(?:request\.|input\(|user_input)',  # Using user input directly
                r'execute\s*\(\s*(?:request\.|user_|input)',  # Executing user input
            ],
            'issue': 'Missing Input Validation',
            'explanation': 'User input is used without proper validation or sanitization.',
        },
    }

    @staticmethod
    def scan_code(code: str, file_path: str = '') -> List[Dict[str, Any]]:
        """
        Scan code for vulnerabilities using real pattern matching.
        
        Args:
            code: Source code to scan
            file_path: Path to the file being scanned
            
        Returns:
            List of found vulnerabilities with details
        """
        findings = []
        code_lower = code.lower()
        lines = code.split('\n')
        
        # Scan for each vulnerability type
        for vuln_type, vuln_config in SASTScanner.VULNERABILITY_PATTERNS.items():
            for pattern in vuln_config['patterns']:
                try:
                    matches = list(re.finditer(pattern, code_lower, re.IGNORECASE | re.MULTILINE))
                    
                    for match in matches:
                        # Find line number
                        line_num = code_lower[:match.start()].count('\n') + 1
                        
                        # Get the actual line of code
                        matched_line = lines[line_num - 1] if line_num <= len(lines) else ''
                        
                        finding = {
                            'severity': vuln_config['severity'],
                            'issue': vuln_config['issue'],
                            'type': vuln_type,
                            'file': file_path,
                            'line': line_num,
                            'matched_code': matched_line.strip()[:100],  # First 100 chars
                            'explanation': vuln_config['explanation'],
                            'attack_vector': SASTScanner._get_attack_vector(vuln_type),
                            'poc_exploit_scenario': SASTScanner._get_poc(vuln_type),
                            'remediation': SASTScanner._get_remediation(vuln_type),
                            'suggested_fix': SASTScanner._get_fix_suggestion(vuln_type),
                        }
                        findings.append(finding)
                        
                except re.error:
                    continue
        
        # Deduplicate by issue type and group files
        grouped_findings = {}
        for finding in findings:
            issue_type = finding['issue']
            if issue_type not in grouped_findings:
                grouped_findings[issue_type] = {
                    'severity': finding['severity'],
                    'issue': finding['issue'],
                    'type': finding['type'],
                    'explanation': finding['explanation'],
                    'attack_vector': finding['attack_vector'],
                    'poc_exploit_scenario': finding['poc_exploit_scenario'],
                    'remediation': finding['remediation'],
                    'suggested_fix': finding['suggested_fix'],
                    'file_references': [],
                }
            grouped_findings[issue_type]['file_references'].append({
                'file': finding['file'],
                'line': finding['line'],
                'matched_code': finding['matched_code'],
            })
        
        # Convert grouped findings back to list with primary_file set
        deduplicated_findings = []
        for issue_type, finding_data in grouped_findings.items():
            # Use the first file reference as the primary one for display
            if finding_data['file_references']:
                primary_ref = finding_data['file_references'][0]
                finding_data['file'] = primary_ref['file']
                finding_data['line'] = primary_ref['line']
                finding_data['matched_code'] = primary_ref['matched_code']
                finding_data['file_count'] = len(finding_data['file_references'])
            deduplicated_findings.append(finding_data)
        
        return deduplicated_findings

    @staticmethod
    def _get_attack_vector(vuln_type: str) -> str:
        """Get attack vector description for vulnerability type."""
        vectors = {
            'sql_injection': 'External input: User-supplied query parameters, form data, or URL arguments.',
            'hardcoded_secret': 'Code repository access: Git history, code review, or accidental exposure.',
            'command_injection': 'External input: Shell metacharacters in user-supplied arguments.',
            'path_traversal': 'External input: File path parameters with directory traversal sequences (../).',
            'insecure_deserialization': 'Untrusted data: Serialized objects from network or user input.',
            'weak_cryptography': 'Brute force or cryptanalysis: Legacy algorithms are computationally breakable.',
            'authentication_bypass': 'Missing authentication: Direct endpoint access without credentials.',
            'cors_misconfiguration': 'Cross-origin requests: Any website can make authenticated requests.',
            'unsafe_redirect': 'Open redirect: Links to user-supplied URLs without validation.',
            'missing_validation': 'Malicious input: Unsanitized user data used in sensitive operations.',
        }
        return vectors.get(vuln_type, 'External input')

    @staticmethod
    def _get_poc(vuln_type: str) -> str:
        """Get proof-of-concept scenario for vulnerability type."""
        pocs = {
            'sql_injection': "Admin login bypass: Supply user_id as '1 OR 1=1' to authenticate without password.",
            'hardcoded_secret': 'Credential reuse: Extract API key from GitHub and use it to access production systems.',
            'command_injection': 'Remote code execution: Execute shell commands like `; rm -rf /; ` via input parameter.',
            'path_traversal': 'Read sensitive files: Access /etc/passwd via file=../../etc/passwd.',
            'insecure_deserialization': 'Code execution: Craft malicious serialized object to execute arbitrary Python code.',
            'weak_cryptography': 'Hash cracking: Brute-force MD5 password hashes from public wordlists in seconds.',
            'authentication_bypass': 'Unauthorized access: Call protected endpoints without authentication token.',
            'cors_misconfiguration': 'Session hijacking: Malicious website triggers authenticated requests to steal data.',
            'unsafe_redirect': 'Phishing: Redirect user to fake login page that looks like the real service.',
            'missing_validation': 'Data corruption: Submit malformed input that breaks application logic.',
        }
        return pocs.get(vuln_type, 'Attacker exploits this vulnerability.')

    @staticmethod
    def _get_remediation(vuln_type: str) -> Dict[str, str]:
        """Get code remediation example for vulnerability type."""
        remediations = {
            'sql_injection': {
                'patch': 'cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))',
                'explanation': 'Use parameterized queries. Placeholders (?) prevent input from altering SQL structure.',
            },
            'hardcoded_secret': {
                'patch': 'api_key = os.getenv("API_KEY")\nif not api_key:\n    raise ValueError("Missing API_KEY env var")',
                'explanation': 'Load secrets from environment variables, not source code. Use secret managers for production.',
            },
            'command_injection': {
                'patch': 'subprocess.run(["command", arg1, arg2], check=True)',
                'explanation': 'Pass arguments as a list, not as shell string. This prevents shell interpretation.',
            },
            'path_traversal': {
                'patch': 'safe_path = os.path.normpath(os.path.join(base_dir, user_file))\nif not safe_path.startswith(base_dir):\n    raise ValueError("Invalid path")',
                'explanation': 'Validate and normalize paths. Ensure file access stays within allowed directory.',
            },
            'insecure_deserialization': {
                'patch': 'data = yaml.safe_load(user_input)\nobj = json.loads(user_input)',
                'explanation': 'Use safe deserialization methods. Never use pickle or eval on untrusted data.',
            },
            'weak_cryptography': {
                'patch': 'import hashlib\nhash_obj = hashlib.sha256(password.encode())\nfrom cryptography.fernet import Fernet',
                'explanation': 'Use SHA256+ for hashing and modern algorithms (AES-GCM, ChaCha20) for encryption.',
            },
            'authentication_bypass': {
                'patch': '@app.route("/secure")\n@require_auth\ndef secure_endpoint():\n    return "Authenticated"',
                'explanation': 'Add authentication decorators or middleware. Validate tokens on every protected request.',
            },
            'cors_misconfiguration': {
                'patch': 'Access-Control-Allow-Origin: https://trusted-app.example.com\nAccess-Control-Allow-Credentials: true',
                'explanation': 'Specify explicit allowed origins. Never use wildcard with credentials.',
            },
            'unsafe_redirect': {
                'patch': 'allowed_domains = {"example.com", "trusted.com"}\nif urllib.parse.urlparse(redirect_url).netloc not in allowed_domains:\n    return error("Invalid redirect")',
                'explanation': 'Whitelist allowed redirect destinations. Validate before redirecting.',
            },
            'missing_validation': {
                'patch': 'if not user_input or not isinstance(user_input, str):\n    raise ValueError("Invalid input")\nif len(user_input) > 100:\n    raise ValueError("Input too long")',
                'explanation': 'Validate all user input: type, length, format, and content. Use allowlists when possible.',
            },
        }
        return remediations.get(vuln_type, {'patch': '', 'explanation': ''})

    @staticmethod
    def _get_fix_suggestion(vuln_type: str) -> str:
        """Get actionable fix suggestion for vulnerability type."""
        suggestions = {
            'sql_injection': 'Replace all string concatenation in SQL queries with parameterized queries (? placeholders).',
            'hardcoded_secret': 'Remove this credential from code. Rotate the exposed key immediately. Use environment variables.',
            'command_injection': 'Convert shell command string to list format: ["command", "arg1", "arg2"].',
            'path_traversal': 'Normalize file paths and ensure they do not escape the base directory using os.path.normpath().',
            'insecure_deserialization': 'Replace pickle with json. Use yaml.safe_load() instead of yaml.load().',
            'weak_cryptography': 'Switch to SHA256/SHA512 for hashing. Use AES-GCM or ChaCha20 for encryption.',
            'authentication_bypass': 'Add authentication middleware/decorators to all protected endpoints.',
            'cors_misconfiguration': 'Replace wildcard (*) with explicit domain list: ["https://app.example.com"].',
            'unsafe_redirect': 'Whitelist allowed redirect URLs and validate before redirecting.',
            'missing_validation': 'Add input validation: type checks, length limits, and format validation.',
        }
        return suggestions.get(vuln_type, 'Review and fix this security issue.')
