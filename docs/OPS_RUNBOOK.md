# AlphaPro Operations Runbook

**Version:** 1.0  
**Last Updated:** 2026-03-07  
**For:** AlphaPro Flash Loan Engine Production

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Service Overview](#service-overview)
3. [Health Checks](#health-checks)
4. [Common Operations](#common-operations)
5. [Troubleshooting](#troubleshooting)
6. [Emergency Procedures](#emergency-procedures)
7. [Monitoring](#monitoring)

---

## Quick Start

### Start All Services

```bash
# Using Docker Compose
docker-compose up -d

# Or with full stack
cd modules/deployments
docker-compose up -d
```

### Check Status

```bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f

# Health check
curl http://localhost:3000/api/health
```

### Stop Services

```bash
docker-compose down
docker-compose down -v  # with volumes
```

---

## Service Overview

| Service | Port | Description |
|---------|------|-------------|
| API | 3000/3001 | Main trading API |
| Dashboard | 8080 | React UI |
| Brain | 5001 | AI optimization |
| Redis | 6379 | Caching |
| PostgreSQL | 5432 | Database |

---

## Health Checks

### API Health

```bash
curl http://localhost:3000/api/health
# Response: {"status":"ok","timestamp":"2026-03-07T..."}
```

### Database Health

```bash
docker exec alphapro_api node -e "require('./utils/database').test()"
```

### Blockchain RPC

```bash
curl http://localhost:3000/api/check_rpc
```

---

## Common Operations

### 1. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f brain

# Last 100 lines
docker-compose logs --tail=100
```

### 2. Restart Service

```bash
docker-compose restart api
docker-compose restart brain
```

### 3. Update Configuration

```bash
# Edit .env file
nano .env

# Restart to apply
docker-compose restart
```

### 4. Scale Services

```bash
# Scale API to 3 instances
docker-compose up -d --scale api=3
```

### 5. Backup Database

```bash
docker exec alphapro_postgres pg_dump -U user alphapro > backup.sql
```

### 6. Check Disk Space

```bash
docker system df
```

---

## Troubleshooting

### Issue: API Not Responding

**Diagnosis:**
```bash
# Check if container is running
docker ps | grep alphapro

# Check logs
docker-compose logs api

# Check resource usage
docker stats
```

**Solution:**
```bash
# Restart API
docker-compose restart api

# Or rebuild
docker-compose up -d --build api
```

### Issue: Database Connection Failed

**Diagnosis:**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec -it alphapro_postgres psql -U user -d alphapro
```

**Solution:**
```bash
# Restart database
docker-compose restart postgres

# Check .env DATABASE_URL
```

### Issue: High Memory Usage

**Solution:**
```bash
# Restart all services
docker-compose restart

# Or prune unused images
docker system prune -a
```

### Issue: Blockchain RPC Errors

**Diagnosis:**
```bash
curl http://localhost:3000/api/check_rpc
```

**Solution:**
- Check ETH_RPC_URL in .env
- Verify API key validity
- Try alternative RPC provider

### Issue: Trade Execution Failed

**Check:**
1. Wallet has sufficient balance
2. Gas price is reasonable
3. Network is not congested
4. Private key is valid

```bash
# Check balance
curl http://localhost:3000/api/check_balance?address=0x...
```

---

## Emergency Procedures

### EMERGENCY: Stop All Trading

```bash
# Kill all containers
docker-compose down

# Or just stop API
docker-compose stop api
```

### EMERGENCY: Circuit Breaker Triggered

The smart contract has a circuit breaker. If triggered:

1. Check which keeper triggered it
2. Review logs for reason
3. Fix underlying issue
4. Resume with:
```bash
docker exec alphapro_api cast send 0x... "resumeOperations()" --rpc-url $ETH_RPC_URL
```

### EMERGENCY: Wallet Compromised

1. **Immediate:**
```bash
docker-compose stop api
```

2. **Rotate keys:**
- Generate new wallet
- Update PRIVATE_KEY in .env
- Transfer funds to new wallet

3. **Verify:**
```bash
docker-compose up -d
```

### EMERGENCY: Smart Contract Bug

1. **Pause execution:**
```bash
docker-compose stop api brain
```

2. **Upgrade contract (if upgradeable):**
```bash
# Deploy new implementation
forge create --upgrade ... 
```

3. **Test thoroughly**

4. **Resume**

---

## Monitoring

### Prometheus Metrics

```bash
# Access metrics
curl http://localhost:3000/metrics
```

### Key Metrics

| Metric | Description | Alert If |
|--------|-------------|----------|
| http_requests_total | Total requests | > 10000/min |
| trades_total | Total trades | - |
| profit_total_eth | Total profit | < 0 |
| errors_total | Error count | > 10/min |
| operation_duration_seconds | Latency | > 5s |

### Log Aggregation

```bash
# Filter errors
docker-compose logs | grep ERROR

# Filter by service
docker-compose logs brain | grep ERROR
```

---

## Maintenance

### Weekly Tasks

- [ ] Review error logs
- [ ] Check disk space
- [ ] Verify backups
- [ ] Monitor profit/loss

### Monthly Tasks

- [ ] Update dependencies
- [ ] Review security patches
- [ ] Test failover procedures
- [ ] Audit wallet balances

### Quarterly Tasks

- [ ] Penetration testing
- [ ] Code audit
- [ ] Performance review
- [ ] Disaster recovery test

---

## Support Contacts

| Role | Contact |
|------|---------|
| DevOps Lead | [TBD] |
| Security | [TBD] |
| Smart Contracts | [TBD] |

---

## Appendix

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| JWT_SECRET | Yes | Auth token secret |
| ETH_RPC_URL | Yes | Ethereum RPC |
| PRIVATE_KEY | Yes | Trading wallet |
| DATABASE_URL | Yes | PostgreSQL |
| REDIS_URL | Yes | Redis cache |
| OPENAI_API_KEY | No | AI features |

### Useful Commands

```bash
# Shell into container
docker exec -it alphapro_api sh

# View real-time metrics
docker stats

# Check networking
docker network ls

# View volumes
docker volume ls
```

---

*Runbook Version 1.0 - AlphaPro Operations Team*
</parameter>
</create_file>
