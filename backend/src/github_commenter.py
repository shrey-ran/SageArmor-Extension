import os
import requests

SEVERITY_EMOJI = {
    'Critical': '🔴',
    'High':     '🟠',
    'Medium':   '🟡',
    'Low':      '🟢',
}

def _build_review_body(vulnerabilities: list) -> str:
    """
    Renders the full GitHub PR review body in rich Markdown.
    """
    if not vulnerabilities:
        return (
            "## ✅ SageArmor AI — Security Review Passed\n\n"
            "No vulnerabilities were detected in this Pull Request.\n\n"
            "> _Scanned by [SageArmor AI](https://github.com) — powered by Claude 3.5 Sonnet on AWS Bedrock._"
        )

    lines = [
        "## 🛡️ SageArmor AI — Security Review Report",
        "",
        f"Found **{len(vulnerabilities)}** security finding(s) that require your attention.",
        "",
        "---",
        "",
    ]

    for i, v in enumerate(vulnerabilities, 1):
        severity = v.get('severity', 'Low')
        emoji = SEVERITY_EMOJI.get(severity, '🟢')
        issue = v.get('issue', 'Unknown Issue')
        explanation = v.get('explanation', '')
        poc = v.get('poc_exploit_scenario', '')

        # Support both old (suggested_fix) and new (remediation.patch) schemas
        remediation = v.get('remediation', {})
        patch = remediation.get('patch') if isinstance(remediation, dict) else None
        patch = patch or v.get('suggested_fix', '')
        fix_explanation = remediation.get('explanation', '') if isinstance(remediation, dict) else ''

        lines += [
            f"### {emoji} Finding #{i}: {issue}",
            "",
            f"**Severity:** `{severity}`",
            "",
            f"**Risk Explanation:**",
            f"> {explanation}",
            "",
        ]

        if poc:
            lines += [
                "**Simulated Attack Scenario:**",
                "```diff",
                f"- {poc}",
                "```",
                "",
            ]

        if patch:
            lines += [
                "**Suggested Remediation:**",
                "```",
                patch,
                "```",
            ]
            if fix_explanation:
                lines += [f"_{fix_explanation}_", ""]

        lines += ["---", ""]

    lines += [
        "",
        "> _Scanned by **SageArmor AI** — powered by Claude 3.5 Sonnet on AWS Bedrock._",
        "> _Review is advisory only. Fixes require human approval before merge._",
    ]

    return "\n".join(lines)


def post_pr_review(repo_full_name: str, pr_number: int, vulnerabilities: list) -> bool:
    """
    Posts a structured AI security review as a GitHub PR review comment.

    Args:
        repo_full_name: e.g. "owner/repo-name"
        pr_number: The PR number as an integer
        vulnerabilities: List of vulnerability dicts from the AI engine

    Returns:
        True on success, False on failure
    """
    github_token = os.getenv('GITHUB_TOKEN')
    if not github_token:
        print("[github_commenter] GITHUB_TOKEN not set — skipping PR comment.")
        return False

    url = f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}/reviews"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
    }
    payload = {
        "body": _build_review_body(vulnerabilities),
        "event": "COMMENT",   # Advisory: does not approve or request changes
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        if response.status_code in (200, 201):
            print(f"[github_commenter] Successfully posted review to PR #{pr_number} on {repo_full_name}")
            return True
        else:
            print(f"[github_commenter] GitHub API error {response.status_code}: {response.text[:300]}")
            return False
    except Exception as e:
        print(f"[github_commenter] Exception posting PR review: {str(e)}")
        return False
