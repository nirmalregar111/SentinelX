import React, { useState, useEffect } from "react";
import { Badge } from "../components/Badge";
import {
  SearchIcon, XIcon, CheckIcon, ArrowRightIcon, ClockIcon,
} from "../icons";
import type { Incident, IncidentStatus, Severity } from "../lib/types";
import { useStore } from "../lib/store";
import { fetchEvidenceForIncident } from "../lib/api";
import type { Evidence } from "../lib/types";
import { getAlertForIncident, type EmailAlertRecord } from "../lib/emailAlerts";

const sevOrder: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const statusSteps: IncidentStatus[] = ["NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED"];

function formatTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("en-GB", { hour12: false }); } catch { return iso; }
}
function formatDateTime(iso: string) {
  try { return new Date(iso).toLocaleString("en-GB", { hour12: false, dateStyle: "short", timeStyle: "medium" }); } catch { return iso; }
}
function eventLabel(et: string) {
  return et.replace(/_/g, " ");
}
function describeIncident(inc: Incident): string {
  return `${inc.personId} detected in ${inc.zoneName} by ${inc.cameraName}. AI confidence: ${inc.confidence}%. Risk score: ${inc.riskScore}/100. Event type: ${eventLabel(inc.eventType)}.`;
}
function buildTimeline(inc: Incident): { time: string; event: string }[] {
  const lines: { time: string; event: string }[] = [
    { time: formatTime(inc.detectedAt), event: `Detection event triggered — ${eventLabel(inc.eventType)}` },
    { time: formatTime(inc.detectedAt), event: `${inc.personId} identified in ${inc.zoneName} (${inc.confidence}% confidence)` },
    { time: formatTime(inc.createdAt),  event: `Incident ${inc.id} created — severity: ${inc.severity}` },
  ];
  if (inc.status === "ACKNOWLEDGED" || inc.status === "INVESTIGATING" || inc.status === "RESOLVED")
    lines.push({ time: formatTime(inc.createdAt), event: "Incident acknowledged by operator" });
  if (inc.status === "INVESTIGATING" || inc.status === "RESOLVED")
    lines.push({ time: formatTime(inc.createdAt), event: "Investigation started" });
  if (inc.status === "RESOLVED")
    lines.push({ time: formatTime(inc.createdAt), event: "Incident resolved and closed" });
  return lines;
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? "#EF4444" : score >= 60 ? "#F97316" : score >= 40 ? "#F59E0B" : "#38BDF8";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 rounded-full flex-1" style={{ background: "#17212C", minWidth: 60 }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="font-mono text-[11px] w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

function emailStatusColor(s: EmailAlertRecord["status"]) {
  return s === "SENT" ? "#22C55E" : s === "FAILED" ? "#EF4444" : s === "SENDING" ? "#F59E0B" : "#475569";
}
function emailStatusLabel(s: EmailAlertRecord["status"]) {
  return s === "SENT" ? "✓ Email sent" : s === "FAILED" ? "⚠ Email failed" : s === "SENDING" ? "✉ Sending alert" : "✉ Pending";
}

// ── Incident detail drawer ───────────────────────────────────────────────────

function IncidentDetail({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const { acknowledgeIncident, investigateIncident, resolveIncident, removeIncident } = useStore();
  const [status, setStatus]         = useState<IncidentStatus>(incident.status);
  const [saving, setSaving]         = useState(false);
  const [evidence, setEvidence]     = useState<Evidence[]>([]);
  const [emailAlert, setEmailAlert] = useState<EmailAlertRecord | null>(() => getAlertForIncident(incident.id));

  // Keep status in sync if incident is updated externally (e.g. from realtime)
  useEffect(() => { setStatus(incident.status); }, [incident.status]);

  // Load linked evidence clips
  useEffect(() => {
    fetchEvidenceForIncident(incident.id).then(setEvidence).catch(() => {});
  }, [incident.id]);

  // Poll email alert status
  useEffect(() => {
    const id = setInterval(() => {
      const rec = getAlertForIncident(incident.id);
      setEmailAlert(prev => {
        if (!prev && !rec) return null;
        if (!rec) return null;
        if (prev?.status === rec.status) return prev;
        return rec;
      });
    }, 800);
    return () => clearInterval(id);
  }, [incident.id]);

  const stepIdx   = statusSteps.indexOf(status);
  const nextAction = { NEW: "ACKNOWLEDGE", ACKNOWLEDGED: "INVESTIGATE", INVESTIGATING: "RESOLVE", RESOLVED: null }[status];

  async function advance() {
    if (!nextAction || saving) return;
    setSaving(true);
    try {
      if (nextAction === "ACKNOWLEDGE") { await acknowledgeIncident(incident.id); setStatus("ACKNOWLEDGED"); }
      if (nextAction === "INVESTIGATE") { await investigateIncident(incident.id); setStatus("INVESTIGATING"); }
      if (nextAction === "RESOLVE")     { await resolveIncident(incident.id);     setStatus("RESOLVED"); }
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Delete incident ${incident.id}? This cannot be undone.`)) return;
    await removeIncident(incident.id);
    onClose();
  }

  const timeline = buildTimeline({ ...incident, status });
  const videoEvidence = evidence.find(e => e.videoUrl);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col animate-slide-in"
      style={{ width: 480, background: "#0B1017", borderLeft: "1px solid #24303D", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-semibold text-sm" style={{ color: "#22D3EE" }}>{incident.id}</span>
            <Badge variant={incident.severity} />
            <Badge variant={status} />
          </div>
          <div className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>{eventLabel(incident.eventType)}</div>
        </div>
        <button onClick={onClose} className="transition-colors" style={{ color: "#475569" }}>
          <XIcon size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Key info grid */}
        <div className="grid grid-cols-2 gap-px" style={{ background: "#1A242F" }}>
          {[
            { label: "Camera",     value: incident.cameraName || incident.cameraId, mono: true },
            { label: "Zone",       value: incident.zoneName,   mono: false },
            { label: "Person",     value: incident.personId,   mono: true },
            { label: "Detected",   value: formatDateTime(incident.detectedAt), mono: true },
            { label: "Confidence", value: `${incident.confidence}%`, mono: true, color: "#22D3EE" },
            { label: "Risk Score", value: String(incident.riskScore), mono: true, color: incident.riskScore >= 80 ? "#EF4444" : "#F97316" },
          ].map(f => (
            <div key={f.label} className="px-5 py-3" style={{ background: "#0B1017" }}>
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: "#475569" }}>{f.label}</div>
              <div className={`text-sm ${f.mono ? "font-mono" : ""} truncate`} style={{ color: f.color ?? "#CBD5E1" }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* Risk bar */}
        <div className="px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#475569" }}>Risk Score</div>
          <RiskBar score={incident.riskScore} />
        </div>

        {/* Description */}
        <div className="px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#475569" }}>Description</div>
          <p className="text-xs leading-relaxed" style={{ color: "#CBD5E1" }}>{describeIncident(incident)}</p>
        </div>

        {/* Evidence clip / snapshot */}
        <div className="px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono tracking-wider uppercase" style={{ color: "#475569" }}>Evidence</div>
            {evidence.length > 0 && (
              <span className="font-mono text-[10px]" style={{ color: "#22D3EE" }}>{evidence.length} clip{evidence.length > 1 ? "s" : ""}</span>
            )}
          </div>
          {videoEvidence?.videoUrl ? (
            <video
              src={videoEvidence.videoUrl}
              controls
              className="w-full rounded-[8px]"
              style={{ aspectRatio: "16/9", background: "#070A0F" }}
            />
          ) : (
            <div
              className="relative rounded-[8px] overflow-hidden"
              style={{ aspectRatio: "16/9", background: "#070A0F" }}
            >
              <div className="absolute inset-0" style={{
                background: incident.severity === "CRITICAL"
                  ? "linear-gradient(135deg, #180c08, #1c1008)"
                  : "linear-gradient(135deg, #0a1420, #0d1e2c)",
              }} />
              <div className="absolute inset-0" style={{
                backgroundImage: "linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }} />
              {/* Simulated detection box */}
              <div
                className="detection-box absolute"
                style={{
                  top: "18%", left: "28%", width: "22%", height: "56%",
                  border: `1.5px solid ${incident.severity === "CRITICAL" ? "#EF4444" : "#F97316"}`,
                }}
              >
                <div className="absolute -top-5 left-0 font-mono text-[9px] px-1.5 rounded-sm" style={{ background: "#EF4444", color: "#fff" }}>
                  {incident.personId} · {incident.confidence}%
                </div>
              </div>
              <div
                className="zone-overlay absolute"
                style={{ bottom: "8%", left: "10%", right: "10%", height: "40%" }}
              >
                <div className="absolute top-1 left-2 font-mono text-[9px]" style={{ color: "#EF4444" }}>
                  {incident.zoneName.toUpperCase()}
                </div>
              </div>
              <div className="absolute inset-0 scanline" />
              <div className="absolute top-2 left-2 font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "#64748B" }}>
                {incident.cameraId} · {formatTime(incident.detectedAt)}
              </div>
              {evidence.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono text-[10px]" style={{ color: "#475569" }}>No clip saved</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status workflow */}
        <div className="px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "#475569" }}>Status Workflow</div>
          <div className="flex items-center gap-0">
            {statusSteps.map((s, i) => {
              const done   = i < stepIdx;
              const active = i === stepIdx;
              const color  = done || active
                ? ({ NEW: "#EF4444", ACKNOWLEDGED: "#F59E0B", INVESTIGATING: "#3B82F6", RESOLVED: "#22C55E" } as Record<string,string>)[s]
                : "#24303D";
              return (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{ width: 24, height: 24, background: done || active ? color + "20" : "#17212C", border: `1.5px solid ${color}` }}
                    >
                      {done
                        ? <CheckIcon size={10} style={{ color }} />
                        : <span className="font-mono text-[8px] font-bold" style={{ color }}>{i + 1}</span>}
                    </div>
                    <span className="font-mono text-[9px] text-center" style={{ color: active ? color : "#475569", fontSize: 8 }}>{s}</span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className="flex-1 h-px mb-4" style={{ background: i < stepIdx ? color : "#24303D" }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "#475569" }}>Incident Timeline</div>
          <div className="space-y-0">
            {timeline.map((t, i) => {
              const isLast = !emailAlert && i === timeline.length - 1;
              return (
                <div key={i} className="flex gap-3 pb-3">
                  <div className="flex flex-col items-center flex-shrink-0" style={{ width: 8 }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: isLast ? "#EF4444" : "#22D3EE" }} />
                    {!isLast && <div className="w-px flex-1 mt-1" style={{ background: "#24303D" }} />}
                  </div>
                  <div>
                    <div className="font-mono text-[10px] mb-0.5" style={{ color: "#22D3EE" }}>{t.time}</div>
                    <div className="text-xs" style={{ color: "#CBD5E1" }}>{t.event}</div>
                  </div>
                </div>
              );
            })}
            {emailAlert && (
              <div className="flex gap-3 pb-3">
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: 8 }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: emailStatusColor(emailAlert.status) }} />
                </div>
                <div>
                  <div className="font-mono text-[10px] mb-0.5" style={{ color: "#22D3EE" }}>
                    {emailAlert.sentAt
                      ? new Date(emailAlert.sentAt).toLocaleTimeString("en-GB", { hour12: false })
                      : new Date(emailAlert.createdAt).toLocaleTimeString("en-GB", { hour12: false })}
                  </div>
                  <div className="text-xs" style={{ color: emailStatusColor(emailAlert.status) }}>
                    {emailStatusLabel(emailAlert.status)}{emailAlert.recipient ? ` to ${emailAlert.recipient}` : ""}
                  </div>
                  {emailAlert.status === "FAILED" && emailAlert.error && (
                    <div className="text-[10px] mt-0.5" style={{ color: "#64748B" }}>{emailAlert.error}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alert delivery */}
        {emailAlert && (
          <div className="px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-3" style={{ color: "#475569" }}>Alert Delivery</div>
            <div className="rounded-[8px] p-4 space-y-3" style={{ background: "#111821", border: "1px solid #24303D" }}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                <div>
                  <div className="font-mono text-[10px] uppercase" style={{ color: "#475569" }}>Channel</div>
                  <div className="text-xs mt-0.5" style={{ color: "#CBD5E1" }}>Email</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase" style={{ color: "#475569" }}>Status</div>
                  <div className="text-xs mt-0.5 font-semibold" style={{ color: emailStatusColor(emailAlert.status) }}>{emailAlert.status}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase" style={{ color: "#475569" }}>Recipient</div>
                  <div className="text-xs mt-0.5" style={{ color: "#CBD5E1" }}>{emailAlert.recipient}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase" style={{ color: "#475569" }}>Sent At</div>
                  <div className="text-xs mt-0.5" style={{ color: "#CBD5E1" }}>
                    {emailAlert.sentAt ? new Date(emailAlert.sentAt).toLocaleTimeString("en-GB", { hour12: false }) : "—"}
                  </div>
                </div>
              </div>
              {emailAlert.status === "FAILED" && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-[6px]" style={{ background: "#1a0808", border: "1px solid #EF444430" }}>
                  <span style={{ color: "#EF4444" }}>⚠</span>
                  <div className="text-[11px]" style={{ color: "#EF4444" }}>Unable to send security alert. {emailAlert.error}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 space-y-2" style={{ borderTop: "1px solid #1A242F" }}>
        {nextAction && (
          <button
            onClick={advance}
            disabled={saving}
            className="w-full py-2.5 rounded-[8px] font-semibold text-sm transition-all disabled:opacity-50"
            style={{
              background: nextAction === "RESOLVE" ? "#0d2a1a" : nextAction === "ACKNOWLEDGE" ? "#200808" : "#0d1a2e",
              color:      nextAction === "RESOLVE" ? "#22C55E" : nextAction === "ACKNOWLEDGE" ? "#EF4444" : "#3B82F6",
              border: `1px solid ${nextAction === "RESOLVE" ? "#22C55E40" : nextAction === "ACKNOWLEDGE" ? "#EF444440" : "#3B82F640"}`,
            }}
          >
            {saving ? "SAVING…" : nextAction}
          </button>
        )}
        {status === "RESOLVED" && (
          <div className="flex items-center justify-center gap-2 py-2.5">
            <CheckIcon size={14} style={{ color: "#22C55E" }} />
            <span className="font-mono text-xs" style={{ color: "#22C55E" }}>INCIDENT RESOLVED</span>
          </div>
        )}
        <button
          onClick={handleDelete}
          className="w-full py-2 rounded-[8px] text-sm transition-all"
          style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          Delete Incident
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-[8px] text-sm transition-all"
          style={{ background: "#17212C", color: "#64748B", border: "1px solid #24303D" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main incidents page ──────────────────────────────────────────────────────

export default function Incidents() {
  const { state, reloadIncidents } = useStore();
  const [search,       setSearch]       = useState("");
  const [sevFilter,    setSevFilter]    = useState<Severity | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "ALL">("ALL");
  const [selected,     setSelected]     = useState<Incident | null>(null);

  // Reload incidents when page mounts and on window focus
  useEffect(() => {
    reloadIncidents();
    const onFocus = () => reloadIncidents();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reloadIncidents]);

  // Keep selected incident in sync with store updates
  useEffect(() => {
    if (!selected) return;
    const updated = state.incidents.find(i => i.id === selected.id);
    if (updated) setSelected(updated);
    else setSelected(null);
  }, [state.incidents]);

  const loading = state.incidentsLoad === "loading";

  const filtered = state.incidents
    .filter(i => sevFilter    === "ALL" || i.severity === sevFilter)
    .filter(i => statusFilter === "ALL" || i.status   === statusFilter)
    .filter(i => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        i.id.toLowerCase().includes(q) ||
        eventLabel(i.eventType).toLowerCase().includes(q) ||
        i.cameraId.toLowerCase().includes(q) ||
        (i.cameraName ?? "").toLowerCase().includes(q) ||
        i.zoneName.toLowerCase().includes(q) ||
        i.personId.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const sd = sevOrder[a.severity] - sevOrder[b.severity];
      if (sd !== 0) return sd;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });

  const newCount = state.incidents.filter(i => i.status === "NEW").length;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-6 py-3 flex-shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid #1A242F", background: "#0B1017" }}
      >
        {/* Live badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: newCount > 0 ? "#EF4444" : "#22C55E", boxShadow: `0 0 5px ${newCount > 0 ? "#EF4444" : "#22C55E"}` }} />
          <span className="font-mono text-[10px] tracking-widest" style={{ color: newCount > 0 ? "#EF4444" : "#22C55E" }}>
            {newCount > 0 ? `${newCount} NEW` : "ALL CLEAR"}
          </span>
        </div>

        <div style={{ width: 1, height: 20, background: "#1A242F" }} />

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-[6px]"
          style={{ background: "#111821", border: "1px solid #24303D", minWidth: 220 }}
        >
          <SearchIcon size={12} style={{ color: "#475569" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search incidents..."
            className="bg-transparent outline-none text-xs flex-1"
            style={{ color: "#CBD5E1" }}
          />
          {search && <button onClick={() => setSearch("")}><XIcon size={11} style={{ color: "#475569" }} /></button>}
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1">
          {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              className="font-mono text-[10px] px-2 py-1 rounded transition-colors"
              style={{
                background: sevFilter === s ? "#17212C" : "transparent",
                color: sevFilter === s ? "#22D3EE" : "#475569",
                border: `1px solid ${sevFilter === s ? "#24303D" : "transparent"}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: "#1A242F" }} />

        {/* Status filter */}
        <div className="flex items-center gap-1">
          {(["ALL", "NEW", "ACKNOWLEDGED", "INVESTIGATING", "RESOLVED"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="font-mono text-[10px] px-2 py-1 rounded transition-colors"
              style={{
                background: statusFilter === s ? "#17212C" : "transparent",
                color: statusFilter === s ? "#22D3EE" : "#475569",
                border: `1px solid ${statusFilter === s ? "#24303D" : "transparent"}`,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[10px]" style={{ color: "#475569" }}>
            {filtered.length} of {state.incidents.length} incident{state.incidents.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={reloadIncidents}
            className="font-mono text-[10px] px-2.5 py-1 rounded-[6px] transition-all"
            style={{ background: "#17212C", color: "#22D3EE", border: "1px solid #24303D" }}
          >
            ↺ REFRESH
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="flex gap-2">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ background: "#22D3EE", boxShadow: "0 0 6px #22D3EE", animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#475569" }}>Loading incidents…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="flex items-center justify-center rounded-full" style={{ width: 48, height: 48, background: "#17212C" }}>
              <CheckIcon size={20} style={{ color: "#22C55E" }} />
            </div>
            <div className="text-sm font-medium" style={{ color: "#CBD5E1" }}>
              {state.incidents.length === 0 ? "No incidents recorded" : "No matches"}
            </div>
            <div className="text-xs" style={{ color: "#64748B" }}>
              {state.incidents.length === 0
                ? "Incidents appear here when AI detects a restricted area breach."
                : "No incidents match your current filters."}
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10" style={{ background: "#0B1017" }}>
              <tr style={{ borderBottom: "1px solid #1A242F" }}>
                {["ID", "Severity", "Type", "Camera", "Zone", "Person", "Detected", "Risk", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] tracking-wider uppercase" style={{ color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inc, idx) => (
                <tr
                  key={inc.id}
                  className="cursor-pointer transition-all animate-fade-in"
                  style={{ borderBottom: "1px solid #1A242F", animationDelay: `${idx * 30}ms`, animationFillMode: "both" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#0D1520"; e.currentTarget.style.boxShadow = "inset 2px 0 0 #00F5FF30"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "none"; }}
                  onClick={() => setSelected(inc)}
                >
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "#22D3EE", textShadow: "0 0 8px rgba(34,211,238,0.4)" }}>{inc.id}</td>
                  <td className="px-4 py-3"><Badge variant={inc.severity} /></td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#CBD5E1" }}>{eventLabel(inc.eventType)}</td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "#64748B" }}>{inc.cameraId}</td>
                  <td className="px-4 py-3 text-[11px] max-w-[140px] truncate" style={{ color: "#64748B" }}>{inc.zoneName}</td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "#CBD5E1" }}>{inc.personId}</td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "#475569" }}>{formatTime(inc.detectedAt)}</td>
                  <td className="px-4 py-3" style={{ minWidth: 120 }}><RiskBar score={inc.riskScore} /></td>
                  <td className="px-4 py-3"><Badge variant={inc.status} /></td>
                  <td className="px-4 py-3">
                    <button
                      style={{ color: "#475569" }}
                      onClick={e => { e.stopPropagation(); setSelected(inc); }}
                    >
                      <ArrowRightIcon size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(7,10,15,0.4)" }} onClick={() => setSelected(null)} />
          <IncidentDetail incident={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}
