import json
import os
import boto3
import hmac
import hashlib
import requests
from dotenv import load_dotenv
from prompt_builder import build_security_prompt
from github_commenter import post_pr_review

load_dotenv()

# Initialize Bedrock client
# In Lambda, boto3 natively picks up credentials and region from the IAM role.
# For local testing, it will pick up from the environment variables (.env).
bedrock = boto3.client(
    service_name='bedrock-runtime',
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)

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
        body_str = event.get('body', '{}')
        if not body_str:
            body_str = '{}'
        body = json.loads(body_str) if isinstance(body_str, str) else body_str
        
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

        # Claude 3 Sonnet Payload
        request_body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": prompt}]
                }
            ]
        })

        bedrock_response = bedrock.invoke_model(
            modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
            contentType='application/json',
            accept='application/json',
            body=request_body
        )

        response_body = json.loads(bedrock_response['body'].read())
        content = response_body.get('content', [])[0].get('text', '{}')
        
        # Parse Claude's JSON response
        try:
            analysis_result = json.loads(content)
        except json.JSONDecodeError:
            # Maybe the text has markdown block ```json ... ```
            clean_text = content.replace("```json", "").replace("```", "").strip()
            try:
                analysis_result = json.loads(clean_text)
            except:
                analysis_result = {"error": "Failed to parse AI response as JSON", "raw": content}

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

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": True
            },
            "body": json.dumps(analysis_result)
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": True
            },
            "body": json.dumps({"error": str(e)})
        }
