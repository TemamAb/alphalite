# AlphaPro Render Cloud Deployment Guide

## Pre-requisites
1. GitHub account with access to https://github.com/TemamAb/alphalie
2. Render.com account (free tier works for testing)

## Step 1: Push Code to GitHub

Run these commands in your local terminal:

```bash
# Navigate to project directory
cd c:/Users/op/Desktop/AlphaPro

# Initialize git (if not already initialized# Add all)
git init

 files
git add .

# Commit with message
git commit -m "AlphaPro production deployment ready - configured for Render Cloud"

# Add remote (if not already set)
git remote add origin https://github.com/TemamAb/alphalie.git

# Push to main branch
git push -u origin main
```

## Step 2: Configure Render.com

### Option A: Using render.yaml (Recommended)

1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub repository: `TemamAb/alphalie`
 4. Render will automatically detect `render.yaml` in the root of your repository.
5. Click "Apply Blueprint"

### Option B: Manual Service Setup

#### 1. Create Brain Service (Python)
- Name: `alphapro-brain`
- Type: Python
- Root Directory: `modules/brain`
- Build Command: `pip install -r requirements.txt`
- Start Command: `python app.py`
- Env Vars:
  - `PYTHON_VERSION`: `3.11`
  - `FLASK_ENV`: `production`

#### 2. Create API Service (Node.js)
- Name: `alphapro-api`
- Type: Docker
- Root Directory: `modules/api`
- Env Vars:
  - `NODE_ENV`: `production`
  - `PORT`: `3000`
  - `TRADING_MODE`: `PAPER` (or `LIVE` with secrets)

#### 3. Create Dashboard Service (Static)
- Name: `alphapro-dashboard`
- Type: Static Site
- Root Directory: `modules/dashboard`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`

## Step 3: Configure Secrets (Required for LIVE Trading)

In Render Dashboard, go to each service's "Environment" tab and add these secrets:

### For API Service:
```
PRIVATE_KEY=your_ethereum_private_key
WALLET_ADDRESS=your_wallet_address
PIMLICO_API_KEY=your_pimlico_api_key
BUNDLER_URL=https://api.pimlico.io/v2/1/rpc
PAYMASTER_URL=https://api.pimlico.io/v2/1/rpc
ENTRYPOINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
OPTIMISM_RPC_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_API_KEY=your_alchemy_key
INFURA_API_KEY=your_infura_key
BIRDEYE_API_KEY=your_birdeye_key
OPENAI_API_KEY=your_openai_key
ADMIN_API_KEY=your_admin_key
JWT_SECRET=your_jwt_secret
```

## Step 4: Verify Deployment

1. Check service health:
   - Brain: `https://alphapro-brain.onrender.com/status`
   - API: `https://alphapro-api.onrender.com/api/health`
   - Dashboard: `https://alphapro-dashboard.onrender.com`

2. Test authentication:
   ```bash
   curl -X POST https://alphapro-api.onrender.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","username":"testuser","password":"testpass123"}'
   ```

## Production Checklist

- [ ] Set `TRADING_MODE=LIVE` (after testing with PAPER)
- [ ] Configure all RPC endpoints
- [ ] Set up alerts in Render
- [ ] Enable auto-deploy from main branch
- [ ] Configure custom domain (optional)

## Troubleshooting

### Service fails to start
- Check logs in Render Dashboard
- Ensure environment variables are set correctly
- Verify build commands work locally

### Database connection errors
- Render provides PostgreSQL addon
- Set `DATABASE_URL` in environment variables

### CORS errors
- Ensure dashboard URL is in API's allowed origins
- Check `CORS_ORIGIN` environment variable
