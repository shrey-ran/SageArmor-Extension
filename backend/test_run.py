import os
import sys
from dotenv import load_dotenv
load_dotenv('.env')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
try:
    from src import handler
    event = {
        "body": "{\"code\":\"print('hello')\",\"language\":\"python\"}",
        "headers": {}
    }
    print("Testing handler locally...")
    res = handler.review_code(event, None)
    print("FINISHED:", res)
except Exception as e:
    print(f"ERROR: {e}")
