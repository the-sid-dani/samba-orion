# Langfuse Production Environment Setup Guide

## 🚨 Critical Setup Required

Your Langfuse dashboard currently only shows **"development"** and **"default"** environments. You need to create a **"production"** environment to receive production traces.

## 📋 Step-by-Step Setup

### 1. Access Langfuse Dashboard Settings

1. Navigate to your Langfuse dashboard: https://cloud.langfuse.com (or your self-hosted URL)
2. Log in with your credentials
3. Select your project: **ai-task-force / samba-orion**

### 2. Create Production Environment

#### Option A: Via Dashboard UI
1. Click on **Settings** (gear icon) in the left sidebar
2. Navigate to **Environments** section
3. Click **Add Environment** or **New Environment**
4. Enter environment name: `production`
5. Click **Save** or **Create**

#### Option B: Via API (if available)
```bash
curl -X POST https://cloud.langfuse.com/api/v1/environments \
  -H "Authorization: Bearer ${LANGFUSE_SECRET_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production",
    "description": "Production environment for live user traffic"
  }'
```

### 3. Verify Environment Variable Configuration

Ensure your **production deployment** (Vercel) has the correct environment variables set:

```bash
# Required Langfuse Variables
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Vercel Environment Detection (automatically set by Vercel)
VERCEL_ENV=production  # Set by Vercel automatically
NODE_ENV=production    # Fallback
```

**Important:** Do NOT set these manually in Vercel - `VERCEL_ENV` is automatically set by Vercel based on deployment context:
- `VERCEL_ENV=production` → Production deployments
- `VERCEL_ENV=preview` → Preview deployments (PR previews)
- `VERCEL_ENV=development` → Local development

### 4. Environment Detection Logic

Your application now uses this detection order:

```typescript
const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
```

This means:
- **Production deployment:** `VERCEL_ENV=production` → traces go to "production" environment
- **Preview deployment:** `VERCEL_ENV=preview` → traces go to "preview" environment
- **Local development:** `NODE_ENV=development` → traces go to "development" environment

### 5. Verify Trace Routing

After creating the production environment:

1. **Deploy to production** (or trigger a redeploy)
2. **Send a test message** through your production app
3. **Check Langfuse dashboard:**
   - Navigate to **Tracing** → **Traces**
   - Filter by **Environment: production**
   - You should see traces appearing within 30 seconds

### 6. Filter Traces by Environment

In Langfuse dashboard:

1. Go to **Tracing** → **Traces**
2. Click **Environment** dropdown (top bar)
3. Select **production** to see production traces only
4. Available filters:
   - `development` - Local development traces
   - `production` - Live production traces
   - `default` - Fallback environment

## 🎯 Expected Results

Once setup is complete, you should see:

### Production Traces
- **Environment:** `production`
- **Session IDs:** Real user session UUIDs
- **User IDs:** Actual authenticated user IDs
- **Agents:** Agent names when agents are used
- **Tags:**
  - `chat`
  - `provider:anthropic`, `provider:openai`, etc.
  - `model:claude-4-sonnet`, etc.
  - `agent:AgentName` (when applicable)
  - `environment:production`

### Development Traces
- **Environment:** `development`
- **Session IDs:** Local test sessions
- **Tags:** Same structure with `environment:development`

## 🔍 Troubleshooting

### Problem: Still no production traces after setup

**Check 1: Verify environment variable in production**
```bash
# Via Vercel CLI
vercel env ls

# Should show:
# LANGFUSE_PUBLIC_KEY    Production
# LANGFUSE_SECRET_KEY    Production
# LANGFUSE_BASE_URL      Production
```

**Check 2: Verify environment detection**
- Add temporary logging to check `process.env.VERCEL_ENV`
- Should be `"production"` in production deployments

**Check 3: Check Langfuse connectivity**
- Visit `/api/health/langfuse` on your production domain
- Should return `{"status": "configured", "connectivity": "success"}`

### Problem: Traces going to wrong environment

**Cause:** `VERCEL_ENV` not being set correctly

**Fix:**
1. Ensure you're deploying to production branch (usually `main`)
2. Check Vercel project settings → Git → Production Branch
3. Redeploy to ensure latest environment detection code is active

### Problem: Traces not flushing in serverless

**Symptom:** Traces appear in development but not production

**Cause:** Missing `forceFlush()` calls (should be fixed in latest deployment)

**Verify fix is deployed:**
```bash
# Check if route.ts includes forceFlush
grep -r "forceFlush" src/app/api/chat/route.ts

# Should output:
# await langfuseSpanProcessor.forceFlush();
```

## 📊 Monitoring Production Traces

### Key Metrics to Track

1. **Trace Volume:** Traces per hour in production environment
2. **Agent Usage:** Distribution of traces across agents (via agent tags)
3. **Model Usage:** Distribution across providers/models (via provider/model tags)
4. **Cost Tracking:** Token usage and costs per session
5. **Error Rates:** Failed traces vs successful traces

### Creating Dashboards

In Langfuse:

1. **Agent Performance Dashboard:**
   - Filter: `tag:agent:*`
   - Metrics: Avg latency, token usage, cost per agent

2. **Production Health Dashboard:**
   - Filter: `environment:production`
   - Metrics: Total traces, error rate, avg response time

3. **Cost Analysis Dashboard:**
   - Filter: `environment:production`
   - Group by: `provider`, `model`
   - Metrics: Total cost, cost per conversation

## ✅ Success Checklist

- [ ] Production environment created in Langfuse dashboard
- [ ] Environment variables verified in Vercel production
- [ ] Test trace sent from production and appears in Langfuse
- [ ] Traces correctly filtered by environment in dashboard
- [ ] Agent tags visible and filterable
- [ ] No traces being lost (check trace count vs API calls)

## 🔗 Related Documentation

- [Langfuse Vercel AI SDK Integration](./langfuse-vercel-ai-sdk.md)
- [Agent Observability Guide](./langfuse-agent-observability-guide.md) (to be created)
- [Langfuse Official Docs](https://langfuse.com/docs)
