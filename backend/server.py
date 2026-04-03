#!/usr/bin/env python3
from flask import Flask, request, jsonify
import sys
import json
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.handler import review_code

app = Flask(__name__)

@app.route('/review', methods=['POST'])
def handle_review():
    try:
        data = request.json or {}
        code = data.get('code', '')
        language = data.get('language', 'python')
        
        # Build event in Lambda format
        event = {
            'body': json.dumps({'code': code, 'language': language}),
            'headers': dict(request.headers)
        }
        
        # Call the handler
        lambda_response = review_code(event, None)
        
        # Parse the Lambda response
        status_code = lambda_response.get('statusCode', 200)
        body = lambda_response.get('body', '{}')
        
        # Parse body if it's a string
        if isinstance(body, str):
            body = json.loads(body)
        
        return jsonify(body), status_code
    except Exception as e:
        print(f"Error in /review: {str(e)}")
        return jsonify({'error': str(e), 'vulnerabilities': []}), 500

if __name__ == '__main__':
    print("Starting Sage Armor backend on http://localhost:3000")
    app.run(host='0.0.0.0', port=3000, debug=False)
