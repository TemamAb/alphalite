# AlphaPro Dockerization & Local Deployment Blockers Report

**Date:** 2026-03-07  
**Role:** Chief Architect - Dockerization Analysis  
**Objective:** Identify and document all blockers preventing successful dockerization and local port deployment

---

## Executive Summary

After deep analysis of the AlphaPro Docker configuration, multiple **blockers** have been identified that prevent successful dockerization and local port deployment. This report details each blocker, its impact, and recommended fixes.

---

## BLOCKER #1: Dockerfile Path Resolution Issues

### Issue
The root `Dockerfile` copies files that may not exist in the expected locations:

```dockerfile
# Line 15-16: Dashboard path issues
COPY modules/dashboard/package.json modules/dashboard/package-lock.json* ./

# Line 26-27: API path issues  
COPY modules/api/package.json modules/api/package-lock.json* ./
```

### Root Cause
- Build context is set to `.` (root)
- The Dockerfile expects `modules/dashboard/` but references paths incorrectly
- Missing client directory structure

### Impact
- ❌ **BLOCKER** - Docker build will fail
- Cannot create production image

### Fix Required
Update Dockerfile to use correct paths from build context root:

```dockerfile
# Fix: Copy from correct relative paths
COPY modules/dashboard/package.json modules/dashboard/package-lock.json* ./tmp/dashboard/
COPY modules/api/package.json modules/api/package-lock.json* ./tmp/api/
```

---

## BLOCKER #2: Root app.js Missing

### Issue
The root Dockerfile copies `app.js` from root level:
```dockerfile
# Line 42
COPY app.js ./
```

But `app.js` is located at `modules/api/app.js`, not at root.

### Root Cause
- `app.js` exists at `modules/api/app.js`
- Root level has no `app.js`
- Dockerfile expects it at root

### Impact
- ❌ **BLOCKER** - Container will fail to start
- Missing entry point

### Fix Required
Either:
1. Create a root-level `app.js` that imports from `modules/api/app.js`
2. Or update Dockerfile to copy from correct path

---

## BLOCKER #3: Dashboard Build Dependencies Missing in Root

### Issue
The root `Dockerfile` tries to run `npm install` for dashboard:
```dockerfile
# Line 20
RUN npm install
```

But `package.json` at root doesn't have dashboard dependencies.

### Root Cause
- Root `package.json` has different dependencies than dashboard
- Dashboard needs React, Vite, TypeScript, etc.
- These are only in `modules/dashboard/package.json`

### Impact
- ❌ **BLOCKER** - Dashboard build will fail
- Missing build tools

### Fix Required
The Dockerfile should use the dashboard's package.json specifically:
```dockerfile
WORKDIR /dashboard
COPY modules/dashboard/package.json modules/dashboard/package-lock.json* ./
RUN npm install
```

---

## BLOCKER #4: modules/api/Dockerfile - Build Context Mismatch

### Issue
The `modules/api/Dockerfile` expects build context to be root:
```dockerfile
# Line 8-9
COPY ./modules/api/package.json ./modules/api/package.json
COPY ./modules/api/package-lock.json* ./modules/api/
```

But this only works if build context is root (`.`).

### Root Cause
- Dockerfile is inside `modules/api/` but expects root context paths
- If built from `modules/api/` context, paths will be wrong

### Impact
- ❌ **BLOCKER** - Will fail if built from wrong context
- Path resolution errors

### Fix Required
Use correct build context or update paths in Dockerfile.

---

## BLOCKER #5: modules/dashboard/Dockerfile - Build Context Issue

### Issue
The dashboard Dockerfile has:
```dockerfile
# Line 15
COPY package.json package-lock.json* ./
```

This expects `package.json` in the build context root, but the actual file is at `modules/dashboard/package.json`.

### Root Cause
- Dockerfile is inside `modules/dashboard/` but copies from root of context
- Missing correct path references

### Impact
- ❌ **BLOCKER** - Build will fail with "no such file or directory"

### Fix Required
Either:
1. Build with context as `modules/dashboard/` and fix paths
2. Or use context as root and fix COPY commands

---

## BLOCKER #6: Port Conflicts in Docker Compose

### Issue
Multiple services try to bind to same ports:
- `docker-compose.yml`: API on `3000:3000`
- `modules/deployments/docker-compose.yml`: API on `3001:3000`, Brain on `5001:5000`
- Dashboard standalone: Would need port 80/443

### Root Cause
- No standardized port allocation
- Potential conflicts if running multiple compose files

### Impact
- ⚠️ **WARNING** - Port binding failures
- Services won't start if ports in use

---

## BLOCKER #7: Missing Environment Variables

### Issue
Docker compose files reference environment variables that may not exist:
```yaml
# modules/deployments/docker-compose.yml
- OPENAI_API_KEY=${OPENAI_API_KEY}
- PRIVATE_KEY=${PRIVATE_KEY}
```

### Root Cause
- `.env` file exists but may not have all required variables
- No `.env.example` with all required keys

### Impact
- ⚠️ **WARNING** - Services may start but fail at runtime
- Missing configuration

### Fix Required
Ensure all required environment variables are documented in `.env.example`.

---

## BLOCKER #8: Health Check URL Mismatch

### Issue
The root `docker-compose.yml` has:
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/"]
```

But the API serves at `/api/health`, not root `/`.

### Root Cause
- Root path returns HTML (SPA fallback)
- Actual health check is at `/api/health`

### Impact
- ⚠️ **WARNING** - Health check may always pass incorrectly
- False positive health status

### Fix Required
```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
```

---

## BLOCKER #9: Brain Service - app.py Location

### Issue
The brain Dockerfile:
```dockerfile
COPY . .
CMD ["python", "app.py"]
```

But `app.py` may not be at the root of the build context.

### Root Cause
- `app.py` is at `modules/brain/app.py`
- Dockerfile expects it at root

### Impact
- ❌ **BLOCKER** - Brain container will fail to start

### Fix Required
```dockerfile
COPY . .
WORKDIR /usr/src/app
CMD ["python", "app.py"]
```
Or copy from correct path.

---

## BLOCKER #10: Network Configuration Missing

### Issue
Root `docker-compose.yml` doesn't define a network:
```yaml
# No networks section
```

### Root Cause
- Services can't communicate with each other
- No isolation from other containers

### Impact
- ⚠️ **WARNING** - Service-to-service communication issues

### Fix Required
Add networks section:
```yaml
networks:
  alphapro-net:
    driver: bridge
```

---

## Summary of Blockers

| Blocker | Severity | Type | Impact |
|---------|----------|------|--------|
| #1 Path Resolution | CRITICAL | Build | Docker build fails |
| #2 Missing app.js | CRITICAL | Runtime | Container won't start |
| #3 Missing deps | CRITICAL | Build | Dashboard build fails |
| #4 API context | CRITICAL | Build | Wrong context = fail |
| #5 Dashboard context | CRITICAL | Build | Wrong context = fail |
| #6 Port conflicts | HIGH | Runtime | Port binding fails |
| #7 Missing env vars | HIGH | Runtime | Runtime errors |
| #8 Health check | MEDIUM | Ops | False positives |
| #9 Brain app.py | CRITICAL | Runtime | Container fails |
| #10 Networks | MEDIUM | Ops | Communication issues |

---

## Total Blockers: 10
- Critical (Build/Runtime): 7
- High: 2
- Medium: 1

---

## Recommended Actions

### Immediate (P0)
1. Fix root Dockerfile path references
2. Create root-level entry point or fix app.js path
3. Fix all Docker build contexts
4. Fix health check endpoints

### Short-term (P1)
5. Add network configuration
6. Document all required environment variables
7. Resolve port conflicts

---

*Report generated by Chief Architect - Dockerization Analysis*
