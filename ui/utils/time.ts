/**
 HH:MM:ss.mmm
 */
export function showTime(timestamp){
    return new Date(timestamp).toLocaleTimeString(undefined, {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'}) +
    '.' +
    String(new Date(timestamp).getMilliseconds()).padStart(3, '0')
}