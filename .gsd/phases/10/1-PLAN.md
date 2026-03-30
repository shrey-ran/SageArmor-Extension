---
phase: 10
plan: 1
wave: 1
---

# Plan 10.1: Production Deployment — Backend (AWS Lambda)

## Objective
Deploy the SageArmor AI backend to AWS using the Serverless Framework. The Lambda function should be live, accessible via a real HTTPS API Gateway URL, and configured with all required environment secrets.

## Context
- backend/serverless.yml
- backend/src/handler.py
- backend/.env.example

## Tasks

<task type="manual">
  <name>Configure AWS Credentials Locally</name>
  <action>
    Before deploying, ensure your AWS CLI credentials are set. Run:
    ```bash
    export AWS_ACCESS_KEY_ID=your_key_here
    export AWS_SECRET_ACCESS_KEY=your_secret_here
    export AWS_REGION=us-east-1
    ```
    Your IAM user must have permissions for: Lambda, API Gateway, CloudFormation, IAM, S3, Bedrock.
  </action>
  <verify>aws sts get-caller-identity && echo "Credentials OK"</verify>
  <done>AWS credentials confirmed valid.</done>
</task>

<task type="auto">
  <name>Add CORS and Webhook Endpoint to serverless.yml</name>
  <files>
    backend/serverless.yml
  </files>
  <action>
    - Open `backend/serverless.yml`.
    - Add `cors: true` to the existing `http` event so the deployed API Gateway accepts cross-origin requests from the frontend.
    - Add a second event to the same function for GitHub webhook POST at `/webhook` path.
    - Set `environment` block at the provider level to reference SSM or use `${env:VARIABLE_NAME}` syntax to avoid hardcoding secrets.
  </action>
  <verify>grep -q 'cors: true' backend/serverless.yml && echo "Success"</verify>
  <done>serverless.yml is production-ready with CORS and webhook endpoint.</done>
</task>

<task type="manual">
  <name>Deploy Backend to AWS</name>
  <action>
    Run the deployment from the backend directory (with AWS credentials set):
    ```bash
    cd backend
    source venv/bin/activate
    npx serverless deploy --stage prod
    ```
    After deployment, Serverless will print the live API Gateway URL, e.g.:
    `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/review`
    
    Save this URL — you'll need it for the frontend env.
  </action>
  <verify>npx serverless info --stage prod 2>&1 | grep -i 'endpoint'</verify>
  <done>Lambda function live on AWS with a real HTTPS endpoint.</done>
</task>

---

# Plan 10.2: Production Deployment — Frontend (Vercel)

## Objective
Build the Vite/React frontend for production and deploy it to Vercel (free tier), pointing it at the live AWS API Gateway URL.

## Tasks

<task type="auto">
  <name>Update Frontend Production Environment</name>
  <files>
    frontend/.env.example
  </files>
  <action>
    - Open `frontend/.env.example`.
    - Ensure it documents: `VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/prod`
    - This is the only change needed — the frontend reads this variable at build time.
  </action>
  <verify>grep -q 'VITE_API_BASE_URL' frontend/.env.example && echo "Success"</verify>
  <done>Frontend env template documents the correct production API URL variable.</done>
</task>

<task type="manual">
  <name>Deploy Frontend to Vercel</name>
  <action>
    Option A (Recommended — Vercel CLI):
    ```bash
    cd frontend
    npm run build   # Verify build succeeds first
    npx vercel --prod
    ```
    During the Vercel prompts:
    - Set `VITE_API_BASE_URL` to your live AWS API Gateway URL from Plan 10.1.
    - Vercel will give you a live URL like: `https://sagearmor.vercel.app`

    Option B (GitHub UI): Connect your repo to Vercel at vercel.com and set the env variable in the dashboard.
  </action>
  <verify>curl -s https://your-vercel-url.vercel.app | grep -i 'SageArmor' && echo "Frontend live"</verify>
  <done>React dashboard live on Vercel, talking to the live Lambda backend.</done>
</task>

<task type="manual">
  <name>Register GitHub Webhook on Target Repo</name>
  <action>
    To activate the autonomous PR review feature:
    1. Go to your target GitHub repo → Settings → Webhooks → Add webhook.
    2. Set Payload URL: `https://your-api-gateway.amazonaws.com/prod/webhook`
    3. Set Content type: `application/json`
    4. Set Secret: the same value as `GITHUB_WEBHOOK_SECRET` in your backend `.env`
    5. Select events: "Pull requests" only.
    6. Click "Add webhook".
    SageArmor AI will now automatically review every PR opened on that repo.
  </action>
  <verify>Open a test PR on your repo and check if SageArmor AI posts a comment.</verify>
  <done>GitHub webhook active. SageArmor AI is fully autonomous in production.</done>
</task>

## Success Criteria
- [ ] Backend Lambda live at a real AWS HTTPS endpoint.
- [ ] Frontend React dashboard live at a Vercel URL.
- [ ] Frontend successfully calls the live Lambda.
- [ ] GitHub webhook registered and triggering autonomous PR reviews.
