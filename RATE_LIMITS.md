# 🔒 SageArmor AI — Rate Limits & Cost Guardrails

> This document describes all rate limits and spending caps applied to SageArmor AI in production.
> These restrictions exist to prevent unexpected AWS bills while keeping the tool fully functional for personal/dev use.

---

## Active Limits

### 1. API Gateway — Request Throttling
| Limit | Value | Effect |
|---|---|---|
| Max requests per second | **1 req/sec** | If you scan faster than 1x/sec, API returns HTTP 429 Too Many Requests |
| Max concurrent requests | **2** | At most 2 simultaneous in-flight requests accepted |

**What this means for you:**
- ✅ Normal use (click scan, wait for result) — works fine
- ❌ If you spam-click "New Scan" rapidly, the 2nd+ click gets a 429 error
- ❌ The GitHub webhook will also be throttled if multiple PRs open simultaneously

---

### 2. Lambda — Reserved Concurrency
| Limit | Value | Effect |
|---|---|---|
| Parallel Lambda executions | **1** | Only 1 scan can run at a time |

**What this means for you:**
- ✅ Single scans work perfectly
- ❌ If 2 people scan at the same exact moment, the second request is throttled
- ❌ If a slow PR diff scan is running, a fast dashboard scan will queue or reject until it finishes

---

### 3. Bedrock — Output Token Cap
| Limit | Value | Effect |
|---|---|---|
| Max output tokens per scan | **600 tokens** | Claude's response is capped at ~450 words |

**What this means for you:**
- ✅ 1–3 vulnerabilities: full response with all fields
- ⚠️ 4–5 vulnerabilities: some findings may be truncated (explanation or fix cut short)
- ❌ Code with 6+ findings: response may be incomplete JSON (backend will handle parse errors gracefully)

---

### 4. IAM / Bedrock Resource Lock
| Limit | Value | Effect |
|---|---|---|
| Bedrock model access | **Claude 3.5 Sonnet only** | Cannot call other models |
| AWS region | **us-east-1 only** | Bedrock calls outside this region fail |

---

## 💰 Estimated Maximum Monthly Cost

With all limits active, **worst-case spend** (running at maximum throttle 24/7):

| Component | Worst-case | Realistic |
|---|---|---|
| Lambda | Free (well within free tier) | Free |
| API Gateway | Free (well within free tier) | Free |
| Bedrock (Claude 3.5 Sonnet) | ~$4.32/month (86,400 calls × $0.00005) | ~$0.50–2/month |
| **Total** | **< $5/month cap** | **< $2/month** |

> In practice, you won't hit the ceiling. The 1 req/sec throttle means a maximum of **86,400 scans/day** theoretically, but with `reservedConcurrency: 1` and a ~3 second scan time, the real max is ~**28,800 scans/day** — still cheap.

---

## Recommended: Set a $1 AWS Budget Alert

As an extra safety net, set up a billing alert in AWS:

1. Go to [AWS Budgets](https://console.aws.amazon.com/billing/home#/budgets)
2. Create a **Cost budget** → Monthly → **$1.00**
3. Set alert at **80%** → email notification
4. This triggers if your bill exceeds $0.80 in a month

This is your **final safety net** — even if all code-level limits somehow fail, you'll be alerted before spending more than a dollar.

---

## How to Lift a Limit Later

When you're ready to scale for real team use:

| What to change | Where |
|---|---|
| Increase req/sec | `serverless.yml` → `apiGateway.throttling.maxRequestsPerSecond` |
| Allow parallel scans | `serverless.yml` → `functions.reviewCode.reservedConcurrency` → increase or remove |
| Longer AI responses | `handler.py` → `max_tokens` → increase to 2048 |
| Multi-region | `serverless.yml` → `provider.region` |
