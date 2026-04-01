import json
import os
import hmac
import hashlib
import re
import requests
from dotenv import load_dotenv
import boto3

try:
    import google.generativeai as genai
except Exception:
    genai = None
from .prompt_builder import build_security_prompt
from .github_commenter import post_pr_review
from .attack_intelligence import build_attack_intelligence, build_copilot_prompt
from .repo_selective_scan import selective_repo_scan
from .sast_scanner import SASTScanner

load_dotenv()

def _is_truthy(value):
    return str(value or '').strip().lower() in {'1', 'true', 'yes', 'on'}


def _get_model_provider():
    explicit = (os.getenv('MODEL_PROVIDER') or '').strip().lower()
    has_gemini = bool(os.getenv('GEMINI_API_KEY'))
    if explicit in {'gemini', 'bedrock'}:
        return explicit
    return 'gemini' if has_gemini else 'bedrock'


def _gemini_model_candidates():
    configured = (os.getenv('GEMINI_MODEL') or '').strip()
    preferred = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
    ]

    candidates = []
    if configured:
        candidates.append(configured)

    for name in preferred:
        if name not in candidates:
            candidates.append(name)

    return candidates


def _extract_gemini_text(response):
    try:
        text = (getattr(response, 'text', '') or '').strip()
        if text:
            return text
    except Exception:
        pass

    chunks = []
    candidates = getattr(response, 'candidates', None) or []
    for candidate in candidates:
        content = getattr(candidate, 'content', None)
        parts = getattr(content, 'parts', None) if content else None
        if not parts:
            continue
        for part in parts:
            t = getattr(part, 'text', None)
            if t:
                chunks.append(t)

    return '\n'.join(chunks).strip()


def _parse_json_from_text(text):
    if not text:
        raise json.JSONDecodeError('Empty text', '', 0)

    candidates = [text, text.replace('```json', '').replace('```', '').strip()]

    # Try extracting the outermost JSON object/array block.
    first_obj = text.find('{')
    last_obj = text.rfind('}')
    if first_obj != -1 and last_obj != -1 and last_obj > first_obj:
        candidates.append(text[first_obj:last_obj + 1])

    first_arr = text.find('[')
    last_arr = text.rfind(']')
    if first_arr != -1 and last_arr != -1 and last_arr > first_arr:
        candidates.append(text[first_arr:last_arr + 1])

    last_err = None
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError as exc:
            last_err = exc

    raise last_err if last_err else json.JSONDecodeError('Invalid JSON', text, 0)


def _repair_json_with_gemini(raw_text, max_tokens):
    repair_prompt = (
        'Return only valid JSON. Preserve original meaning and fields. '
        'Do not add markdown fences.\n\n'
        f'{raw_text}'
    )

    last_error = None
    for model_name in _gemini_model_candidates():
        try:
            model = genai.GenerativeModel(model_name=model_name)
            response = model.generate_content(
                repair_prompt,
                generation_config={
                    'max_output_tokens': max_tokens,
                    'response_mime_type': 'application/json',
                    'temperature': 0,
                },
            )
            repaired = _extract_gemini_text(response)
            return _parse_json_from_text(repaired)
        except Exception as exc:
            last_error = exc

    raise RuntimeError(str(last_error) if last_error else 'Gemini JSON repair failed')


def _get_bedrock_client():
    # In Lambda, boto3 picks credentials/region from IAM role.
    # For local, it picks from environment variables.
    return boto3.client(
        service_name='bedrock-runtime',
        region_name=os.getenv('AWS_REGION', 'us-east-1')
    )


def _invoke_gemini_json(prompt, max_tokens=600):
    if genai is None:
        raise RuntimeError('google-generativeai dependency is not installed')

    api_key = os.getenv('GEMINI_API_KEY', '').strip()
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY is missing')

    genai.configure(api_key=api_key)

    response = None
    last_error = None
    for model_name in _gemini_model_candidates():
        try:
            model = genai.GenerativeModel(model_name=model_name)
            response = model.generate_content(
                prompt,
                generation_config={
                    'max_output_tokens': max_tokens,
                    'response_mime_type': 'application/json',
                    'temperature': 0.2,
                },
            )
            break
        except Exception as exc:
            last_error = exc

    if response is None:
        raise RuntimeError(str(last_error) if last_error else 'Gemini model invocation failed')

    text = _extract_gemini_text(response)
    if not text:
        raise RuntimeError('Gemini returned empty response')

    try:
        return _parse_json_from_text(text)
    except json.JSONDecodeError:
        return _repair_json_with_gemini(text, max_tokens=max_tokens)


def _invoke_gemini_text(prompt, max_tokens=350):
    if genai is None:
        raise RuntimeError('google-generativeai dependency is not installed')

    api_key = os.getenv('GEMINI_API_KEY', '').strip()
    if not api_key:
        raise RuntimeError('GEMINI_API_KEY is missing')

    genai.configure(api_key=api_key)

    response = None
    last_error = None
    for model_name in _gemini_model_candidates():
        try:
            model = genai.GenerativeModel(model_name=model_name)
            response = model.generate_content(
                prompt,
                generation_config={
                    'max_output_tokens': max_tokens,
                    'temperature': 0.3,
                },
            )
            break
        except Exception as exc:
            last_error = exc

    if response is None:
        raise RuntimeError(str(last_error) if last_error else 'Gemini model invocation failed')
    text = _extract_gemini_text(response)
    if not text:
        raise RuntimeError('Gemini returned empty response')
    return text


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

    bedrock = _get_bedrock_client()
    bedrock_response = bedrock.invoke_model(
        modelId='us.anthropic.claude-sonnet-4-5-20250929-v1:0',
        contentType='application/json',
        accept='application/json',
        body=request_body
    )
    response_body = json.loads(bedrock_response['body'].read())
    content_items = response_body.get('content') or []
    first_item = content_items[0] if isinstance(content_items, list) and content_items else {}
    content = first_item.get('text', '{}') if isinstance(first_item, dict) else '{}'

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

    bedrock = _get_bedrock_client()
    bedrock_response = bedrock.invoke_model(
        modelId='us.anthropic.claude-sonnet-4-5-20250929-v1:0',
        contentType='application/json',
        accept='application/json',
        body=request_body
    )
    response_body = json.loads(bedrock_response['body'].read())
    content_items = response_body.get('content') or []
    first_item = content_items[0] if isinstance(content_items, list) and content_items else {}
    text = first_item.get('text', '') if isinstance(first_item, dict) else ''
    return text.strip()


def _invoke_model_json(prompt, max_tokens=600):
    provider = _get_model_provider()
    if provider == 'gemini':
        return _invoke_gemini_json(prompt, max_tokens=max_tokens)
    return _invoke_bedrock_json(prompt, max_tokens=max_tokens)


def _invoke_model_text(prompt, max_tokens=350):
    provider = _get_model_provider()
    if provider == 'gemini':
        return _invoke_gemini_text(prompt, max_tokens=max_tokens)
    return _invoke_bedrock_text(prompt, max_tokens=max_tokens)


def _local_static_review(code_snippet):
    """Use real SAST scanner instead of mock findings."""
    text = code_snippet or ''
    
    # Use real SAST scanner to detect actual vulnerabilities
    sast_findings = SASTScanner.scan_code(text, file_path='<input>')
    
    # Convert SAST findings to the expected response format
    vulnerabilities = []
    for finding in sast_findings:
        vulnerabilities.append({
            'severity': finding['severity'],
            'issue': finding['issue'],
            'attack_vector': finding['attack_vector'],
            'explanation': finding['explanation'],
            'poc_exploit_scenario': finding['poc_exploit_scenario'],
            'remediation': finding['remediation'],
            'suggested_fix': finding['suggested_fix'],
            'matched_code': finding.get('matched_code', ''),
            'line': finding.get('line', 0),
        })
    
    return {
        'vulnerabilities': vulnerabilities,
        'analysis_mode': 'sast-local',
        'note': 'Real static analysis performed; pattern-based vulnerability detection.',
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
        analysis_result = _invoke_model_json(prompt)
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

        # Call configured model provider (Gemini or Bedrock) using modularized prompt builder
        prompt = build_security_prompt(code_snippet, language)

        # Parse Claude's JSON response
        try:
            analysis_result = _invoke_model_json(prompt)
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
            answer = _invoke_model_text(prompt)
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
            analysis_result = _invoke_model_json(prompt)
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
