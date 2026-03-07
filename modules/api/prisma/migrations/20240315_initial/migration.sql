-- AlphaPro Initial Database Migration
-- Created: 2024-03-15
-- This migration creates all required tables for AlphaPro production deployment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USER AUTHENTICATION
-- =====================================================

CREATE TABLE "User" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    "mfaEnabled" BOOLEAN DEFAULT false,
    "mfaSecret" TEXT,
    "backupCodes" TEXT[],
    "isActive" BOOLEAN DEFAULT true,
    "lastLoginAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "User_email_idx" ON "User"(email);

CREATE TABLE "UserSession" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- =====================================================
-- TRADING RECORDS
-- =====================================================

CREATE TABLE "Trade" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "walletAddress" VARCHAR(100) NOT NULL,
    chain VARCHAR(50) NOT NULL,
    dex VARCHAR(50) NOT NULL,
    "tokenIn" VARCHAR(100) NOT NULL,
    "tokenOut" VARCHAR(100) NOT NULL,
    "amountIn" DOUBLE PRECISION NOT NULL,
    "amountOut" DOUBLE PRECISION,
    profit DOUBLE PRECISION,
    "gasUsed" DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'PENDING',
    "executedAt" TIMESTAMP DEFAULT NOW(),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "Trade_walletAddress_idx" ON "Trade"("walletAddress");
CREATE INDEX "Trade_chain_idx" ON "Trade"(chain);
CREATE INDEX "Trade_executedAt_idx" ON "Trade"("executedAt");

CREATE TABLE "Wallet" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(100) UNIQUE NOT NULL,
    "privateKeyEncrypted" TEXT,
    chain VARCHAR(50) NOT NULL,
    balance DOUBLE PRECISION DEFAULT 0,
    "totalProfit" DOUBLE PRECISION DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "Strategy" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    "minProfitThreshold" DOUBLE PRECISION NOT NULL,
    "maxSlippage" DOUBLE PRECISION NOT NULL,
    chains TEXT[],
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =====================================================
-- AUDIT & METRICS
-- =====================================================

CREATE TABLE "AuditLog" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50),
    "entityId" UUID,
    details JSONB,
    "userEmail" VARCHAR(255),
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"(action);

CREATE TABLE "Metric" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    labels JSONB,
    "recordedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX "Metric_name_idx" ON "Metric"(name);
CREATE INDEX "Metric_recordedAt_idx" ON "Metric"("recordedAt");

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default admin user (password: changeme123 - MUST CHANGE IN PRODUCTION)
INSERT INTO "User" (email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
VALUES ('admin@alphapro.io', '$2a$10$-placeholder-hash-for-admin', 'admin', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert default strategies
INSERT INTO "Strategy" (name, description, "minProfitThreshold", "maxSlippage", chains, "isActive", "createdAt", "updatedAt")
VALUES 
    ('LVR', 'Liquidity Revenue - Uniswap V3 LP arbitrage', 0.001, 0.01, ARRAY['ethereum', 'arbitrum'], true, NOW(), NOW()),
    ('Triangular', 'Triangular arbitrage across 3 pools', 0.002, 0.015, ARRAY['ethereum', 'polygon'], true, NOW(), NOW()),
    ('Sandwich', 'Sandwich attack on large swaps', 0.005, 0.02, ARRAY['ethereum'], true, NOW(), NOW()),
    ('Flash Loan', 'CrossDEX flash loan arbitrage', 0.003, 0.01, ARRAY['ethereum', 'arbitrum', 'optimism'], true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
