--
-- AlphaPro Database Schema
-- This schema supports all logging and analytics requirements for Protocols 1-12.
--

-- Stores global system settings controlled by the dashboard sliders and AI
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    reinvestment_rate DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    capital_velocity_cap BIGINT NOT NULL DEFAULT 10000000, -- $10M
    auto_transfer_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    transfer_threshold DECIMAL(18, 8) NOT NULL DEFAULT 5.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stores all managed wallets from the dashboard
CREATE TABLE IF NOT EXISTS wallets (
    address VARCHAR(42) PRIMARY KEY,
    chain_id INT NOT NULL,
    provider VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'VALID', -- VALID, INVALID
    balance DECIMAL(30, 18) NOT NULL DEFAULT 0,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- The primary log for all trading activity, both paper and live
CREATE TABLE IF NOT EXISTS trades (
    id BIGSERIAL PRIMARY KEY,
    mode VARCHAR(10) NOT NULL, -- 'PAPER' or 'LIVE'
    strategy VARCHAR(50) NOT NULL,
    dex VARCHAR(50),
    chain VARCHAR(50) NOT NULL,
    pair VARCHAR(100),
    profit_eth DECIMAL(30, 18) NOT NULL,
    gas_cost_usd DECIMAL(10, 2),
    latency_ms INT,
    tx_hash VARCHAR(66) UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades (strategy);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades (timestamp);

-- Stores competitor metrics over time for the Oracle to analyze
CREATE TABLE IF NOT EXISTS benchmarks (
    id SERIAL PRIMARY KEY,
    competitor_name VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- PPT, WIN_RATE, VELOCITY
    value DECIMAL(18, 4) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Logs decisions from each AI agent for debugging and training
CREATE TABLE IF NOT EXISTS agent_logs (
    id BIGSERIAL PRIMARY KEY,
    agent_name VARCHAR(50) NOT NULL, -- 'Hunter', 'Sentinel', 'Oracle', etc.
    decision VARCHAR(100) NOT NULL, -- 'VETOED', 'OPPORTUNITY_FOUND', 'PARAMETER_CHANGE'
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initialize with default settings
INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;