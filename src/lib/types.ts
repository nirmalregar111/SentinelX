// ── SentinelX Backend Data Models ────────────────────────────────────────────
// These types mirror the database schema and are used throughout the frontend.
// Frontend never contains server-side credentials; all secrets live server-side.

export type CameraStatus   = "LIVE" | "OFFLINE" | "CONNECTING" | "ERROR";
export type IncidentStatus = "NEW" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED";
export type EvidenceStatus = "RECORDING" | "PROCESSING" | "SAVED" | "FAILED" | "UNAVAILABLE";
export type Severity       = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ZoneType       = "RESTRICTED" | "MONITORED" | "PUBLIC";
export type EventType      = "UNAUTHORIZED_ENTRY" | "LOITERING" | "BOUNDARY_BREACH" | "TAILGATING";

export interface Environment {
  id: string;
  name: string;
  type: string;
  location: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface Camera {
  id: string;         // e.g. "CAM-03"
  name: string;
  environmentId: string;
  status: CameraStatus;
  source?: string;    // uploaded video URL
  createdAt: string;
}

export interface Zone {
  id: string;
  name: string;
  environmentId: string;
  cameraId: string;
  type: ZoneType;
  polygon: { x: number; y: number; w: number; h: number } | null;
  severity: Severity;
  enabled: boolean;
  createdAt: string;
}

export interface Person {
  id: string;
  displayId: string;  // "P-001"
  cameraId: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  status: "ACTIVE" | "CLEARED" | "UNKNOWN";
}

export interface Incident {
  id: string;           // "INC-1042"
  cameraId: string;
  cameraName: string;
  zoneId: string;
  zoneName: string;
  personId: string;
  eventType: EventType;
  severity: Severity;
  status: IncidentStatus;
  confidence: number;   // 0–100
  riskScore: number;    // 0–100
  detectedAt: string;   // ISO
  createdAt: string;    // ISO
}

export interface Evidence {
  id: string;               // "EVD-0001"
  incidentId: string;       // "INC-1042"
  cameraId: string;
  cameraName: string;
  zoneId: string;
  zoneName: string;
  personId: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  eventType: EventType;
  severity: Severity;
  confidence: number;
  riskScore: number;
  recordingStartedAt: string;
  detectedAt: string;
  recordingEndedAt: string;
  duration: number;         // seconds
  status: EvidenceStatus;
  createdAt: string;
}

// ── Dashboard stats derived from live data ────────────────────────────────────
export interface DashboardStats {
  activeCameras: number;
  totalCameras: number;
  peopleDetected: number;
  activeIncidents: number;
  highRiskEvents: number;
  evidenceCaptured: number;
}

// ── Load state generic ────────────────────────────────────────────────────────
export type LoadState = "idle" | "loading" | "success" | "error";
