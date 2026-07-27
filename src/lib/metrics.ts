import { type Item } from '../db';

export const getItemLifespanYears = (item: Item) => {
  if (item.manualLifespanDays !== undefined) return Math.max(0.01, item.manualLifespanDays / 365);
  
  let lifespanYears = 1;
  const inUse = item.statusHistory.find(s => s.status === 'in_use');
  if (inUse) {
    const finished = item.statusHistory.find(s => s.status === 'finished');
    const endTimestamp = finished ? finished.timestamp : Date.now();
    lifespanYears = Math.max(0.01, (endTimestamp - inUse.timestamp) / (1000 * 60 * 60 * 24 * 365));
  } else {
    const finished = item.statusHistory.find(s => s.status === 'finished');
    if (finished) {
      const start = item.purchaseDate ? new Date(item.purchaseDate).getTime() : item.createdAt;
      lifespanYears = Math.max(0.01, (finished.timestamp - start) / (1000 * 60 * 60 * 24 * 365));
    }
  }
  return lifespanYears;
};

export const getEstimatedYearlyCost = (item: Item) => {
  if (!item.purchasePrice) return null;
  const lifespanYears = getItemLifespanYears(item);
  return item.purchasePrice / lifespanYears;
};

export const getEstimatedDaysLeft = (item: Item) => {
  if (!item.trackUsage || !item.usageLog || item.usageLog.length < 2) return null;

  // We need to find the rate of consumption
  // Usage log has timestamp and optional quantityUsed
  const logs = [...item.usageLog].sort((a, b) => a.timestamp - b.timestamp);
  
  const firstUse = logs[0];
  const lastUse = logs[logs.length - 1];
  const timeSpanDays = (lastUse.timestamp - firstUse.timestamp) / (1000 * 60 * 60 * 24);
  
  if (timeSpanDays <= 0) return null;

  // If quantity was tracked
  const hasQuantity = logs.some(l => l.quantityUsed != null);
  
  if (hasQuantity) {
    const totalConsumed = logs.reduce((sum, l) => sum + (l.quantityUsed || 0), 0);
    const ratePerDay = totalConsumed / timeSpanDays;
    
    // Remaining quantity = originalQuantity - totalConsumed (or if we have a current quantity)
    // Actually item doesn't have a dynamic 'currentQuantity', it just has originalQuantity
    const original = item.originalQuantity || 1;
    const remaining = original - totalConsumed;
    
    if (remaining <= 0) return 0;
    if (ratePerDay <= 0) return null;
    return remaining / ratePerDay;
  } else {
    // If no quantity tracked, we just count uses
    const uses = logs.length;
    const usesPerDay = (uses - 1) / timeSpanDays;
    
    const original = item.originalQuantity || 1; // e.g. 1 bottle, we assume 1 bottle has roughly X uses?
    // Wait, if no quantity is tracked, how do we know how many uses are in the item?
    // We don't. The best we can do if no quantity is tracked is estimate based on percentage if there's a manual quantity? 
    // If we only have usage dates without quantity, we can't easily predict 'empty' unless they entered the total uses.
    // For now, if no quantity is tracked, we can't accurately predict days left unless we assume an original total number of uses.
    // Let's assume if they don't provide quantity, we can't reliably predict Days Left without knowing total capacity.
    // Wait! The prompt says: "Calculate an estimated consumption rate (e.g. average days between uses, or average quantity consumed per week, depending on whether quantity was logged)."
    // If no quantity is tracked, maybe we just predict days between uses? But we still can't predict "days until empty".
    // I will return the days between uses and maybe the UI will just show that rate.
    // Let's just return a `null` for days left, but maybe we return the rate in a different function.
  }
  
  return null;
};

export const getUsageRateInfo = (item: Item) => {
  if (!item.trackUsage || !item.usageLog || item.usageLog.length < 2) return null;
  const logs = [...item.usageLog].sort((a, b) => a.timestamp - b.timestamp);
  const timeSpanDays = (logs[logs.length - 1].timestamp - logs[0].timestamp) / (1000 * 60 * 60 * 24);
  if (timeSpanDays <= 0) return null;

  const hasQuantity = logs.some(l => l.quantityUsed != null);
  if (hasQuantity) {
    const totalConsumed = logs.reduce((sum, l) => sum + (l.quantityUsed || 0), 0);
    const ratePerDay = totalConsumed / timeSpanDays;
    const remaining = (item.originalQuantity || 1) - totalConsumed;
    const daysLeft = remaining > 0 && ratePerDay > 0 ? remaining / ratePerDay : 0;
    
    return {
      type: 'quantity' as const,
      ratePerDay,
      daysLeft,
      totalConsumed,
      remaining
    };
  } else {
    const uses = logs.length;
    const daysBetweenUses = timeSpanDays / (uses - 1);
    
    return {
      type: 'frequency' as const,
      daysBetweenUses,
      uses
    };
  }
};
