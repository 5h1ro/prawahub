// WAHA returns media URLs built from its own base (often http://localhost:3000).
// Rewrite them onto the server connection URL so the browser can actually fetch
// them (and to avoid mixed-content when the dashboard is served over HTTPS).
export function resolveMediaUrl(rawUrl?: string, connectionUrl?: string): string | undefined {
    if (!rawUrl) return rawUrl;
    if (!connectionUrl) return rawUrl;
    const base = String(connectionUrl).replace(/\/+$/, "");
    try {
        const u = new URL(rawUrl);
        return `${base}${u.pathname}${u.search}`;
    } catch (e) {
        // relative url already
        const path = String(rawUrl).startsWith("/") ? rawUrl : `/${rawUrl}`;
        return `${base}${path}`;
    }
}
