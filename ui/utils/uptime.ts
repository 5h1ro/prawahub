/**
 * Convert millisecond in uptime format
 * 00:00:00 - if <1 day
 * 00:00:00 1 day - if == 1 day
 * 00:00:00 N day - if > 1 day
 */
export function formatUptime(ms: number) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor(ms / 3600000) % 24;
    const minutes = Math.floor(ms / 60000) % 60;
    const seconds = Math.floor(ms / 1000) % 60;
    const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    if (days === 0) return clock;
    if (days === 1) return `${clock} 1 day`;
    return `${clock} ${days} days`;
}
