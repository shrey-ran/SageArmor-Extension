import boto3
from dotenv import load_dotenv
load_dotenv('backend/.env')
client = boto3.client('bedrock', region_name='us-east-1')
response = client.list_inference_profiles()
for p in response['inferenceProfileSummaries']:
    if 'anthropic' in p['inferenceProfileId']:
        print(p['inferenceProfileId'])
