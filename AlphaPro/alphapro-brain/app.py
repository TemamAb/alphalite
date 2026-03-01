import time
import threading
import random
import logging
from flask import Flask, jsonify
from dataclasses import dataclass, asdict

# Setup Logging
logging.basicConfig(level=logging.INFO, format='[BRAIN] %(message)s')
logger = logging.getLogger("AlphaProBrain")

app = Flask(__name__)

@dataclass
class SystemConfig:
    risk_tolerance: float
    capital_velocity_tier: str
    max_loan_amount: int
    reinvestment_rate: float
    active_strategies: list

# Initial State
current_config = SystemConfig(
    risk_tolerance=0.5,
    capital_velocity_tier="Starter",
    max_loan_amount=10_000_000,
    reinvestment_rate=0.2,
    active_strategies=["LVR", "Triangular"]
)

def fetch_competitor_metrics():
    # Simulation of on-chain data scraping
    return {
        "VectorFinance": {"ppt": random.uniform(0.5, 2.5), "velocity": random.uniform(10, 500)},
        "QuantumLeap": {"ppt": random.uniform(1.0, 3.0), "velocity": random.uniform(50, 600)}
    }

def optimize_logic():
    global current_config
    while True:
        try:
            logger.info("Analyzing Competitor Landscape...")
            data = fetch_competitor_metrics()
            
            # Dominance Logic
            max_velocity = max(d['velocity'] for d in data.values())
            
            if max_velocity > 100:
                tier = "Market Maker"
                cap = 500_000_000
            elif max_velocity > 50:
                tier = "Institutional"
                cap = 100_000_000
            else:
                tier = "Growth"
                cap = 50_000_000

            current_config.capital_velocity_tier = tier
            current_config.max_loan_amount = cap
            
            logger.info(f"Optimization Complete. New Tier: {tier} | Cap: ${cap:,}")
        except Exception as e:
            logger.error(f"Optimization Error: {e}")
        
        time.sleep(30)

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify(asdict(current_config))

if __name__ == '__main__':
    # Start Optimization Loop in Background
    t = threading.Thread(target=optimize_logic, daemon=True)
    t.start()
    app.run(host='0.0.0.0', port=5000)
