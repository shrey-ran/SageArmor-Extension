# Design Decisions Log

| Date | Context | Decision | Consequences |
|------|---------|----------|--------------|
| 2026-03-30 | Initial Stack | Use Serverless framework (AWS Lambda) + Vite/React + Tailwind 4 | Highly scalable but requires complex local IAM policies to invoke Bedrock. |
| 2026-03-30 | AI Engine | Claude 3.5 Sonnet on AWS Bedrock | Best-in-class coding logic. |
| 2026-03-30 | UI Styling | Ported "CyberOps Pro" theme from Stitch directly | Requires careful manual CSS var maintenance. |
