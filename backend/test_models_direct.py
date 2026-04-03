import boto3
from dotenv import load_dotenv
load_dotenv('.env')

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
for model in ['us.anthropic.claude-3-5-sonnet-20241022-v2:0', 'us.anthropic.claude-3-7-sonnet-20250219-v1:0', 'us.anthropic.claude-3-5-sonnet-20240620-v1:0']:
    try:
        response = bedrock.invoke_model(
            modelId=model,
            contentType='application/json',
            accept='application/json',
            body='{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
        )
        print(f"SUCCESS: {model}")
    except Exception as e:
        print(f"FAILED {model}: {e}")
