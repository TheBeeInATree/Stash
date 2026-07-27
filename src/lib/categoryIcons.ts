export function getCategoryIcon(name: string, customIcon?: string): string {
  if (customIcon) return customIcon;
  
  const lower = name.toLowerCase();
  if (lower.includes('food') || lower.includes('ingredient')) return '🍎';
  if (lower.includes('toiletries') || lower.includes('bathroom')) return '🪥';
  if (lower.includes('medicine') || lower.includes('health')) return '💊';
  if (lower.includes('clothing') || lower.includes('apparel')) return '👕';
  if (lower.includes('electronics') || lower.includes('tech')) return '💻';
  if (lower.includes('tool') || lower.includes('hardware')) return '🔨';
  if (lower.includes('book') || lower.includes('reading')) return '📚';
  
  return '📦';
}
