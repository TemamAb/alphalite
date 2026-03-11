import { useState } from 'react';

const Settings = () => {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:3000');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('api_url', apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-300">
            API URL
          </label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-indigo-500"
            placeholder="https://your-api-url.onrender.com"
          />
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
        >
          Save Settings
        </button>

        {saved && (
          <span className="ml-4 text-green-400">Settings saved!</span>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mt-6">
        <h2 className="text-xl font-semibold mb-4">About</h2>
        <p className="text-gray-300">
          AlphaPro Dashboard v1.0.0<br />
          AI-Powered Trading Optimization Platform
        </p>
      </div>
    </div>
  );
};

export default Settings;
