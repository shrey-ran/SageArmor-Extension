import json
import os
import boto3
import hmac
import hashlib
import re
import requests
from dotenv import load_dotenv
from .prompt_builder import build_security_prompt
from .github_commenter import post_pr_review
from .attack_intelligence import build_attack_intelligence, build_copilot_prompt
from .repo_selective_scan import selective_repo_scan

load_dotenv()

# Initialize Bedrock client
# In Lambda, boto3 natively picks up credentials and region from the IAM role.
# For local testing, it will pick up from the environment variables (.env).
bedrock = boto3.client(
    service_name='bedrock-runtime',
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)


def _json_response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": True,
        },
        "body": json.dumps(payload),
    }


def _parse_body(event):
    body_str = event.get('body', '{}')
    if not body_str:
        body_str = '{}'
    return json.loads(body_str) if isinstance(body_str, str) else body_str


def _invoke_bedrock_json(prompt, max_tokens=600):
    request_body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt}]
            }
        ]
    })

    bedrock_response = bedrock.invoke_model(
        modelId='us.anthropic.claude-sonnet-4-5-20250929-v1:0',
        contentType='application/json',
        accept='application/json',
        body=request_body
    )
    response_body = json.loads(bedrock_response['body'].read())
    content = response_body.get('content', [])[0].get('text', '{}')

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        clean_text = content.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_text)


def _invoke_bedrock_text(prompt, max_tokens=350):
    request_body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt}]
            }
        ]
    })

    bedrock_response = bedrock.invoke_model(
        modelId='us.anthropic.claude-sonnet-4-5-20250929-v1:0',
        contentType='application/json',
        accept='application/json',
        body=request_body
    )
    response_body = json.loads(bedrock_response['body'].read())
    return response_body.get('content', [])[0].get('text', '').strip()


def _local_static_review(code_snippet):
    text = code_snippet or ''
    text_lower = text.lower()
    findings = []

    if (
        'select ' in text_lower
        and ('+ user_id' in text_lower or '+ input(' in text_lower or 'f"select' in text_lower)
    ):
        findings.append({
            'severity': 'High',
            'issue': 'Potential SQL Injection',
            'attack_vector': 'External input is concatenated into SQL query and executed directly.',
            'explanation': 'The query appears to be dynamically built from user-controlled input.',
            'poc_exploit_scenario': "Attacker supplies user_id as 1 OR 1=1 to bypass intended filtering.",
            'remediation': {
                'patch': (
                    'query = "SELECT * FROM users WHERE id = ?"\n'
                    'cursor.execute(query, (user_id,))'
                ),
                'explanation': 'Use parameterized queries to prevent input from altering SQL structure.',
            },
            'suggested_fix': 'Use prepared statements/parameterized queries for all DB operations.',
        })

    if any(secret_word in text_lower for secret_word in ['api_key', 'secret', 'password =', 'token =']):
        findings.append({
            'severity': 'Medium',
            'issue': 'Possible Hardcoded Secret',
            'attack_vector': 'Credential-like value is embedded in source and may leak via repo or logs.',
            'explanation': 'Hardcoded secrets can be extracted and reused by attackers.',
            'poc_exploit_scenario': 'Attacker gains repository read access and reuses exposed credentials.',
            'remediation': {
                'patch': (
                    'import os\n'
                    'api_key = os.getenv("API_KEY")\n'
                    'if not api_key:\n'
                    '    raise RuntimeError("Missing API_KEY")'
                ),
                'explanation': 'Move secrets to environment variables or a secret manager.',
            },
            'suggested_fix': 'Remove secrets from code and rotate any exposed keys immediately.',
        })

    if re.search(r'cors\s*=\s*\*|access-control-allow-origin["\']?\s*[:=]\s*["\']\*', text_lower):
        findings.append({
            'severity': 'Low',
            'issue': 'Overly Permissive CORS',
            'attack_vector': 'Any origin can call sensitive endpoints from a browser context.',
            'explanation': 'Wildcard origin increases abuse potential for authenticated users.',
            'poc_exploit_scenario': 'Malicious site triggers browser requests to internal API endpoints.',
            'remediation': {
                'patch': 'Access-Control-Allow-Origin: https://your-trusted-app.example',
                'explanation': 'Restrict origins to trusted domains and review credentialed requests.',
            },
            'suggested_fix': 'Use explicit origin allowlists instead of wildcard CORS.',
        })

    if not findings:
        findings.append({
            'severity': 'Low',
            'issue': 'No high-confidence issue from local fallback scan',
            'attack_vector': 'No direct attack vector identified by offline rule-based analyzer.',
            'explanation': 'The local fallback scanner uses limited heuristics. Use Bedrock-enabled mode for deeper analysis.',
            'poc_exploit_scenario': 'No actionable exploit path detected in heuristic pass.',
            'remediation': {
                'patch': '# No patch generated by local fallback scanner',
                'explanation': 'Run cloud model analysis for richer vulnerability detection.',
            },
            'suggested_fix': 'Enable Bedrock credentials for full model-powered review.',
        })

    return {
        'vulnerabilities': findings,
        'analysis_mode': 'local-fallback',
        'note': 'Model-powered analysis unavailable; returned offline heuristic review.',
    }


def _local_copilot_answer(question, intelligence, vulnerabilities=None):
    risk_ranking = intelligence.get('risk_ranking', []) if isinstance(intelligence, dict) else []
    vulnerabilities = vulnerabilities if isinstance(vulnerabilities, list) else []
    q = (question or '').lower()

    def _match_vuln(issue_name):
        target = (issue_name or '').strip().lower()
        for vuln in vulnerabilities:
            if str(vuln.get('issue', '')).strip().lower() == target:
                return vuln
        return vulnerabilities[0] if vulnerabilities else {}

    if risk_ranking:
        top = risk_ranking[0]
        issue = top.get('issue', 'unknown issue')
        score = top.get('priority_score', 'n/a')
        severity = top.get('severity', 'Unknown')
        exploit = top.get('exploitability', {}).get('level', 'Unknown')
        matched_vuln = _match_vuln(issue)
        patch = (
            matched_vuln.get('remediation', {}).get('patch')
            or matched_vuln.get('suggested_fix')
            or 'Apply the remediation patch shown in Findings and re-run scan.'
        )
        reason = matched_vuln.get('explanation') or 'This issue has the highest combined risk score in current context.'

        if 'fix' in q or 'what should i' in q or 'priority' in q:
            return (
                f"Fix this first: {issue}.\n"
                f"Why: severity {severity}, exploitability {exploit}, priority score {score}/10.\n"
                f"Action: {patch}\n"
                "Then re-run scan and move to the next highest ranked issue in the Risk Panel."
            )

        if 'why' in q or 'risk' in q:
            return (
                f"{issue} is the top risk because it combines {severity} severity with {exploit} exploitability (score {score}/10).\n"
                f"Why it matters: {reason}\n"
                f"Next fix action: {patch}"
            )

        return (
            f"Top priority is '{issue}' (severity: {severity}, exploitability: {exploit}, priority score: {score}/10). "
            f"Recommended next action: {patch}"
        )

    return (
        "No high-confidence exploitable issue was ranked in local fallback mode. "
        "Next action: review Findings, patch obvious input validation and secret-handling issues, and re-run scan. "
        "For deeper context, enable model-powered analysis."
    )


def _extract_vulnerabilities_for_advanced(body):
    vulnerabilities = body.get('vulnerabilities')
    if isinstance(vulnerabilities, list):
        return vulnerabilities

    code_snippet = body.get('code', '')
    language = body.get('language', 'python')
    if not code_snippet:
        return []

    prompt = build_security_prompt(code_snippet, language)
    try:
        analysis_result = _invoke_bedrock_json(prompt)
    except Exception as err:
        print(f"[handler] Advanced endpoints using local fallback: {str(err)}")
        analysis_result = _local_static_review(code_snippet)
    return analysis_result.get('vulnerabilities', []) if isinstance(analysis_result, dict) else []

def verify_signature(event):
    secret = os.getenv('GITHUB_WEBHOOK_SECRET')
    if not secret:
        return True # Skip if not configured
    
    headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
    signature = headers.get('x-hub-signature-256')
    if not signature:
        return True # Skip if not present
    
    body = event.get('body', '{}')
    
    # Needs the raw byte string.
    mac = hmac.new(secret.encode('utf-8'), body.encode('utf-8'), hashlib.sha256)
    expected_sig = "sha256=" + mac.hexdigest()
    
    return hmac.compare_digest(expected_sig, signature)

def review_code(event, context):
    try:
        # Validate webhook if signature is present
        if not verify_signature(event):
            return {"statusCode": 401, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"error": "Invalid GitHub webhook signature"})}

        # Load the body
        body = _parse_body(event)
        # Determine language context from dashboard toggle or fallback 
        language = body.get('language', 'python')
        is_webhook = 'pull_request' in body
        
        # 1. Check if it's a GitHub Webhook event
        if 'pull_request' in body:
            action = body.get('action')
            if action and action not in ['opened', 'synchronize']:
                return {"statusCode": 200, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"msg": f"Skipping action {action}"})}
            
            diff_url = body['pull_request']['diff_url']
            headers = {}
            if os.getenv('GITHUB_TOKEN'):
                headers['Authorization'] = f"token {os.getenv('GITHUB_TOKEN')}"
                
            resp = requests.get(diff_url, headers=headers)
            if resp.status_code != 200:
                raise Exception(f"Failed to fetch PR diff: {resp.status_code}")
                
            code_snippet = resp.text
            
            # Very basic heuristic for webhook PR diff language detection
            if '.tf' in code_snippet:
                language = 'terraform'
            elif '.yml' in code_snippet or '.yaml' in code_snippet:
                language = 'yaml'
            elif '.js' in code_snippet or '.ts' in code_snippet:
                language = 'javascript'

            # Store PR metadata for auto-commenting after analysis
            repo_full_name = body.get('repository', {}).get('full_name', '')
            pr_number = body['pull_request'].get('number')
                
        else:
            # 2. Direct code snippet testing (from Frontend Dashboard)
            code_snippet = body.get('code', '')
            repo_full_name = None
            pr_number = None
            
        if not code_snippet:
            return {"statusCode": 400, "headers": {"Access-Control-Allow-Origin": "*"}, "body": json.dumps({"error": "No code snippet provided."})}

        # Call Claude 3.5 Sonnet via Bedrock using modularized prompt builder
        prompt = build_security_prompt(code_snippet, language)

        # Parse Claude's JSON response
        try:
            analysis_result = _invoke_bedrock_json(prompt)
        except Exception as parse_err:
            print(f"[handler] Falling back to local static review: {str(parse_err)}")
            analysis_result = _local_static_review(code_snippet)

        # Fire-and-forget: post findings back to GitHub PR (webhook path only)
        if is_webhook and repo_full_name and pr_number:
            try:
                post_pr_review(
                    repo_full_name,
                    pr_number,
                    analysis_result.get('vulnerabilities', [])
                )
            except Exception as comment_err:
                # Never block the response if commenting fails
                print(f"[handler] PR comment failed (non-fatal): {str(comment_err)}")

        return _json_response(200, analysis_result)
    except Exception as e:
        print(f"Error: {str(e)}")
        return _json_response(500, {"error": str(e)})


def attack_path(event, context):
    try:
        body = _parse_body(event)
        vulnerabilities = _extract_vulnerabilities_for_advanced(body)
        if not vulnerabilities:
            return _json_response(400, {"error": "No vulnerabilities or code provided for attack path generation"})

        context_text = body.get('code', '')
        intelligence = build_attack_intelligence(vulnerabilities, context_text)
        graph = intelligence.get('attack_graph', {})
        return _json_response(200, {
            "attack_graph": {
                "nodes": graph.get('nodes', []),
                "edges": graph.get('edges', []),
            },
            "attack_paths": graph.get('attack_paths', []),
            "summary": intelligence.get('summary', {}),
        })
    except Exception as e:
        print(f"attack_path error: {str(e)}")
        return _json_response(500, {"error": str(e)})


def risk_score(event, context):
    try:
        body = _parse_body(event)
        vulnerabilities = _extract_vulnerabilities_for_advanced(body)
        if not vulnerabilities:
            return _json_response(400, {"error": "No vulnerabilities or code provided for risk scoring"})

        context_text = body.get('code', '')
        intelligence = build_attack_intelligence(vulnerabilities, context_text)
        return _json_response(200, {
            "risk_ranking": intelligence.get('risk_ranking', []),
            "summary": intelligence.get('summary', {}),
        })
    except Exception as e:
        print(f"risk_score error: {str(e)}")
        return _json_response(500, {"error": str(e)})


def simulate(event, context):
    try:
        body = _parse_body(event)
        vulnerabilities = _extract_vulnerabilities_for_advanced(body)
        if not vulnerabilities:
            return _json_response(400, {"error": "No vulnerabilities or code provided for simulation"})

        context_text = body.get('code', '')
        intelligence = build_attack_intelligence(vulnerabilities, context_text)
        return _json_response(200, {
            "breach_simulation": intelligence.get('breach_simulation', {}),
            "summary": intelligence.get('summary', {}),
        })
    except Exception as e:
        print(f"simulate error: {str(e)}")
        return _json_response(500, {"error": str(e)})


def copilot_chat(event, context):
    try:
        body = _parse_body(event)
        question = body.get('question', '')
        if not question:
            return _json_response(400, {"error": "No question provided"})

        vulnerabilities = _extract_vulnerabilities_for_advanced(body)
        context_text = body.get('code', '')
        intelligence = build_attack_intelligence(vulnerabilities, context_text)

        prompt = build_copilot_prompt(question, intelligence)
        try:
            answer = _invoke_bedrock_text(prompt)
            mode = "model"
            note = None
        except Exception as err:
            print(f"[handler] Copilot using local fallback: {str(err)}")
            answer = _local_copilot_answer(question, intelligence, vulnerabilities)
            mode = "local-fallback"
            note = "Model-powered copilot unavailable; returned local fallback explanation."

        payload = {
            "answer": answer,
            "summary": intelligence.get('summary', {}),
            "analysis_mode": mode,
        }
        if note:
            payload["note"] = note

        return _json_response(200, payload)
    except Exception as e:
        print(f"copilot_chat error: {str(e)}")
        return _json_response(500, {"error": str(e)})


def repo_scan(event, context):
    try:
        body = _parse_body(event)
        repo_url = (body.get('repo_url') or '').strip()
        if not repo_url:
            return _json_response(400, {"error": "repo_url is required"})

        query = body.get('query', '')
        branch = body.get('branch')
        top_k = body.get('top_k', 3)

        try:
            top_k = int(top_k)
        except (TypeError, ValueError):
            return _json_response(400, {"error": "top_k must be an integer"})

        token = body.get('github_token') or os.getenv('GITHUB_TOKEN')
        scan_bundle = selective_repo_scan(
            repo_url=repo_url,
            query=query,
            token=token,
            branch=branch,
            top_k=top_k,
        )

        selected_files = scan_bundle.get('selected_files', [])
        if not selected_files:
            return _json_response(422, {
                "error": "No relevant source files found for analysis",
                "repo_stats": scan_bundle.get('repo_stats', {}),
            })

        combined_context = "\n\n".join(
            [
                f"# FILE: {item.get('path', 'unknown')}\n{item.get('excerpt', '')}"
                for item in selected_files
            ]
        )

        prompt = build_security_prompt(combined_context, 'python')
        try:
            analysis_result = _invoke_bedrock_json(prompt)
        except Exception as err:
            print(f"[handler] Repo scan using local fallback: {str(err)}")
            analysis_result = _local_static_review(combined_context)

        vulnerabilities = analysis_result.get('vulnerabilities', []) if isinstance(analysis_result, dict) else []
        intelligence = build_attack_intelligence(vulnerabilities, combined_context)

        return _json_response(200, {
            "repo_stats": scan_bundle.get('repo_stats', {}),
            "keywords": scan_bundle.get('keywords', []),
            "selected_files": [
                {
                    "path": item.get('path'),
                    "hit_count": item.get('hit_count'),
                }
                for item in selected_files
            ],
            "vulnerabilities": vulnerabilities,
            "risk_ranking": intelligence.get('risk_ranking', []),
            "attack_graph": intelligence.get('attack_graph', {}),
            "breach_simulation": intelligence.get('breach_simulation', {}),
            "summary": intelligence.get('summary', {}),
            "analysis_mode": analysis_result.get('analysis_mode', 'model') if isinstance(analysis_result, dict) else 'model',
            "note": analysis_result.get('note') if isinstance(analysis_result, dict) else None,
        })
    except Exception as e:
        print(f"repo_scan error: {str(e)}")
        return _json_response(500, {"error": str(e)})
