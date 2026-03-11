import { useState } from 'react';
import { useDashboardStore } from '@/stores';
import { Save, CheckCircle, Globe, Coins, ShieldCheck } from 'lucide-react';

const Settings = () => {
  const {
    currency,
    setCurrency,
    withdrawalMode,
    setWithdrawalMode
  } = useDashboardStore();

  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:3000');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('api_url', apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">System Settings</h1>
          <p className="text-slate-400">Configure your AlphaPro deployment parameters</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20 font-medium"
        >
          <Save className="w-4 h-4" />
          Save All Changes
        </button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 rounded-lg animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" />
          Settings successfully synchronized with local storage.
        </div>
      )}

      {/* API Configuration */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex items-center gap-2 text-slate-200 font-semibold">
          <Globe className="w-4 h-4 text-sky-400" />
          Network & API
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium mb-2 text-slate-400">
            API Core Service Discovery URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm"
              placeholder="http://localhost:3000"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            This URL points to the AlphaPro backend orchestration layer. Default is localhost for Docker environments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Currency Display Toggle */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex items-center gap-2 text-slate-200 font-semibold">
            <Coins className="w-4 h-4 text-emerald-400" />
            Reporting Currency
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between p-1 bg-slate-900/50 rounded-lg border border-slate-700">
              <button
                onClick={() => setCurrency('USD')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${currency === 'USD'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('ETH')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${currency === 'ETH'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                ETH (Ξ)
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Choose the base currency for all dashboard profit and balance calculations.
            </p>
          </div>
        </div>

        {/* Withdrawal Mode Selection */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex items-center gap-2 text-slate-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Profit Management Mode
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 p-3 bg-slate-900/30 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-900/50 transition-colors">
                <input
                  type="radio"
                  name="withdrawalMode"
                  checked={withdrawalMode === 'manual'}
                  onChange={() => setWithdrawalMode('manual')}
                  className="w-4 h-4 text-indigo-600 bg-slate-700 border-slate-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-200">Manual Withdrawal</div>
                  <div className="text-xs text-slate-500">Profits accumulate in secure smart wallet. Manual admin claim required.</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-900/30 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-900/50 transition-colors opacity-50">
                <input
                  type="radio"
                  name="withdrawalMode"
                  checked={withdrawalMode === 'auto'}
                  onChange={() => setWithdrawalMode('auto')}
                  className="w-4 h-4 text-indigo-600 bg-slate-700 border-slate-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-200">Auto-Sweep (Coming Soon)</div>
                  <div className="text-xs text-slate-500">Automatically move profits to cold storage wallet after every 1 ETH profit.</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2 text-slate-200">Audit & Compliance</h2>
        <p className="text-sm text-slate-400 mb-4">
          AlphaPro is currently in Audit Verification Phase. All settings are locked to high-security defaults to ensure production readiness.
        </p>
        <div className="flex gap-4">
          <div className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400">
            AUDIT_MODE: ACTIVE
          </div>
          <div className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400">
            VERIFICATION_ID: v2.2.0-ELITE
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
