export const formatRelativeTime = (date: Date, now = new Date()) => {
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSeconds < 10) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
};

export const minutesUntil = (date: Date, now = new Date()) =>
  Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 60000));

export const isExpired = (date: Date, now = new Date()) =>
  date.getTime() <= now.getTime();
