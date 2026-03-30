import json
import os

def build_security_prompt(code_snippet: str, language: str = 'python') -> str:
    """
    Parses the CIS/NIST guidelines and constructs a strict JSON AI prompt.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    guidelines_path = os.path.join(current_dir, 'guidelines.json')

    try:
        with open(guidelines_path, 'r') as f:
            guidelines_doc = f.read()
    except FileNotFoundError:
        guidelines_doc = "{}"

    instructions = ""
    if language.lower() in ['terraform', 'yaml', 'json']:
        instructions = """1. You are running in Infrastructure-as-Code (IaC) mode.
2. Vigorously hunt for Cloud misconfigurations like public S3 buckets, missing server-side encryption, and unencrypted DBs.
3. Inspect IAM scopes. Look for wildcard actions (`"*"`) or overly broad principals and flag violations of the Principle of Least Privilege.
4. Ensure strict network restrictiveness. Prevent Security Group rules that open sensitive ports to `"0.0.0.0/0"`.
5. RED TEAM VALIDATION: For every finding, you MUST mentally simulate an attacker's exploit chain against this specific IaC config. If you cannot describe a realistic, step-by-step attack scenario that exploits this exact misconfiguration, YOU MUST DISCARD IT as a false positive."""
    else:
        instructions = """1. You are running in Static Application Security Testing (SAST) mode.
2. Look for SQL/NoSQL Injection vectors—ensure all dynamic Database queries use prepared statements/parameter binding.
3. Vigorously hunt for hardcoded credentials, API keys, or leaked authentication tokens in the raw text.
4. Check for Cross-Site Scripting (XSS), lack of input sanitization, and unsafe shell executions (`subprocess` without `shell=False`).
5. RED TEAM VALIDATION: For every finding, you MUST mentally simulate an attacker's exploit chain against this specific code path. If you cannot write a realistic proof-of-concept (even pseudocode) demonstrating the exploit, YOU MUST DISCARD IT as a false positive."""

    prompt = f"""You are SageArmor AI, an elite autonomous Digital Security Engineer. 
Your primary task is to review the following code snippet or Pull Request diff for security vulnerabilities, misconfigurations, or bad practices.

## Foundation Guidelines
You MUST evaluate the code against the following foundational security guidelines (derived from CIS Benchmarks, NIST SP 800-53, and OWASP). 
Base your recommendations strictly on these principles to reduce false positives:
```json
{guidelines_doc}
```

## Instructions for Analysis ({language.upper()} Mode)
{instructions}
5. If the code is completely safe according to these standards, return an empty 'vulnerabilities' array. DO NOT invent false vulnerabilities just to fill the payload!

## Required Output Format
You MUST return your findings as a valid JSON object. Provide ONLY pure JSON, unquoted by markdown backticks.
The JSON must have a single root key 'vulnerabilities' which is an array of objects.
Each object within 'vulnerabilities' must map exactly to:
- 'severity' (string: Critical, High, Medium, Low)
- 'issue' (string: short descriptive title)
- 'explanation' (string: why it is a risk referencing the guidelines schema)
- 'poc_exploit_scenario' (string: a clear, step-by-step description showing exactly how an attacker triggers this exploit. If you cannot construct this, discard the finding entirely.)
- 'remediation' (object) with exactly two sub-fields:
    - 'patch' (string: the minimal drop-in code block or config that directly fixes the vulnerability — must be copy-pasteable)
    - 'explanation' (string: one sentence explaining why this specific patch eliminates the risk)

Content to review:
```
{code_snippet}
```
Return ONLY valid JSON.
"""
    return prompt
