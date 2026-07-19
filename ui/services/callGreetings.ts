// Persistent library of mp3 "greetings" used to answer incoming calls with
// audio. Blobs are stored in IndexedDB (localStorage can't hold audio), so the
// clips survive reloads and can be swapped per call.

const DB_NAME = "prawahub-call-greetings";
const STORE = "greetings";

export interface Greeting {
    id: string;
    name: string;
    size: number;
    createdAt: number;
    blob: Blob;
}

export type GreetingMeta = Omit<Greeting, "blob">;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, {keyPath: "id"});
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction(STORE, mode).objectStore(STORE);
}

function toMeta(g: Greeting): GreetingMeta {
    return {id: g.id, name: g.name, size: g.size, createdAt: g.createdAt};
}

// List saved clips (metadata only), newest first.
export async function listGreetings(): Promise<GreetingMeta[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const out: GreetingMeta[] = [];
        const cursor = tx(db, "readonly").openCursor();
        cursor.onsuccess = () => {
            const c = cursor.result;
            if (c) {
                out.push(toMeta(c.value as Greeting));
                c.continue();
            } else {
                out.sort((a, b) => b.createdAt - a.createdAt);
                resolve(out);
            }
        };
        cursor.onerror = () => reject(cursor.error);
    });
}

export async function addGreeting(file: File): Promise<GreetingMeta> {
    const db = await openDB();
    const g: Greeting = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name.replace(/\.[^.]+$/, "") || file.name,
        size: file.size,
        createdAt: Date.now(),
        blob: file,
    };
    return new Promise((resolve, reject) => {
        const req = tx(db, "readwrite").add(g);
        req.onsuccess = () => resolve(toMeta(g));
        req.onerror = () => reject(req.error);
    });
}

export async function removeGreeting(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const req = tx(db, "readwrite").delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// Load the decoded bytes of a clip, ready to feed into the call.
export async function getGreetingBuffer(id: string): Promise<ArrayBuffer> {
    const db = await openDB();
    const g = await new Promise<Greeting | undefined>((resolve, reject) => {
        const req = tx(db, "readonly").get(id);
        req.onsuccess = () => resolve(req.result as Greeting | undefined);
        req.onerror = () => reject(req.error);
    });
    if (!g) throw new Error("Greeting not found");
    return g.blob.arrayBuffer();
}
