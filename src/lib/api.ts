/**
 * SentinelX API service layer.
 * All data flows through Supabase (anon key only — no server-side secrets exposed).
 * KV table: kv_store_3d5271d2
 * Storage bucket: sentinelx-clips
 */
import { supabase, SUPABASE_URL, BUCKET, ANON_KEY, EDGE_BASE } from "./supabase";
import type {
  Camera, Zone, Person, Incident, Evidence, Environment,
  IncidentStatus, EvidenceStatus, Severity, EventType,
} from "./types";

export type { Camera, Zone, Person, Incident, Evidence, Environment };

// ── KV helpers ────────────────────────────────────────────────────────────────
const TABLE = "kv_store_3d5271d2";

async function kvGet<T>(key: string): Promise<T | null> {
  const { data } = await supabase.from(TABLE).select("value").eq("key", key).maybeSingle();
  return (data?.value ?? null) as T | null;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert({ key, value });
  if (error) throw new Error(`kvSet(${key}): ${error.message}`);
}

async function kvDel(key: string): Promise<void> {
  await supabase.from(TABLE).delete().eq("key", key);
}

async function kvMget<T>(keys: string[]): Promise<T[]> {
  if (!keys.length) return [];
  const { data } = await supabase.from(TABLE).select("key, value").in("key", keys);
  if (!data) return [];
  const map = new Map(data.map(r => [r.key, r.value]));
  return keys.map(k => map.get(k)).filter(Boolean) as T[];
}

// ── Sequence helpers (auto-increment IDs) ─────────────────────────────────────
async function nextSeq(seqKey: string, prefix: string, pad = 4): Promise<string> {
  const cur: number = (await kvGet<number>(seqKey)) ?? 0;
  const next = cur + 1;
  await kvSet(seqKey, next);
  return `${prefix}${String(next).padStart(pad, "0")}`;
}

// ── Storage upload via edge function signed URL ───────────────────────────────
// The anon key cannot write to Supabase Storage directly (RLS blocks it).
// The edge function uses the service role key to create a signed upload URL,
// then the browser PUTs the blob directly to that URL — no secrets exposed.
export async function uploadClip(blob: Blob, camId: string, isoTs: string): Promise<string | null> {
  try {
    const filename = `${camId}/${isoTs.replace(/[:.]/g, "-")}.webm`;

    // 1. Ask edge function for a signed upload URL (uses service role server-side)
    const urlRes = await fetch(`${EDGE_BASE}/upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ filename }),
    });

    if (!urlRes.ok) {
      const txt = await urlRes.text().catch(() => urlRes.status.toString());
      console.error("upload-url error:", txt);
      return null;
    }

    const { signedUrl } = await urlRes.json();
    if (!signedUrl) { console.error("upload-url: no signedUrl in response"); return null; }

    // 2. PUT blob directly to storage using the signed URL (no auth header needed)
    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "video/webm", "x-upsert": "true" },
      body: blob,
    });

    if (!putRes.ok) {
      const txt = await putRes.text().catch(() => putRes.status.toString());
      console.error("Storage PUT error:", txt);
      return null;
    }

    // 3. Return public URL
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
  } catch (e) {
    console.error("uploadClip error:", e);
    return null;
  }
}

// ── Environments ──────────────────────────────────────────────────────────────
export async function fetchEnvironments(): Promise<Environment[]> {
  try {
    const ids: string[] = (await kvGet<string[]>("env_index")) ?? [];
    return kvMget<Environment>(ids.map(id => `env:${id}`));
  } catch { return []; }
}

export async function saveEnvironment(env: Omit<Environment, "id" | "createdAt">): Promise<Environment> {
  const id = `env-${Date.now()}`;
  const record: Environment = { ...env, id, createdAt: new Date().toISOString() };
  await kvSet(`env:${id}`, record);
  const ids: string[] = (await kvGet<string[]>("env_index")) ?? [];
  await kvSet("env_index", [id, ...ids]);
  return record;
}

// ── Cameras ───────────────────────────────────────────────────────────────────
export async function fetchCameras(): Promise<Camera[]> {
  try {
    const ids: string[] = (await kvGet<string[]>("cam_index")) ?? [];
    return kvMget<Camera>(ids.map(id => `cam:${id}`));
  } catch { return []; }
}

export async function saveCamera(cam: Omit<Camera, "createdAt">): Promise<Camera> {
  const record: Camera = { ...cam, createdAt: new Date().toISOString() };
  await kvSet(`cam:${cam.id}`, record);
  const ids: string[] = (await kvGet<string[]>("cam_index")) ?? [];
  if (!ids.includes(cam.id)) await kvSet("cam_index", [cam.id, ...ids]);
  return record;
}

export async function updateCamera(id: string, patch: Partial<Camera>): Promise<void> {
  const existing = await kvGet<Camera>(`cam:${id}`);
  if (existing) await kvSet(`cam:${id}`, { ...existing, ...patch });
}

// ── Zones ─────────────────────────────────────────────────────────────────────
export async function fetchZones(): Promise<Zone[]> {
  try {
    const ids: string[] = (await kvGet<string[]>("zone_index")) ?? [];
    return kvMget<Zone>(ids.map(id => `zone:${id}`));
  } catch { return []; }
}

export async function saveZone(zone: Omit<Zone, "id" | "createdAt">): Promise<Zone> {
  const id = `zone-${Date.now()}`;
  const record: Zone = { ...zone, id, createdAt: new Date().toISOString() };
  await kvSet(`zone:${id}`, record);
  const ids: string[] = (await kvGet<string[]>("zone_index")) ?? [];
  await kvSet("zone_index", [id, ...ids]);
  return record;
}

// ── People ────────────────────────────────────────────────────────────────────
export async function fetchPeople(): Promise<Person[]> {
  try {
    const ids: string[] = (await kvGet<string[]>("person_index")) ?? [];
    return kvMget<Person>(ids.map(id => `person:${id}`));
  } catch { return []; }
}

export async function getOrCreatePerson(cameraId: string): Promise<Person> {
  const displayNum = await nextSeq("person_seq", "P-", 3);
  const id = `person-${Date.now()}`;
  const record: Person = {
    id, displayId: displayNum, cameraId,
    firstDetectedAt: new Date().toISOString(),
    lastDetectedAt: new Date().toISOString(),
    status: "ACTIVE",
  };
  await kvSet(`person:${id}`, record);
  const ids: string[] = (await kvGet<string[]>("person_index")) ?? [];
  await kvSet("person_index", [id, ...ids].slice(0, 1000));
  return record;
}

export async function updatePersonLastSeen(id: string): Promise<void> {
  const p = await kvGet<Person>(`person:${id}`);
  if (p) await kvSet(`person:${id}`, { ...p, lastDetectedAt: new Date().toISOString() });
}

// ── Incidents ─────────────────────────────────────────────────────────────────
export interface CreateIncidentInput {
  cameraId: string;
  cameraName: string;
  zoneId: string;
  zoneName: string;
  personId: string;
  eventType: EventType;
  severity: Severity;
  confidence: number;
  riskScore: number;
  detectedAt: string;
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const id = await nextSeq("incident_seq", "INC-", 4);
  const record: Incident = {
    ...input,
    id,
    status: "NEW",
    createdAt: new Date().toISOString(),
  };
  await kvSet(`incident:${id}`, record);
  const ids: string[] = (await kvGet<string[]>("incident_index")) ?? [];
  await kvSet("incident_index", [id, ...ids].slice(0, 500));
  return record;
}

export async function fetchIncidents(): Promise<Incident[]> {
  try {
    const ids: string[] = (await kvGet<string[]>("incident_index")) ?? [];
    if (!ids.length) return [];
    return kvMget<Incident>(ids.map(id => `incident:${id}`));
  } catch (e) {
    console.error("fetchIncidents error:", e);
    return [];
  }
}

export async function fetchIncident(id: string): Promise<Incident | null> {
  return kvGet<Incident>(`incident:${id}`);
}

export async function updateIncidentStatus(id: string, status: IncidentStatus): Promise<void> {
  const existing = await kvGet<Incident>(`incident:${id}`);
  if (existing) await kvSet(`incident:${id}`, { ...existing, status });
}

export async function deleteIncident(id: string): Promise<void> {
  await kvDel(`incident:${id}`);
  const ids: string[] = (await kvGet<string[]>("incident_index")) ?? [];
  await kvSet("incident_index", ids.filter(i => i !== id));
}

// ── Evidence ──────────────────────────────────────────────────────────────────
export interface CreateEvidenceInput {
  incidentId: string;
  cameraId: string;
  cameraName: string;
  zoneId: string;
  zoneName: string;
  personId: string;
  eventType: EventType;
  severity: Severity;
  confidence: number;
  riskScore: number;
  detectedAt: string;
  recordingStartedAt: string;
  recordingEndedAt: string;
  duration: number;
  videoUrl: string | null;
}

export async function createEvidence(input: CreateEvidenceInput): Promise<Evidence> {
  const id = await nextSeq("evidence_seq", "EVD-", 4);
  const record: Evidence = {
    ...input,
    id,
    thumbnailUrl: null,
    status: input.videoUrl ? "SAVED" : "UNAVAILABLE",
    createdAt: new Date().toISOString(),
  };
  await kvSet(`evidence:${id}`, record);
  const ids: string[] = (await kvGet<string[]>("evidence_index")) ?? [];
  await kvSet("evidence_index", [id, ...ids].slice(0, 1000));

  // Also link this evidence to its incident
  const incident = await kvGet<Incident>(`incident:${input.incidentId}`);
  if (incident) {
    const linked: any = { ...incident, evidenceId: id };
    await kvSet(`incident:${input.incidentId}`, linked);
  }

  return record;
}

export async function fetchEvidence(): Promise<Evidence[]> {
  try {
    const ids: string[] = (await kvGet<string[]>("evidence_index")) ?? [];
    if (!ids.length) return [];
    return kvMget<Evidence>(ids.map(id => `evidence:${id}`));
  } catch (e) {
    console.error("fetchEvidence error:", e);
    return [];
  }
}

export async function fetchEvidenceForIncident(incidentId: string): Promise<Evidence[]> {
  const all = await fetchEvidence();
  return all.filter(e => e.incidentId === incidentId);
}

export async function fetchEvidenceById(id: string): Promise<Evidence | null> {
  return kvGet<Evidence>(`evidence:${id}`);
}

export async function updateEvidenceStatus(id: string, status: EvidenceStatus): Promise<void> {
  const existing = await kvGet<Evidence>(`evidence:${id}`);
  if (existing) await kvSet(`evidence:${id}`, { ...existing, status });
}

export async function deleteEvidence(id: string): Promise<void> {
  await kvDel(`evidence:${id}`);
  const ids: string[] = (await kvGet<string[]>("evidence_index")) ?? [];
  await kvSet("evidence_index", ids.filter(i => i !== id));
}

// ── Supabase Realtime channel helpers ─────────────────────────────────────────
// Subscribe to changes in the KV table for live updates.
export function subscribeToChanges(onIncident: () => void, onEvidence: () => void) {
  const channel = supabase
    .channel("sentinelx-kv-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      (payload: any) => {
        const key: string = payload.new?.key ?? payload.old?.key ?? "";
        if (key.startsWith("incident:") || key === "incident_index") onIncident();
        if (key.startsWith("evidence:") || key === "evidence_index") onEvidence();
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
