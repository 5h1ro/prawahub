// Helpers to resolve WhatsApp ids (c.us / lid / g.us / newsletter / status)
// into human-friendly name + phone number, using the contacts list.

export interface WaContact {
    id?: string;
    number?: string;
    name?: string;
    pushname?: string;
    shortName?: string;
    lid?: string;
    isMe?: boolean;
    isGroup?: boolean;
}

export interface ContactIndex {
    byId: Record<string, WaContact>;
    byUser: Record<string, WaContact>;
    byLid: Record<string, WaContact>;
    all: WaContact[];
}

function userPart(id?: string): string {
    if (!id) return "";
    return String(id).split("@")[0].split(":")[0];
}

export function buildContactIndex(contacts: any[]): ContactIndex {
    const byId: Record<string, WaContact> = {};
    const byUser: Record<string, WaContact> = {};
    const byLid: Record<string, WaContact> = {};
    const all: WaContact[] = Array.isArray(contacts) ? contacts : [];
    for (const c of all) {
        if (!c) continue;
        if (c.id) byId[c.id] = c;
        const u = userPart(c.id);
        if (u) byUser[u] = c;
        if (c.lid) {
            byLid[c.lid] = c;
            byLid[userPart(c.lid)] = c;
        }
    }
    return {byId, byUser, byLid, all};
}

export function isStatusBroadcast(id?: string): boolean {
    return !!id && String(id).startsWith("status@");
}

export function isNewsletter(id?: string): boolean {
    return !!id && String(id).includes("@newsletter");
}

export function isGroup(id?: string): boolean {
    return !!id && String(id).includes("@g.us");
}

export function isLid(id?: string): boolean {
    return !!id && String(id).includes("@lid");
}

function formatNumber(digits: string): string {
    if (!digits) return "";
    return /^[0-9]+$/.test(digits) ? `+${digits}` : digits;
}

export interface ResolvedContact {
    name: string;   // best display name
    number: string; // phone number ("+123..") or "" when unknown (e.g. lid)
    id: string;
}

// Resolve an id to {name, number}. Falls back gracefully for lid ids.
export function resolveContact(index: ContactIndex | null, id?: string): ResolvedContact {
    const raw = id || "";
    const u = userPart(raw);
    let c: WaContact | undefined;
    if (index) {
        c = index.byId[raw]
            || (isLid(raw) ? (index.byLid[raw] || index.byLid[u]) : undefined)
            || index.byUser[u];
    }
    const name =
        c?.name || c?.pushname || c?.shortName || "";
    let number = c?.number ? formatNumber(userPart(c.number)) : "";
    if (!number && !isLid(raw) && /^[0-9]+$/.test(u)) {
        number = formatNumber(u);
    }
    return {
        name: name || (number || (isLid(raw) ? "Unknown" : u)),
        number,
        id: raw,
    };
}
