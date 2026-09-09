/**
 * SentinelX Email Alert system.
 * Sends real emails via EmailJS (browser SDK — public key only, no server secret exposed).
 * Config and alert history stored in localStorage.
 */
import emailjs from "@emailjs/browser";

export type EmailAlertStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";

export interface EmailAlertConfig {
  ownerEmail: string;
  enabled: boolean;
  triggers: {
    restrictedAreaIntrusion: boolean;
    highRiskIncident: boolean;
    criticalIncident: boolean;
  };
  // EmailJS credentials (public — safe to store client-side)
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsPublicKey: string;
}

export interface EmailAlertRecord {
  id: string;
  incidentId: string;
  recipient: string;
  subject: string;
  status: EmailAlertStatus;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
  camera?: string;
  zone?: string;
  person?: string;
  severity?: string;
  confidence?: number;
  riskScore?: number;
  hasEvidence?: boolean;
  evidenceId?: string;
}

const CONFIG_KEY  = "sentinelx_email_config";
const HISTORY_KEY = "sentinelx_email_history";

const DEFAULT_CONFIG: EmailAlertConfig = {
  ownerEmail: "",
  enabled: true,
  triggers: { restrictedAreaIntrusion: true, highRiskIncident: false, criticalIncident: false },
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: "",
};

export function getEmailConfig(): EmailAlertConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // Merge with defaults so new fields are never undefined
      return { ...DEFAULT_CONFIG, ...stored, triggers: { ...DEFAULT_CONFIG.triggers, ...(stored.triggers ?? {}) } };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function saveEmailConfig(cfg: EmailAlertConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function getEmailHistory(): EmailAlertRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveEmailHistory(records: EmailAlertRecord[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 200)));
}

function updateRecord(id: string, patch: Partial<EmailAlertRecord>): void {
  const records = getEmailHistory();
  const idx = records.findIndex(r => r.id === id);
  if (idx >= 0) {
    records[idx] = { ...records[idx], ...patch };
    saveEmailHistory(records);
  }
}

export function getAlertForIncident(incidentId: string): EmailAlertRecord | null {
  return getEmailHistory().find(r => r.incidentId === incidentId) ?? null;
}

export function isEmailjsConfigured(cfg: EmailAlertConfig): boolean {
  return !!(cfg.emailjsServiceId && cfg.emailjsTemplateId && cfg.emailjsPublicKey);
}

export type EmailSendResult = { ok: true; record: EmailAlertRecord } | { ok: false; error: string };

export async function sendEmailAlert(params: {
  incidentId: string;
  camera: string;
  zone: string;
  person: string;
  severity: string;
  confidence: number;
  riskScore: number;
  time: string;
  hasEvidence: boolean;
  evidenceId?: string;
  onStatusChange?: (record: EmailAlertRecord) => void;
}): Promise<EmailSendResult> {
  const config = getEmailConfig();

  if (!config.enabled) return { ok: false, error: "Email alerts are disabled" };
  if (!config.ownerEmail || !isValidEmail(config.ownerEmail)) return { ok: false, error: "No valid owner email configured" };
  if (!config.triggers.restrictedAreaIntrusion) return { ok: false, error: "Restricted area intrusion alerts are disabled" };

  const existing = getAlertForIncident(params.incidentId);
  if (existing) return { ok: true, record: existing };

  const id = `EMAIL-${Date.now()}`;
  const record: EmailAlertRecord = {
    id,
    incidentId: params.incidentId,
    recipient: config.ownerEmail,
    subject: "🚨 SentinelX — Restricted Area Intrusion Detected",
    status: "PENDING",
    sentAt: null,
    error: null,
    createdAt: new Date().toISOString(),
    camera: params.camera,
    zone: params.zone,
    person: params.person,
    severity: params.severity,
    confidence: params.confidence,
    riskScore: params.riskScore,
    hasEvidence: params.hasEvidence,
    evidenceId: params.evidenceId,
  };

  const history = getEmailHistory();
  history.unshift(record);
  saveEmailHistory(history);
  params.onStatusChange?.(record);

  if (!isEmailjsConfigured(config)) {
    // EmailJS not yet configured — mark failed so user knows to set it up
    const errMsg = "EmailJS not configured. Add Service ID, Template ID, and Public Key in Settings → Notifications.";
    updateRecord(id, { status: "FAILED", error: errMsg });
    params.onStatusChange?.({ ...record, status: "FAILED", error: errMsg });
    return { ok: false, error: errMsg };
  }

  updateRecord(id, { status: "SENDING" });
  params.onStatusChange?.({ ...record, status: "SENDING" });

  try {
    await emailjs.send(
      config.emailjsServiceId,
      config.emailjsTemplateId,
      {
        to_email:    config.ownerEmail,
        incident_id: params.incidentId,
        camera:      params.camera,
        zone:        params.zone,
        person:      params.person,
        time:        params.time,
        severity:    params.severity,
        confidence:  String(params.confidence),
        risk_score:  String(params.riskScore),
        evidence:    params.hasEvidence ? `Available (${params.evidenceId ?? "EVD"})` : "None",
      },
      config.emailjsPublicKey,
    );

    const sentAt = new Date().toISOString();
    updateRecord(id, { status: "SENT", sentAt });
    params.onStatusChange?.({ ...record, status: "SENT", sentAt });
    return { ok: true, record: { ...record, status: "SENT", sentAt } };
  } catch (e: any) {
    const errMsg = e?.text ?? e?.message ?? "EmailJS send failed";
    updateRecord(id, { status: "FAILED", error: errMsg });
    params.onStatusChange?.({ ...record, status: "FAILED", error: errMsg });
    return { ok: false, error: errMsg };
  }
}

export async function sendTestEmail(cfg: EmailAlertConfig): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailjsConfigured(cfg)) return { ok: false, error: "EmailJS credentials not configured" };
  if (!isValidEmail(cfg.ownerEmail)) return { ok: false, error: "No valid owner email" };

  try {
    await emailjs.send(
      cfg.emailjsServiceId,
      cfg.emailjsTemplateId,
      {
        to_email:    cfg.ownerEmail,
        incident_id: "TEST-0000",
        camera:      "CAM-01",
        zone:        "Test Zone",
        person:      "P-000",
        time:        new Date().toLocaleTimeString("en-GB", { hour12: false }),
        severity:    "TEST",
        confidence:  "99",
        risk_score:  "0",
        evidence:    "None (test)",
      },
      cfg.emailjsPublicKey,
    );
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.text ?? e?.message ?? "Send failed" };
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
