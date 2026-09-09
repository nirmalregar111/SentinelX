export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IncidentStatus = "NEW" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED";
export type CameraStatus = "LIVE" | "WARNING" | "OFFLINE";
export type ZoneLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ZoneState = "SAFE" | "APPROACHING" | "WARNING" | "INTRUSION";
export type PersonAuth = "AUTHORIZED" | "UNAUTHORIZED" | "UNKNOWN";

export interface Camera {
  id: string;
  name: string;
  location: string;
  status: CameraStatus;
  fps: number;
  people: number;
  zone?: string;
  resolution: string;
  uptime: string;
}

export interface Incident {
  id: string;
  severity: Severity;
  type: string;
  camera: string;
  zone: string;
  person: string;
  time: string;
  riskScore: number;
  confidence: number;
  status: IncidentStatus;
  description: string;
  timeline: { time: string; event: string }[];
}

export interface Zone {
  id: string;
  name: string;
  camera: string;
  level: ZoneLevel;
  state: ZoneState;
  roles: string[];
  schedule: string;
  peopleDetected: number;
  lastTriggered: string;
}

export interface Person {
  id: string;
  camera: string;
  zone: string;
  authorization: PersonAuth;
  status: string;
  lastSeen: string;
  riskScore: number;
  detections: number;
}

export const cameras: Camera[] = [
  { id: "CAM-01", name: "Main Entrance", location: "Building A – Ground Floor", status: "LIVE", fps: 30, people: 2, zone: "Public Lobby", resolution: "1920×1080", uptime: "99.8%" },
  { id: "CAM-02", name: "Server Room", location: "Building B – Level 2", status: "LIVE", fps: 30, people: 0, zone: "Restricted IT", resolution: "1920×1080", uptime: "100%" },
  { id: "CAM-03", name: "Equipment Bay", location: "Factory Floor – Zone C", status: "WARNING", fps: 28, people: 1, zone: "Restricted Equipment", resolution: "1920×1080", uptime: "97.2%" },
  { id: "CAM-04", name: "Loading Dock", location: "Warehouse – Entrance", status: "LIVE", fps: 30, people: 3, zone: "Semi-Restricted", resolution: "1920×1080", uptime: "99.1%" },
  { id: "CAM-05", name: "Chemical Storage", location: "Building C – Basement", status: "LIVE", fps: 30, people: 0, zone: "Critical Zone", resolution: "2560×1440", uptime: "100%" },
  { id: "CAM-06", name: "Executive Floor", location: "Building A – Level 8", status: "LIVE", fps: 30, people: 1, zone: "Restricted Access", resolution: "1920×1080", uptime: "99.9%" },
  { id: "CAM-07", name: "Parking Structure", location: "External – Level P1", status: "LIVE", fps: 25, people: 5, zone: "Public Area", resolution: "1280×720", uptime: "98.4%" },
  { id: "CAM-08", name: "Data Center", location: "Building B – Level 1", status: "OFFLINE", fps: 0, people: 0, zone: "Critical IT", resolution: "1920×1080", uptime: "—" },
];

export const incidents: Incident[] = [
  {
    id: "INC-1042",
    severity: "CRITICAL",
    type: "Unauthorized Intrusion",
    camera: "CAM-03",
    zone: "Restricted Equipment",
    person: "P-104",
    time: "10:42:18",
    riskScore: 87,
    confidence: 96,
    status: "NEW",
    description: "Unauthorized person detected inside restricted equipment zone. Authorization check failed. AI confidence 96%.",
    timeline: [
      { time: "10:42:12", event: "Person detected entering camera frame" },
      { time: "10:42:14", event: "Subject approaching restricted boundary" },
      { time: "10:42:16", event: "Zone boundary crossed" },
      { time: "10:42:17", event: "Authorization check failed" },
      { time: "10:42:18", event: "Intrusion confirmed — incident created" },
    ],
  },
  {
    id: "INC-1041",
    severity: "HIGH",
    type: "Zone Boundary Warning",
    camera: "CAM-07",
    zone: "Semi-Restricted",
    person: "P-098",
    time: "10:38:55",
    riskScore: 62,
    confidence: 91,
    status: "ACKNOWLEDGED",
    description: "Person loitering near restricted boundary in parking structure. Elevated risk score due to repeat behavior pattern.",
    timeline: [
      { time: "10:36:10", event: "Person detected in parking zone" },
      { time: "10:37:45", event: "Subject approaching boundary (second attempt)" },
      { time: "10:38:55", event: "Warning threshold exceeded" },
    ],
  },
  {
    id: "INC-1040",
    severity: "HIGH",
    type: "Unauthorized Access Attempt",
    camera: "CAM-02",
    zone: "Restricted IT",
    person: "P-112",
    time: "10:15:22",
    riskScore: 74,
    confidence: 88,
    status: "INVESTIGATING",
    description: "Unrecognized person attempted to access server room entry point. Badge not presented. Tailgating suspected.",
    timeline: [
      { time: "10:14:50", event: "Person approaches server room corridor" },
      { time: "10:15:10", event: "Entry attempt detected — no badge presented" },
      { time: "10:15:22", event: "Tailgating pattern confirmed" },
    ],
  },
  {
    id: "INC-1039",
    severity: "MEDIUM",
    type: "Perimeter Approach",
    camera: "CAM-05",
    zone: "Critical Zone",
    person: "P-087",
    time: "09:58:03",
    riskScore: 41,
    confidence: 84,
    status: "RESOLVED",
    description: "Person approached chemical storage perimeter but did not cross. Zone returned to safe state after subject departed.",
    timeline: [
      { time: "09:57:30", event: "Person detected near chemical storage" },
      { time: "09:58:03", event: "Approaching warning triggered" },
      { time: "09:59:10", event: "Subject departed — zone cleared" },
    ],
  },
  {
    id: "INC-1038",
    severity: "LOW",
    type: "Loitering Detected",
    camera: "CAM-01",
    zone: "Public Lobby",
    person: "P-073",
    time: "09:44:31",
    riskScore: 18,
    confidence: 79,
    status: "RESOLVED",
    description: "Person loitering in public lobby for extended period. No restricted zone access. Risk score low.",
    timeline: [
      { time: "09:30:12", event: "Person enters lobby" },
      { time: "09:44:31", event: "Extended dwell detected — alert created" },
      { time: "09:52:00", event: "Person left premises — resolved" },
    ],
  },
  {
    id: "INC-1037",
    severity: "CRITICAL",
    type: "Unauthorized Intrusion",
    camera: "CAM-06",
    zone: "Restricted Access",
    person: "P-061",
    time: "08:30:44",
    riskScore: 93,
    confidence: 98,
    status: "RESOLVED",
    description: "High-confidence intrusion into executive floor restricted area. Security team dispatched and incident resolved.",
    timeline: [
      { time: "08:30:30", event: "Person bypasses lobby checkpoint" },
      { time: "08:30:44", event: "Restricted floor access confirmed" },
      { time: "08:31:00", event: "Security team alerted" },
      { time: "08:45:00", event: "Person escorted from premises — resolved" },
    ],
  },
];

export const zones: Zone[] = [
  { id: "Z-01", name: "Restricted Equipment Bay", camera: "CAM-03", level: "CRITICAL", state: "INTRUSION", roles: ["Senior Engineer", "Safety Officer"], schedule: "Always active", peopleDetected: 1, lastTriggered: "10:42:18" },
  { id: "Z-02", name: "Server Room", camera: "CAM-02", level: "HIGH", state: "SAFE", roles: ["IT Admin", "Security"], schedule: "Always active", peopleDetected: 0, lastTriggered: "10:15:22" },
  { id: "Z-03", name: "Chemical Storage", camera: "CAM-05", level: "CRITICAL", state: "SAFE", roles: ["Safety Officer", "Lab Manager"], schedule: "Always active", peopleDetected: 0, lastTriggered: "09:58:03" },
  { id: "Z-04", name: "Executive Floor", camera: "CAM-06", level: "HIGH", state: "SAFE", roles: ["Executive", "Executive Assistant", "Security"], schedule: "08:00–20:00", peopleDetected: 1, lastTriggered: "08:30:44" },
  { id: "Z-05", name: "Loading Dock", camera: "CAM-04", level: "MEDIUM", state: "APPROACHING", roles: ["Logistics", "Driver", "Security"], schedule: "06:00–22:00", peopleDetected: 3, lastTriggered: "10:38:55" },
  { id: "Z-06", name: "Data Center", camera: "CAM-08", level: "CRITICAL", state: "SAFE", roles: ["IT Admin"], schedule: "Always active", peopleDetected: 0, lastTriggered: "—" },
];

export const people: Person[] = [
  { id: "P-104", camera: "CAM-03", zone: "Restricted Equipment", authorization: "UNAUTHORIZED", status: "Active — Intrusion", lastSeen: "10:42:18", riskScore: 87, detections: 3 },
  { id: "P-098", camera: "CAM-07", zone: "Semi-Restricted", authorization: "UNKNOWN", status: "Active — Warning", lastSeen: "10:38:55", riskScore: 62, detections: 7 },
  { id: "P-112", camera: "CAM-02", zone: "Restricted IT", authorization: "UNAUTHORIZED", status: "Left frame", lastSeen: "10:15:22", riskScore: 74, detections: 1 },
  { id: "P-087", camera: "CAM-05", zone: "Chemical Storage", authorization: "UNKNOWN", status: "Left frame", lastSeen: "09:58:03", riskScore: 41, detections: 2 },
  { id: "P-073", camera: "CAM-01", zone: "Public Lobby", authorization: "AUTHORIZED", status: "Left premises", lastSeen: "09:52:00", riskScore: 18, detections: 12 },
  { id: "P-061", camera: "CAM-06", zone: "Restricted Access", authorization: "UNAUTHORIZED", status: "Escorted out", lastSeen: "08:45:00", riskScore: 93, detections: 1 },
  { id: "P-055", camera: "CAM-04", zone: "Semi-Restricted", authorization: "AUTHORIZED", status: "Active", lastSeen: "10:41:05", riskScore: 12, detections: 18 },
  { id: "P-048", camera: "CAM-01", zone: "Public Lobby", authorization: "AUTHORIZED", status: "Active", lastSeen: "10:40:30", riskScore: 5, detections: 24 },
];

export const activityFeed = [
  { time: "10:42:18", type: "critical", msg: "INC-1042 — Intrusion in Restricted Equipment Bay", camera: "CAM-03" },
  { time: "10:41:05", type: "info", msg: "P-055 detected in Loading Dock zone", camera: "CAM-04" },
  { time: "10:40:30", type: "info", msg: "P-048 detected at Main Entrance", camera: "CAM-01" },
  { time: "10:38:55", type: "warning", msg: "INC-1041 — Warning: P-098 approaching restricted boundary", camera: "CAM-07" },
  { time: "10:37:10", type: "success", msg: "CAM-04 returned to normal state", camera: "CAM-04" },
  { time: "10:35:22", type: "info", msg: "AI Engine completed zone re-calibration", camera: "SYSTEM" },
  { time: "10:30:14", type: "warning", msg: "CAM-07 FPS drop detected — investigating", camera: "CAM-07" },
  { time: "10:15:22", type: "high", msg: "INC-1040 — Unauthorized access attempt at Server Room", camera: "CAM-02" },
  { time: "10:08:44", type: "info", msg: "Shift change — new operator session started", camera: "SYSTEM" },
  { time: "09:58:03", type: "warning", msg: "INC-1039 — Person approaching Chemical Storage perimeter", camera: "CAM-05" },
];

export const analyticsData = {
  incidentsByDay: [
    { day: "Mon", total: 4, critical: 1, high: 2, medium: 1, low: 0 },
    { day: "Tue", total: 6, critical: 2, high: 2, medium: 1, low: 1 },
    { day: "Wed", total: 3, critical: 0, high: 1, medium: 2, low: 0 },
    { day: "Thu", total: 8, critical: 3, high: 3, medium: 1, low: 1 },
    { day: "Fri", total: 5, critical: 1, high: 2, medium: 1, low: 1 },
    { day: "Sat", total: 2, critical: 0, high: 1, medium: 0, low: 1 },
    { day: "Sun", total: 6, critical: 2, high: 2, medium: 2, low: 0 },
  ],
  cameraActivity: [
    { cam: "CAM-01", detections: 48 },
    { cam: "CAM-02", detections: 12 },
    { cam: "CAM-03", detections: 31 },
    { cam: "CAM-04", detections: 67 },
    { cam: "CAM-05", detections: 8 },
    { cam: "CAM-06", detections: 22 },
    { cam: "CAM-07", detections: 89 },
    { cam: "CAM-08", detections: 0 },
  ],
  zoneActivity: [
    { zone: "Restricted Equipment", incidents: 12, risk: 87 },
    { zone: "Server Room", incidents: 4, risk: 74 },
    { zone: "Chemical Storage", incidents: 3, risk: 41 },
    { zone: "Executive Floor", incidents: 7, risk: 93 },
    { zone: "Loading Dock", incidents: 9, risk: 62 },
    { zone: "Public Lobby", incidents: 2, risk: 18 },
  ],
};
