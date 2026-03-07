# AlphaPro Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying AlphaPro to production using Docker and Render.com.

## Prerequisites
- Docker Desktop installed and running
- Git installed
- A GitHub account
- A Render.com account

## Architecture
AlphaPro uses a unified Docker architecture:
- **Frontend**: React dashboard (built during Docker build)
- **Backend**: Node.js API server
- **Database**: PostgreSQL (optional for production)
- **Cache**: Redis (optional for production)

## Local Development

### Running Locally with Docker

1. **Build the Docker image:**
```bash
cd AlphaPro
docker build -t alphapro:latest .
```

2. **Run the container:**
```bash
docker run -p 3000:3000 --env-file .env alphapro:latest
```

3. **Access the application:**
- Dashboard: http://localhost:3000
- API: http://localhost:3000/api

### Using Docker Compose

```bash
cd AlphaPro
docker-compose up --build
```

## GitHub Setup & Push

### 1. Initialize Git Repository
```bash
cd AlphaPro
git init
git add .
git commit -m "Initial commit: AlphaPro flash loan engine"
```

### 2. Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository named `alphapro`
3. Do NOT initialize with README (we already have code)

### 3. Push to GitHub
```bash
git remote add origin https://github.com/TemamAb/alphalite.git
git branch -M main
git push -u origin main
```

## Render.com Deployment

### Automatic Detection
Render will automatically detect the `render.yaml` file in your repository and set up the service.

### Manual Setup (Alternative)
1. Log in to Render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect the Dockerfile

### Required Environment Variables
After deployment, set these in Render Dashboard:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Production mode | `production` |
| `PORT` | Server port | `3000` |
| `TRADING_MODE` | Trading mode | `LIVE` |
| `ETH_RPC_URL` | Ethereum RPC | `https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY` |
| `ARBITRUM_RPC_URL` | Arbitrum RPC | `https://arb1.arbitrum.io/rpc` |
| `WALLET_ADDRESS` | Trading wallet | `0x...` |
| `PRIVATE_KEY` | Private key | `0x...` |
| `PIMLICO_API_KEY` | Pimlico API | `pim_...` |
| `JWT_SECRET` | JWT secret | Generate strong random string |
| `ENCRYPTION_KEY` | Encryption key | Generate 64-char hex string |
| `OPENAI_API_KEY` | OpenAI API | `sk-...` |

### Critical: Wallet Configuration
The engine requires wallet and private key to function. You can configure this in TWO ways:

**Option 1: Set in Render Dashboard**
- Go to Render → Your Service → Environment
- Add `WALLET_ADDRESS` and `PRIVATE_KEY`

**Option 2: Enter in Dashboard Settings**
- After deployment, open the dashboard
- Go to Settings → Wallets
- Enter wallet address and private key
- Click "Start Engine" to begin trading

## Verification

### Check Health Endpoint
```bash
curl https://your-render-url.onrender.com/api/health
```

### Check Engine Status
```bash
curl https://your-render-url.onrender.com/api/engine/status
```

## Troubleshooting

### Container Won't Start
- Check logs: `docker logs <container_id>`
- Verify environment variables are set
- Check port 3000 is not in use

### API Returns 503
- Ensure `PRIVATE_KEY` and `PIMLICO_API_KEY` are configured
- Check blockchain RPC URLs are valid

### Dashboard Not Loading
- Check browser console for errors
- Verify the API URL is correct
- Ensure build completed successfully

## Security Notes

1. **NEVER commit `.env` file to GitHub**
2. **Use environment variables for all secrets**
3. **Rotate API keys regularly**
4. **Monitor wallet balance for unauthorized transactions**
5. **Enable 2FA on Render and GitHub accounts**

## Support
For issues, check the logs:
- Docker: `docker logs alphapro`
- Render: Dashboard → Logs
