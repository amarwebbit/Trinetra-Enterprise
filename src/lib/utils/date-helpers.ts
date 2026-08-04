export function formatDateForURL(date: Date): string {
  // Returns YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

export function getDateRangeFromPreset(preset: string): { startDate?: string; endDate?: string } {
  const today = new Date();
  
  if (preset === 'today') {
    return {
      startDate: formatDateForURL(today),
      endDate: formatDateForURL(today)
    };
  }
  
  if (preset === '7days') {
    const start = new Date();
    start.setDate(today.getDate() - 7);
    return {
      startDate: formatDateForURL(start),
      endDate: formatDateForURL(today)
    };
  }
  
  if (preset === 'this_month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      startDate: formatDateForURL(start),
      endDate: formatDateForURL(today)
    };
  }
  
  return {};
}
