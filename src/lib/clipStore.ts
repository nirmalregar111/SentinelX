/**
 * Local persistence for evidence clips.
 * Blobs → IndexedDB (survives page refresh, same origin).
 * Metadata → localStorage (JSON, survives page refresh).
 */

const DB_NAME = "sentinelx";
const BLOB_STORE = "clips";
const DB_VERSION = 1;
const LS_KEY = "sentinelx_evidence";
const MAX_ITEMS = 200;

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(BLOB_STORE);
    };
    req.onsuccess = () => { _db = req.result; resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, "readwrite");
    tx.objectStore(BLOB_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, "readonly");
      const req = tx.objectStore(BLOB_STORE).get(id);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// Returns a blob: URL for playback, or null if not found
export async function getBlobUrl(id: string): Promise<string | null> {
  const blob = await loadBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(BLOB_STORE, "readwrite");
      tx.objectStore(BLOB_STORE).delete(id);
      tx.oncomplete = () => resolve();
    });
  } catch { /* ignore */ }
}

// ── Evidence metadata (localStorage) ─────────────────────────────────────────

export interface LocalEvidence {
  id: string;           // EVD-local-timestamp
  incidentId: string;
  cameraId: string;
  cameraName: string;
  zoneId: string;
  zoneName: string;
  eventType: string;
  severity: string;
  confidence: number;
  detectedAt: string;
  duration: number;
  hasBlob: boolean;     // true if a blob is saved in IndexedDB under this id
  createdAt: string;
}

export function loadLocalEvidence(): LocalEvidence[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as LocalEvidence[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalEvidence(items: LocalEvidence[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch { /* ignore storage quota */ }
}

export function pushLocalEvidence(item: LocalEvidence): void {
  const existing = loadLocalEvidence();
  saveLocalEvidence([item, ...existing]);
}

export function deleteLocalEvidence(id: string): void {
  const existing = loadLocalEvidence().filter(e => e.id !== id);
  saveLocalEvidence(existing);
  deleteBlob(id);
}
