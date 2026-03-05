import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  TrendingUp,
  Wallet,
  Settings,
  AlertCircle,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface CopilotAction {
  icon: React.ReactNode;
  label: string;
  description: string;
  action: () => void;
}

const quickActions: CopilotAction[] = [
  {
    icon: <TrendingUp className="w-5 h-5" />,
    label: 'Analyze Profits',
    description: 'Get detailed profit analysis',
    action: () => {},
  },
  {
    icon: <Wallet className="w-5 h-5" />,
    label: 'Check Wallet',
    description: 'View wallet balances',
    action: () => {},
  },
  {
    icon: <Zap className="w-5 h-5" />,
    label: 'Optimize Gas',
    description: 'Find optimal gas prices',
    action: () => {},
  },
  {
    icon: <Settings className="w-5 h-5" />,
    label: 'Tune Strategy',
    description: 'Adjust strategy parameters',
    action: () => {},
  },
];

export default function AlphaCopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Alpha Copilot, your AI trading assistant. I can help you with:\n\n• Profit analysis and optimization\n• Wallet balance monitoring\n• Gas price optimization\n• Strategy tuning and recommendations\n• Market insights and alerts\n\nHow can I help you today?',
      timestamp: new Date(),
      suggestions: [
        'Show me today\'s profit',
        'What\'s my wallet balance?',
        'Optimize gas settings',
        'Analyze my strategies',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setShowActions(false);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(input);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): Message => {
    const lowerInput = userInput.toLowerCase();
    let content = '';
    let suggestions: string[] = [];

    if (lowerInput.includes('profit') || lowerInput.includes('make money')) {
      content = `📊 **Profit Analysis**

Based on your trading activity:

• **Today's Profit**: $1,247.50
• **Win Rate**: 65.5%
• **Best Strategy**: MEV Arbitrage (72.5% win rate)
• **Gas Costs**: $89.20

**Recommendations:**
1. Consider increasing MEV Arbitrage allocation
2. Current gas prices are optimal for small trades
3. Your triangle arbitrage needs parameter tuning

Would you like me to dive deeper into any of these?`;
      suggestions = [
        'Show detailed breakdown',
        'Compare with yesterday',
        'Optimize strategy allocation',
      ];
    } else if (lowerInput.includes('wallet') || lowerInput.includes('balance')) {
      content = `💰 **Wallet Status**

• **Primary Wallet**: 12.45 ETH ($28,012.50)
• **Smart Contract**: 2.15 ETH ($4,837.50)
• **Total**: 14.60 ETH ($32,850.00)

**Gas Token Balance:**
• ETH: 14.60 ETH
• USDC: $5,000.00

Your wallets are well-funded for the next 30 days of trading.`;
      suggestions = [
        'Add more funds',
        'Withdraw profits',
        'Check transaction history',
      ];
    } else if (lowerInput.includes('gas') || lowerInput.includes('fee')) {
      content = `⛽ **Gas Optimization**

Current Network Status:
• **Base Fee**: 25 Gwei
• **Priority Fee**: 2 Gwei
• **Total**: 27 Gwei

**Recommendations:**
• ✅ Current gas is good for transactions < $500
• ⚠️ Wait for large trades (> $5000)
• 📈 Consider batching small trades

Estimated confirmation time: 12-15 seconds`;
      suggestions = [
        'Set gas alert',
        'Schedule trades',
        'Compare networks',
      ];
    } else if (lowerInput.includes('strategy') || lowerInput.includes('trade')) {
      content = `🎯 **Strategy Performance**

| Strategy | Profit | Win Rate | Status |
|----------|--------|----------|--------|
| MEV Arbitrage | $4,250 | 72.5% | 🟢 Active |
| Liquidity Sweep | $2,180 | 65.2% | 🟢 Active |
| Triangle Arbitrage | $1,520 | 58.9% | 🟡 Needs tuning |
| Cross-DEX | $980 | 61.4% | 🟢 Active |
| Flash Loan | $750 | 82.6% | 🟢 Active |

**AI Recommendation**: Triangle arbitrage parameters need adjustment to improve win rate.`;
      suggestions = [
        'Tune triangle arbitrage',
        'Increase MEV allocation',
        'Add new strategy',
      ];
    } else {
      content = `🤖 **Alpha Copilot**

I understand you're asking about: "${userInput}"

I can help you with:
• 📊 Profit and performance analysis
• 💰 Wallet and balance monitoring  
• ⛽ Gas optimization and scheduling
• 🎯 Strategy tuning and recommendations
• 🚨 Alerts and anomaly detection

Please try asking in a different way, or select a quick action below.`;
      suggestions = [
        'Show profits',
        'Check wallet',
        'Optimize gas',
        'Analyze strategies',
      ];
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions,
    };
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => handleSend(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Alpha Copilot</h2>
          <p className="text-slate-400">AI-powered trading assistant</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 rounded-lg">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 text-sm">AI Online</span>
        </div>
      </div>

      {/* Quick Actions */}
      {showActions && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className="flex flex-col items-center gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-700/50 hover:border-cyan-500/30 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                {action.icon}
              </div>
              <span className="text-white text-sm font-medium">{action.label}</span>
              <span className="text-slate-500 text-xs">{action.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 flex flex-col bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-700/50 text-slate-100'
                } rounded-xl p-4`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-400 text-xs font-medium">Alpha Copilot</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-600/30">
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs px-3 py-1.5 bg-slate-600/30 hover:bg-slate-600/50 rounded-lg text-slate-300 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs opacity-50 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 text-xs font-medium">Alpha Copilot</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Alpha Copilot..."
              className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-4 py-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <AlertCircle className="w-4 h-4" />
        <span>Try: "Show profits", "Check wallet", "Optimize gas", "Analyze strategies"</span>
      </div>
    </div>
  );
}
