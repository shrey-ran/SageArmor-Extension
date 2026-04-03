import boto3

client = boto3.client('bedrock', region_name='us-east-1')
response = client.list_inference_profiles()
for p in response['inferenceProfileSummaries']:
    if 'sonnet' in p['inferenceProfileId']:
        print(p['inferenceProfileId'])
