document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.location.origin; // Assumes API is on same host

    // Element references
    const evolveBtn = document.getElementById('evolve-btn');
    const latencyMetricsEl = document.getElementById('latency-metrics');
    const competitorBenchmarkEl = document.getElementById('competitor-benchmark');
    const aiStateEl = document.getElementById('ai-state');
    const generationHistoryEl = document.getElementById('generation-history');

    const fetchData = async () => {
        try {
            const [latencyRes, benchmarkRes, aiRes, theoryRes] = await Promise.all([
                fetch(`${API_URL}/api/metrics/latency`),
                fetch(`${API_URL}/api/benchmark`),
                fetch(`${API_URL}/api/ai/optimizer`),
                fetch(`${API_URL}/api/brain/theoretical-max`).catch(() => ({ ok: false, json: async () => null }))
            ]);

            if (!latencyRes.ok || !benchmarkRes.ok || !aiRes.ok) {
                throw new Error('One or more API endpoints failed');
            }

            const latencyData = await latencyRes.json();
            renderLatency(latencyData);

            const benchmarkData = await benchmarkRes.json();
            renderCompetitors(benchmarkData);

            const aiData = await aiRes.json();
            let theoryData = null;
            if (theoryRes.ok) {
                theoryData = await theoryRes.json();
            }
            renderAIState(aiData, theoryData);

        } catch (error) {
            console.error("Failed to fetch data:", error);
            document.body.innerHTML = `<div style="padding: 2rem; text-align: center; color: #ef4444;">Failed to load dashboard data. Is the API service running and accessible?</div>`;
        }
    };

    function renderLatency(data) {
        if (!data || !latencyMetricsEl) return;
        latencyMetricsEl.innerHTML = Object.entries(data)
            .filter(([key]) => key !== 'lastUpdate')
            .map(([key, value]) => {
                const latencyValue = Number(value);
                const color = latencyValue > 200 ? 'red' : latencyValue > 50 ? 'yellow' : 'green';
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return `
                    <div class="metric-item">
                        <span>${formattedKey}</span>
                        <span class="value ${color}">${latencyValue.toFixed(2)} ms</span>
                    </div>
                `;
            }).join('');
    }

    function renderCompetitors(data) {
        if (!data || !competitorBenchmarkEl) return;
        const sortedData = data.sort((a, b) => a.rank - b.rank);
        competitorBenchmarkEl.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Name</th>
                        <th>Profit/Trade (ETH)</th>
                        <th>Velocity (Trades/Hr)</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedData.map(c => `
                        <tr class="${c.isAlphaPro ? 'alphapro' : ''}">
                            <td>${c.rank}</td>
                            <td>${c.name}</td>
                            <td class="green">${c.ppt.toFixed(4)}</td>
                            <td class="purple">${c.velocity}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function renderAIState(data, theoreticalMax) {
        if (!data || !aiStateEl) return;
        let theoreticalHtml = '';
        if (theoreticalMax && theoreticalMax.theoretical_max_ppt) {
            theoreticalHtml = `
                <div class="theoretical-max">
                    <h4>Theoretical Maximums (Oracle)</h4>
                    <div class="metrics-grid">
                        <div>
                            <div>Max PPT</div>
                            <div class="value">$${theoreticalMax.theoretical_max_ppt.toFixed(2)}</div>
                        </div>
                        <div>
                            <div>Max Velocity</div>
                            <div class="value">${theoreticalMax.theoretical_max_velocity.toFixed(0)}/hr</div>
                        </div>
                    </div>
                </div>
            `;
        }

        aiStateEl.innerHTML = `
            <div class="metrics-grid">
                <div>
                    <div>Generation</div>
                    <div class="value blue">${data.generation}</div>
                </div>
                <div>
                    <div>Best Fitness</div>
                    <div class="value green">${data.bestFitness.toFixed(4)}</div>
                </div>
            </div>
            ${theoreticalHtml}
        `;

        if (data.history && generationHistoryEl) {
            generationHistoryEl.innerHTML = data.history.slice().reverse().slice(0, 5).map(h => `
                <div class="metric-item">
                    <span>Gen ${h.generation}</span>
                    <span>Fitness: <span class="green">${h.fitness.toFixed(4)}</span></span>
                    <span class="source ${h.source === 'Self-Learning' ? 'blue' : 'purple'}">${h.source.split('-')[0]}</span>
                </div>
            `).join('');
        }
    }

    evolveBtn.addEventListener('click', async () => {
        evolveBtn.textContent = 'Evolving...';
        evolveBtn.disabled = true;
        try {
            await fetch(`${API_URL}/api/ai/optimizer/trigger`, { method: 'POST' });
            setTimeout(fetchData, 1500);
        } catch (error) {
            console.error("Failed to trigger optimization:", error);
        } finally {
            setTimeout(() => {
                evolveBtn.textContent = 'Evolve Now';
                evolveBtn.disabled = false;
            }, 1500);
        }
    });

    // Initial fetch and interval
    fetchData();
    setInterval(fetchData, 5000);
});