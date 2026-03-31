import boto3
from dotenv import load_dotenv

load_dotenv()
client = boto3.client('logs', region_name='us-east-1')
response = client.describe_log_streams(
    logGroupName='/aws/lambda/ai-security-agent-prod-reviewCode',
    orderBy='LastEventTime', 
    descending=True, 
    limit=2
)

for stream in response.get('logStreams', []):
    stream_name = stream['logStreamName']
    logs = client.get_log_events(
        logGroupName='/aws/lambda/ai-security-agent-prod-reviewCode',
        logStreamName=stream_name
    )
    for event in logs['events']:
        print(event['message'].strip())
