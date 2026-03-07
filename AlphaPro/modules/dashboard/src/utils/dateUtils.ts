// Date utility functions for AlphaPro Dashboard

/**
 * Format day as operational day count
 * - Row 1: Today
 * - Row 2+: Day N where N counts down from (totalDays-1) to 1
 * 
 * Example (7 days total):
 * - Row 1: Today
 * - Row 2: Day 6
 * - Row 3: Day 5
 * - Row 4: Day 4
 * - Row 5: Day 3
 * - Row 6: Day 2
 * - Row 7: Day 1
 */
export const formatDayRow = (dayIndex: number, totalDays: number = 7): string => {
  if (dayIndex === 0) return 'Today';
  // Count down: dayIndex 1 = Day 6, dayIndex 2 = Day 5, etc.
  const dayNumber = totalDays - dayIndex;
  return `Day ${dayNumber}`;
};

/**
 * Generate array of day labels for the table
 * Default order: Today, Day 6, Day 5, Day 4, Day 3, Day 2, Day 1
 */
export const generateDateRange = (days: number = 7): string[] => {
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    result.push(formatDayRow(i, days));
  }
  return result;
};

/**
 * Sort data by date in descending order (newest first)
 */
export const sortByDateDesc = <T extends { date?: string; timestamp?: string; day?: string }>(
  data: T[]
): T[] => {
  return [...data].sort((a, b) => {
    const dateA = new Date(a.date || a.timestamp || 0).getTime();
    const dateB = new Date(b.date || b.timestamp || 0).getTime();
    return dateB - dateA;
  });
};

/**
 * Generate mock profit data by operational day
 * Default order: Today, Day 6, Day 5, Day 4, Day 3, Day 2, Day 1
 */
export const generateProfitDataByDay = (totalDays: number = 7) => {
  const data = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const daysAgo = i;
    // More recent days = more profit (index 0 = today = most profit)
    const baseProfit = 2500 - (daysAgo * 150);
    const baseTrades = 15 - daysAgo;
    const variance = Math.random() * 500 - 250;
    
    data.push({
      day: formatDayRow(i, totalDays),
      dayIndex: i,
      date: d.toISOString(),
      profitPerTrade: +(baseProfit / baseTrades).toFixed(2),
      tradesPerHour: +(baseTrades * 0.8).toFixed(1),
      profitPerHour: +(baseProfit / 24).toFixed(2),
      todayProfit: +(baseProfit + variance).toFixed(2),
      gasFees: +(100 + daysAgo * 10).toFixed(2),
      capitalVelocity: +(2.5 + (Math.random() * 0.5)).toFixed(2),
    });
  }
  return data;
};

/**
 * Generate mock latency data by day
 * Default order: Today, Day 6, Day 5, Day 4, Day 3, Day 2, Day 1
 */
export const generateLatencyDataByDay = (totalDays: number = 7) => {
  const data = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const daysAgo = i;
    
    // Latency values decrease as we get closer to today (more optimized)
    const baseCache = 0.3 + (daysAgo * 0.05);
    const baseApi = 42 + (daysAgo * 3);
    const baseBlock = 85 + (daysAgo * 5);
    const baseExec = 180 + (daysAgo * 10);
    const baseExternal = 350 + (daysAgo * 20);
    
    data.push({
      day: formatDayRow(i, totalDays),
      dayIndex: i,
      date: d.toISOString(),
      cacheLookup: +(baseCache + Math.random() * 0.2).toFixed(2),
      apiHotPath: +(baseApi + Math.random() * 5).toFixed(0),
      blockDetection: +(baseBlock + Math.random() * 15).toFixed(0),
      executionPath: +(baseExec + Math.random() * 30).toFixed(0),
      externalFetch: +(baseExternal + Math.random() * 50).toFixed(0),
    });
  }
  return data;
};

/**
 * Generate mock bribe data by day
 * Default order: Today, Day 6, Day 5, Day 4, Day 3, Day 2, Day 1
 */
export const generateBribeDataByDay = (totalDays: number = 7) => {
  const data = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const daysAgo = i;
    
    // More recent days = higher bribe amounts and better success
    const baseAmount = 0.15 - (daysAgo * 0.01);
    const baseSuccess = 92 - (daysAgo * 2);
    const baseRoi = 145 - (daysAgo * 5);
    const baseTotal = 12 - daysAgo;
    
    data.push({
      day: formatDayRow(i, totalDays),
      dayIndex: i,
      date: d.toISOString(),
      bribeAmount: +(baseAmount + Math.random() * 0.05).toFixed(4),
      successRate: +(baseSuccess + Math.random() * 3).toFixed(1),
      roi: +(baseRoi + Math.random() * 10).toFixed(1),
      totalPaid: +(baseTotal + Math.random() * 2).toFixed(2),
    });
  }
  return data;
};

/**
 * Format currency for display
 */
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format ETH for display
 */
export const formatEth = (value: number): string => {
  return `${value.toFixed(4)} ETH`;
};

/**
 * Format ms (milliseconds) for display
 */
export const formatMs = (value: number): string => {
  return `${value.toFixed(0)} ms`;
};

/**
 * Format percentage for display
 */
export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};
