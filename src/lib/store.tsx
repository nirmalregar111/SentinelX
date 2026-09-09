/**
 * SentinelX global state store.
 * Single source of truth for all live backend data.
 * Uses Supabase Realtime to keep every page in sync automatically.
 */
import React, {
  createContext, useContext, useReducer, useEffect, useCallback, useRef,
} from "react";
import type { Incident, Evidence, Camera, Zone, Person, LoadState } from "./types";
import {
  fetchIncidents, fetchEvidence, fetchCameras,
  subscribeToChanges, updateIncidentStatus, deleteIncident, deleteEvidence,
} from "./api";
import { loadLocalEvidence, type LocalEvidence } from "./clipStore";
import { onDetectedIncident, onDetectedEvidence } from "./detectionBus";

function localToEvidence(e: LocalEvidence): Evidence {
  return {
    id: e.id,
    incidentId: e.incidentId,
    cameraId: e.cameraId,
    cameraName: e.cameraName,
    zoneId: e.zoneId,
    zoneName: e.zoneName,
    personId: e.cameraId + "-local",
    videoUrl: null,
    thumbnailUrl: null,
    eventType: e.eventType as any,
    severity: e.severity as any,
    confidence: e.confidence,
    riskScore: 60,
    recordingStartedAt: e.detectedAt,
    detectedAt: e.detectedAt,
    recordingEndedAt: e.detectedAt,
    duration: e.duration,
    status: "SAVED" as any,
    createdAt: e.createdAt,
  };
}

// ── State shape ───────────────────────────────────────────────────────────────

interface StoreState {
  incidents:       Incident[];
  evidence:        Evidence[];
  cameras:         Camera[];
  incidentsLoad:   LoadState;
  evidenceLoad:    LoadState;
  camerasLoad:     LoadState;
  incidentsError:  string | null;
  evidenceError:   string | null;
  camerasError:    string | null;
  realtimeStatus:  "connecting" | "connected" | "disconnected";
}

const initial: StoreState = {
  incidents: [], evidence: [], cameras: [],
  incidentsLoad: "idle", evidenceLoad: "idle", camerasLoad: "idle",
  incidentsError: null, evidenceError: null, camerasError: null,
  realtimeStatus: "connecting",
};

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "INCIDENTS_LOADING" }
  | { type: "INCIDENTS_OK";  payload: Incident[] }
  | { type: "INCIDENTS_ERR"; payload: string }
  | { type: "EVIDENCE_LOADING" }
  | { type: "EVIDENCE_OK";   payload: Evidence[] }
  | { type: "EVIDENCE_ERR";  payload: string }
  | { type: "CAMERAS_LOADING" }
  | { type: "CAMERAS_OK";    payload: Camera[] }
  | { type: "CAMERAS_ERR";   payload: string }
  | { type: "REALTIME_STATUS"; payload: StoreState["realtimeStatus"] }
  | { type: "PREPEND_INCIDENT"; payload: Incident }
  | { type: "PREPEND_EVIDENCE"; payload: Evidence }
  | { type: "UPDATE_INCIDENT_STATUS"; id: string; status: Incident["status"] }
  | { type: "REMOVE_INCIDENT"; id: string }
  | { type: "REMOVE_EVIDENCE"; id: string };

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case "INCIDENTS_LOADING":  return { ...state, incidentsLoad: "loading", incidentsError: null };
    case "INCIDENTS_OK":       return { ...state, incidentsLoad: "success", incidents: action.payload };
    case "INCIDENTS_ERR":      return { ...state, incidentsLoad: "error",   incidentsError: action.payload };
    case "EVIDENCE_LOADING":   return { ...state, evidenceLoad:  "loading", evidenceError: null };
    case "EVIDENCE_OK":        return { ...state, evidenceLoad:  "success", evidence: action.payload };
    case "EVIDENCE_ERR":       return { ...state, evidenceLoad:  "error",   evidenceError: action.payload };
    case "CAMERAS_LOADING":    return { ...state, camerasLoad:   "loading", camerasError: null };
    case "CAMERAS_OK":         return { ...state, camerasLoad:   "success", cameras: action.payload };
    case "CAMERAS_ERR":        return { ...state, camerasLoad:   "error",   camerasError: action.payload };
    case "REALTIME_STATUS":    return { ...state, realtimeStatus: action.payload };
    case "PREPEND_INCIDENT":   return { ...state, incidents: [action.payload, ...state.incidents.filter(i => i.id !== action.payload.id)] };
    case "PREPEND_EVIDENCE":   return { ...state, evidence:  [action.payload, ...state.evidence.filter(e => e.id !== action.payload.id)] };
    case "UPDATE_INCIDENT_STATUS":
      return { ...state, incidents: state.incidents.map(i => i.id === action.id ? { ...i, status: action.status } : i) };
    case "REMOVE_INCIDENT":    return { ...state, incidents: state.incidents.filter(i => i.id !== action.id) };
    case "REMOVE_EVIDENCE":    return { ...state, evidence:  state.evidence.filter(e => e.id !== action.id) };
    default: return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface StoreContextValue {
  state: StoreState;
  // Derived stats
  activeCameras:   number;
  activeIncidents: number;
  highRiskEvents:  number;
  peopleDetected:  number;
  evidenceCount:   number;
  // Actions
  reloadIncidents:      () => Promise<void>;
  reloadEvidence:       () => Promise<void>;
  reloadCameras:        () => Promise<void>;
  acknowledgeIncident:  (id: string) => Promise<void>;
  investigateIncident:  (id: string) => Promise<void>;
  resolveIncident:      (id: string) => Promise<void>;
  removeIncident:       (id: string) => Promise<void>;
  removeEvidence:       (id: string) => Promise<void>;
  // Live push (called by DetectionCamera when it creates records)
  pushIncident:   (inc: Incident) => void;
  pushEvidence:   (evd: Evidence) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const loadingRef = useRef({ incidents: false, evidence: false, cameras: false });

  // ── Loaders ──────────────────────────────────────────────────────────────

  const reloadIncidents = useCallback(async () => {
    if (loadingRef.current.incidents) return;
    loadingRef.current.incidents = true;
    dispatch({ type: "INCIDENTS_LOADING" });
    try {
      const data = await fetchIncidents();
      dispatch({ type: "INCIDENTS_OK", payload: data });
    } catch (e: any) {
      dispatch({ type: "INCIDENTS_ERR", payload: e.message ?? "Failed to load incidents" });
    } finally {
      loadingRef.current.incidents = false;
    }
  }, []);

  const reloadEvidence = useCallback(async () => {
    if (loadingRef.current.evidence) return;
    loadingRef.current.evidence = true;
    dispatch({ type: "EVIDENCE_LOADING" });
    try {
      const data = await fetchEvidence();
      dispatch({ type: "EVIDENCE_OK", payload: data });
    } catch (e: any) {
      dispatch({ type: "EVIDENCE_ERR", payload: e.message ?? "Failed to load evidence" });
    } finally {
      loadingRef.current.evidence = false;
    }
  }, []);

  const reloadCameras = useCallback(async () => {
    if (loadingRef.current.cameras) return;
    loadingRef.current.cameras = true;
    dispatch({ type: "CAMERAS_LOADING" });
    try {
      const data = await fetchCameras();
      dispatch({ type: "CAMERAS_OK", payload: data });
    } catch (e: any) {
      dispatch({ type: "CAMERAS_ERR", payload: e.message ?? "Failed to load cameras" });
    } finally {
      loadingRef.current.cameras = false;
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    reloadIncidents();
    reloadEvidence();
    reloadCameras();
  }, [reloadIncidents, reloadEvidence, reloadCameras]);

  // ── Detection bus — instant push when DetectionCamera creates records ─────
  useEffect(() => {
    const unsubInc = onDetectedIncident(inc => dispatch({ type: "PREPEND_INCIDENT", payload: inc }));
    const unsubEvd = onDetectedEvidence(evd => dispatch({ type: "PREPEND_EVIDENCE", payload: evd }));
    return () => { unsubInc(); unsubEvd(); };
  }, []);

  // ── Polling fallback — reload every 8 s so pages stay live ────────────────
  // Realtime requires replication enabled on the KV table; polling guarantees
  // updates reach every page even when the Realtime channel is silent.
  useEffect(() => {
    const id = setInterval(() => {
      reloadIncidents();
      reloadEvidence();
    }, 8000);
    return () => clearInterval(id);
  }, [reloadIncidents, reloadEvidence]);

  // ── Supabase Realtime subscription (best-effort) ──────────────────────────

  useEffect(() => {
    dispatch({ type: "REALTIME_STATUS", payload: "connecting" });
    const unsub = subscribeToChanges(
      () => reloadIncidents(),
      () => reloadEvidence(),
    );
    dispatch({ type: "REALTIME_STATUS", payload: "connected" });
    return () => {
      unsub();
      dispatch({ type: "REALTIME_STATUS", payload: "disconnected" });
    };
  }, [reloadIncidents, reloadEvidence]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const acknowledgeIncident = useCallback(async (id: string) => {
    dispatch({ type: "UPDATE_INCIDENT_STATUS", id, status: "ACKNOWLEDGED" });
    await updateIncidentStatus(id, "ACKNOWLEDGED");
  }, []);

  const investigateIncident = useCallback(async (id: string) => {
    dispatch({ type: "UPDATE_INCIDENT_STATUS", id, status: "INVESTIGATING" });
    await updateIncidentStatus(id, "INVESTIGATING");
  }, []);

  const resolveIncident = useCallback(async (id: string) => {
    dispatch({ type: "UPDATE_INCIDENT_STATUS", id, status: "RESOLVED" });
    await updateIncidentStatus(id, "RESOLVED");
  }, []);

  const removeIncident = useCallback(async (id: string) => {
    dispatch({ type: "REMOVE_INCIDENT", id });
    await deleteIncident(id);
  }, []);

  const removeEvidence = useCallback(async (id: string) => {
    dispatch({ type: "REMOVE_EVIDENCE", id });
    await deleteEvidence(id);
  }, []);

  const pushIncident = useCallback((inc: Incident) => {
    dispatch({ type: "PREPEND_INCIDENT", payload: inc });
  }, []);

  const pushEvidence = useCallback((evd: Evidence) => {
    dispatch({ type: "PREPEND_EVIDENCE", payload: evd });
  }, []);

  // ── Merge local evidence so Analytics/People/Overview reflect clipStore ───
  const [localEvidence, setLocalEvidence] = React.useState<Evidence[]>(() =>
    loadLocalEvidence().map(localToEvidence)
  );
  useEffect(() => {
    const refresh = () => setLocalEvidence(loadLocalEvidence().map(localToEvidence));
    refresh();
    const id = setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(id); window.removeEventListener("focus", refresh); };
  }, []);

  const allEvidence = React.useMemo(() => {
    const backendIds = new Set(state.evidence.map(e => e.id));
    const extra = localEvidence.filter(e => !backendIds.has(e.id));
    return [...state.evidence, ...extra];
  }, [state.evidence, localEvidence]);

  // ── Derived stats ─────────────────────────────────────────────────────────

  const activeCameras   = state.cameras.filter(c => c.status === "LIVE").length;
  const activeIncidents = state.incidents.filter(i => i.status !== "RESOLVED").length;
  const highRiskEvents  = state.incidents.filter(i => i.severity === "CRITICAL" || i.severity === "HIGH").length;
  const peopleDetected  = allEvidence.length > 0
    ? new Set(allEvidence.map(e => e.personId)).size
    : 0;
  const evidenceCount = allEvidence.length;

  // Expose a merged state view so all consumers get local+backend evidence
  const mergedState = React.useMemo(() => ({ ...state, evidence: allEvidence }), [state, allEvidence]);

  return (
    <StoreContext.Provider value={{
      state: mergedState,
      activeCameras, activeIncidents, highRiskEvents, peopleDetected, evidenceCount,
      reloadIncidents, reloadEvidence, reloadCameras,
      acknowledgeIncident, investigateIncident, resolveIncident,
      removeIncident, removeEvidence,
      pushIncident, pushEvidence,
    }}>
      {children}
    </StoreContext.Provider>
  );
}
