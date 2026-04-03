import boto3
from dotenv import load_dotenv
load_dotenv('.env')

client = boto3.client('bedrock', region_name='us-east-1')
response = client.list_foundation_models()
for summary in response['modelSummaries']:
    if 'anthropic' in summary['modelId'] and 'sonnet' in summary['modelId']:
        print(summary['modelId'])
