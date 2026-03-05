import { useState, useEffect, useRef } from 'react';
import {
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Zap,
  Filter,
  Hexagon,
} from 'lucide-react';

interface BlockData {
  number: number;
  hash: string;
  timestamp: number;
  transactions: number;
  gasUsed: string;
  miner: string;
}

interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

type StreamFilter = 'all' | 'blocks' | 'transactions';

export default function BlockchainStream() {
  const [streamFilter, setStreamFilter] = useState<StreamFilter>('all');
  const [isStreaming, setIsStreaming] = useState(true);
  const [latestBlock, setLatestBlock] = useState<BlockData | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<BlockData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionData[]>([]);
  const [streamStats, setStreamStats] = useState({
    blocksPerMinute: 0,
    tps: 0,
    avgGasPrice: 0,
    totalValue: 0,
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulate blockchain streaming
  useEffect(() => {
    if (!isStreaming) return;

    // Generate initial block
    const generateBlock = (): BlockData => ({
      number: Math.floor(Math.random() * 1000000) + 19000000,
      hash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: Date.now(),
      transactions: Math.floor(Math.random() * 200) + 50,
      gasUsed: (Math.floor(Math.random() * 15000000) + 5000000).toString(),
      miner: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    });

    const generateTransaction = (): TransactionData => ({
      hash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      from: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      to: '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      value: (Math.random() * 10).toFixed(4),
      gasPrice: (Math.random() * 100).toFixed(2),
      timestamp: Date.now(),
      status: Math.random() > 0.1 ? 'confirmed' : 'pending',
    });

    // Initial data
    const initialBlocks = Array.from({ length: 10 }, generateBlock);
    setRecentBlocks(initialBlocks);
    setLatestBlock(initialBlocks[0]);

    const initialTxs = Array.from({ length: 20 }, generateTransaction);
    setRecentTransactions(initialTxs);

    // Update stats
    setStreamStats({
      blocksPerMinute: 12 + Math.random() * 2,
      tps: Math.floor(Math.random() * 30) + 15,
      avgGasPrice: Math.floor(Math.random() * 50) + 20,
      totalValue: Math.random() * 10000,
    });

    // Stream new blocks periodically
    const blockInterval = setInterval(() => {
      const newBlock = generateBlock();
      setLatestBlock(newBlock);
      setRecentBlocks(prev => [newBlock, ...prev.slice(0, 9)]);
      
      // Add some transactions with the new block
      const newTxs = Array.from({ length: Math.floor(Math.random() * 10) + 1 }, generateTransaction);
      setRecentTransactions(prev => [...newTxs, ...prev].slice(0, 50));
      
      setStreamStats(prev => ({
        ...prev,
        totalValue: prev.totalValue + Math.random() * 1000,
      }));
    }, 12000); // New block every ~12 seconds

    // Stream transactions more frequently
    const txInterval = setInterval(() => {
      if (Math.random() > 0.5) {
        const newTx = generateTransaction();
        setRecentTransactions(prev => [newTx, ...prev].slice(0, 50));
      }
    }, 500);

    return () => {
      clearInterval(blockInterval);
      clearInterval(txInterval);
    };
  }, [isStreaming]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Blockchain Stream</h2>
          <p className="text-slate-400">Real-time blockchain data and transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isStreaming 
                ? 'bg-green-500 text-white' 
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            <Zap className={`w-4 h-4 ${isStreaming ? 'animate-pulse' : ''}`} />
            {isStreaming ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Stream Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 text-sm">Latest Block</span>
          </div>
          <div className="text-xl font-bold text-white">
            #{latestBlock?.number.toLocaleString() || '---'}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400 text-sm">TPS</span>
          </div>
          <div className="text-xl font-bold text-white">
            {streamStats.tps}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 text-sm">Avg Gas</span>
          </div>
          <div className="text-xl font-bold text-white">
            {streamStats.avgGasPrice} <span className="text-sm text-slate-400">Gwei</span>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-green-400" />
            <span className="text-slate-400 text-sm">Blocks/Min</span>
          </div>
          <div className="text-xl font-bold text-white">
            {streamStats.blocksPerMinute.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStreamFilter('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            streamFilter === 'all'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          All
        </button>
        <button
          onClick={() => setStreamFilter('blocks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            streamFilter === 'blocks'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Blocks
        </button>
        <button
          onClick={() => setStreamFilter('transactions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            streamFilter === 'transactions'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Hexagon className="w-4 h-4" />
          Transactions
        </button>
      </div>

      {/* Stream Feed */}
      <div 
        ref={scrollRef}
        className="bg-slate-900/50 rounded-xl border border-slate-700/50 max-h-[600px] overflow-y-auto"
      >
        {/* Blocks */}
        {(streamFilter === 'all' || streamFilter === 'blocks') && recentBlocks.map((block, index) => (
          <div 
            key={`block-${block.number}`}
            className={`p-4 border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors ${
              index === 0 && isStreaming ? 'animate-pulse bg-cyan-500/5' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Boxes className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Block #{block.number.toLocaleString()}</span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatHash(block.hash)} • {formatTime(block.timestamp)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">{block.transactions} txns</div>
                <div className="text-xs text-slate-500">
                  Gas: {(parseInt(block.gasUsed) / 15000000 * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Transactions */}
        {(streamFilter === 'all' || streamFilter === 'transactions') && recentTransactions.map((tx, index) => (
          <div 
            key={`tx-${tx.hash}`}
            className={`p-4 border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors ${
              index < 3 && isStreaming ? 'animate-pulse bg-green-500/5' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  tx.status === 'confirmed' ? 'bg-green-500/20' : 
                  tx.status === 'pending' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                }`}>
                  <Hexagon className={`w-5 h-5 ${
                    tx.status === 'confirmed' ? 'text-green-400' : 
                    tx.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{formatHash(tx.hash)}</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 
                      tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      {formatAddress(tx.from)}
                    </span>
                    <span>→</span>
                    <span className="flex items-center gap-1">
                      <ArrowDownLeft className="w-3 h-3" />
                      {formatAddress(tx.to)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">{tx.value} ETH</div>
                <div className="text-xs text-slate-500">
                  Gas: {tx.gasPrice} Gwei
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
