// TradingView.tsx - Trading chart component
import { useState, useEffect } from 'react';

interface TradingPair {
  base: string;
  quote: string;
}

interface PriceData {
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
}

export default function TradingView({ pair }: { pair: TradingPair }) {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`/api/market/${pair.base}-${pair.quote}`);
        const data = await response.json();
        setPriceData(data);
      } catch (error) {
        console.error('Failed to fetch price:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [pair]);

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {pair.base}/{pair.quote}
        </h3>
        <span className={`text-sm ${priceData?.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {priceData?.change24h >= 0 ? '+' : ''}{priceData?.change24h.toFixed(2)}%
        </span>
      </div>

      <div className="text-3xl font-bold text-white mb-4">
        ${priceData?.price.toFixed(2)}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-400">24h High</span>
          <div className="text-white">${priceData?.high24h.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-slate-400">24h Low</span>
          <div className="text-white">${priceData?.low24h.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-slate-400">24h Volume</span>
          <div className="text-white">${priceData?.volume24h.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
