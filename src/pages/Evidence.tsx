import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Evidence, Severity, EvidenceStatus } from "../lib/types";
import { useStore } from "../lib/store";
import { updateEvidenceStatus } from "../lib/api";
import { loadLocalEvidence, getBlobUrl, deleteLocalEvidence, type LocalEvidence } from "../lib/clipStore";
import { SearchIcon, RefreshIcon, TrashIcon, DownloadIcon, XIcon, CheckIcon } from "../icons";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDuration(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

const SEV_COLOR: Record<Severity, string> = {
  CRITICAL: "#FF2D2D", HIGH: "#FF6B35", MEDIUM: "#FFB800", LOW: "#38BDF8",
};
const SEV_BG: Record<Severity, string> = {
  CRITICAL: "#200808", HIGH: "#1a1008", MEDIUM: "#1a1508", LOW: "#081218",
};
const STATUS_COLOR: Record<EvidenceStatus, string> = {
  RECORDING: "#FF2D2D", PROCESSING: "#FFB800", SAVED: "#00FF88",
  FAILED: "#FF2D2D", UNAVAILABLE: "#4A6580",
};

// Unified display type (covers both local and backend evidence)
interface DisplayEvidence extends Omit<Evidence, "personId" | "riskScore" | "thumbnailUrl"> {
  personId: string;
  riskScore: number;
  thumbnailUrl: string | null;
  isLocal: boolean; // true = came from IndexedDB/localStorage
}

function localToDisplay(local: LocalEvidence, videoUrl: string | null): DisplayEvidence {
  return {
    id: local.id,
    incidentId: local.incidentId,
    cameraId: local.cameraId,
    cameraName: local.cameraName,
    zoneId: local.zoneId,
    zoneName: local.zoneName,
    personId: "–",
    videoUrl,
    thumbnailUrl: null,
    eventType: local.eventType as any,
    severity: local.severity as Severity,
    confidence: local.confidence,
    riskScore: Math.min(100, Math.round(local.confidence * 0.9 + 10)),
    recordingStartedAt: local.detectedAt,
    detectedAt: local.detectedAt,
    recordingEndedAt: local.createdAt,
    duration: local.duration,
    status: videoUrl ? "SAVED" : "UNAVAILABLE",
    createdAt: local.createdAt,
    isLocal: true,
  };
}

// ── Video modal ───────────────────────────────────────────────────────────────

function EvidenceModal({ evd, onClose, onDelete }: {
  evd: DisplayEvidence; onClose: () => void; onDelete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoErr, setVideoErr] = useState(false);
  const c = SEV_COLOR[evd.severity];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(4,7,9,0.93)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-3xl rounded-[14px] overflow-hidden animate-fade-in"
        style={{ background: "#0D1520", border: `1px solid ${c}30`, boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #152030" }}>
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span
                className="font-display font-bold text-sm tracking-widest uppercase"
                style={{ color: c, textShadow: `0 0 10px ${c}60` }}
              >
                {evd.id}
              </span>
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: SEV_BG[evd.severity], color: c, border: `1px solid ${c}30` }}
              >
                {evd.severity}
              </span>
              <span
                className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "#131F2E", color: STATUS_COLOR[evd.status], border: "1px solid #1E2D3D" }}
              >
                {evd.status}
              </span>
              {evd.isLocal && (
                <span className="font-mono text-[9px] px-2 py-0.5 rounded-full" style={{ background: "#0d1a2a", color: "#38BDF8", border: "1px solid #38bdf830" }}>
                  LOCAL
                </span>
              )}
            </div>
            <div className="font-mono text-[10px]" style={{ color: "#4A6580" }}>
              {evd.incidentId} · {evd.cameraId} · {evd.zoneName}
            </div>
          </div>
          <button onClick={onClose} className="text-[#4A6580] hover:text-[#E8F4FD] transition-colors">
            <XIcon size={16} />
          </button>
        </div>

        {/* Video */}
        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          {!evd.videoUrl || videoErr ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="font-mono text-[11px] font-bold tracking-widest uppercase" style={{ color: "#4A6580" }}>
                VIDEO UNAVAILABLE
              </div>
              <div className="text-[11px]" style={{ color: "#2E4560" }}>
                {!evd.videoUrl ? "No clip was recorded for this event." : "Clip may have been cleared by the browser."}
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={evd.videoUrl}
                controls autoPlay loop
                onError={() => setVideoErr(true)}
                className="absolute inset-0 w-full h-full object-contain"
              />
              {["tl","tr","bl","br"].map(cor => (
                <div key={cor} className="absolute pointer-events-none" style={{
                  top: cor.startsWith("t") ? 10 : undefined, bottom: cor.startsWith("b") ? 10 : undefined,
                  left: cor.endsWith("l") ? 10 : undefined, right: cor.endsWith("r") ? 10 : undefined,
                  width: 14, height: 14, zIndex: 10,
                  borderTop: cor.startsWith("t") ? `1.5px solid ${c}60` : undefined,
                  borderBottom: cor.startsWith("b") ? `1.5px solid ${c}60` : undefined,
                  borderLeft: cor.endsWith("l") ? `1.5px solid ${c}60` : undefined,
                  borderRight: cor.endsWith("r") ? `1.5px solid ${c}60` : undefined,
                }} />
              ))}
            </>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-4 gap-px" style={{ background: "#152030" }}>
          {[
            { label: "Camera",     val: evd.cameraId,                     color: "#00F5FF" },
            { label: "Zone",       val: evd.zoneName,                     color: "#94B4CC" },
            { label: "Confidence", val: `${evd.confidence}%`,             color: "#FFB800" },
            { label: "Duration",   val: formatDuration(evd.duration),     color: "#94B4CC" },
            { label: "Risk Score", val: `${evd.riskScore}`,               color: c },
            { label: "Event",      val: evd.eventType.replace(/_/g, " "), color: "#94B4CC" },
            { label: "Detected",   val: new Date(evd.detectedAt).toLocaleTimeString("en-GB", { hour12: false }), color: "#94B4CC" },
            { label: "Person",     val: evd.personId,                     color: "#4A6580" },
          ].map(f => (
            <div key={f.label} className="px-4 py-3" style={{ background: "#0D1520" }}>
              <div className="font-mono text-[9px] uppercase tracking-wider mb-1" style={{ color: "#2E4560" }}>{f.label}</div>
              <div className="text-sm font-mono truncate" style={{ color: f.color }}>{f.val}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 py-4" style={{ borderTop: "1px solid #152030" }}>
          {evd.videoUrl && (
            <a
              href={evd.videoUrl}
              download={`${evd.id}.webm`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-medium"
              style={{ background: "#131F2E", color: "#94B4CC", border: "1px solid #1E2D3D" }}
            >
              <DownloadIcon size={11} /> Download clip
            </a>
          )}
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-medium"
            style={{ background: "#200808", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.25)" }}
          >
            <TrashIcon size={11} /> Delete
          </button>
          <button onClick={onClose} className="ml-auto px-3 py-2 rounded-[6px] text-xs font-mono" style={{ color: "#4A6580" }}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Evidence card ─────────────────────────────────────────────────────────────

function EvidenceCard({ evd, onOpen, onDelete, deleting }: {
  evd: DisplayEvidence; onOpen: () => void; onDelete: () => void; deleting: boolean;
}) {
  const c = SEV_COLOR[evd.severity];
  return (
    <div
      className="rounded-[10px] overflow-hidden animate-fade-in"
      style={{
        background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)",
        border: `1px solid ${evd.status === "SAVED" ? `${c}30` : "#1E2D3D"}`,
        boxShadow: evd.status === "SAVED" ? `0 0 20px ${c}08` : undefined,
      }}
    >
      {/* Thumbnail / inline video preview */}
      <div
        className="relative cursor-pointer group"
        style={{ aspectRatio: "16/9", background: "#000" }}
        onClick={onOpen}
      >
        {evd.videoUrl ? (
          <>
            <video
              src={evd.videoUrl}
              className="absolute inset-0 w-full h-full object-cover"
              muted preload="metadata"
            />
            {/* Play overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(4,7,9,0.5)" }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 44, height: 44, background: `${c}20`, border: `1.5px solid ${c}` }}
              >
                <span style={{ color: c, fontSize: 18 }}>▶</span>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ background: "#050b10" }}>
            <div className="font-mono text-[10px]" style={{ color: "#2E4560" }}>NO CLIP</div>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
            style={{ background: SEV_BG[evd.severity], color: c, border: `1px solid ${c}30` }}>
            {evd.severity}
          </span>
          {evd.isLocal && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm"
              style={{ background: "rgba(56,189,248,0.1)", color: "#38BDF8", border: "1px solid #38bdf830" }}>
              LOCAL
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.7)", color: STATUS_COLOR[evd.status] }}>
            {evd.status}
          </span>
        </div>
        <div className="absolute bottom-2 right-2">
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "#4A6580" }}>
            {formatDuration(evd.duration)}
          </span>
        </div>

        {["tl","tr","bl","br"].map(cor => (
          <div key={cor} className="absolute pointer-events-none" style={{
            top: cor.startsWith("t") ? 6 : undefined, bottom: cor.startsWith("b") ? 6 : undefined,
            left: cor.endsWith("l") ? 6 : undefined, right: cor.endsWith("r") ? 6 : undefined,
            width: 10, height: 10,
            borderTop: cor.startsWith("t") ? `1.5px solid ${c}40` : undefined,
            borderBottom: cor.startsWith("b") ? `1.5px solid ${c}40` : undefined,
            borderLeft: cor.endsWith("l") ? `1.5px solid ${c}40` : undefined,
            borderRight: cor.endsWith("r") ? `1.5px solid ${c}40` : undefined,
          }} />
        ))}
        <div className="absolute inset-0 scanline pointer-events-none" style={{ zIndex: 1 }} />
      </div>

      {/* Info row */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs font-bold" style={{ color: c }}>{evd.id}</span>
            </div>
            <div className="text-[11px] truncate" style={{ color: "#94B4CC" }}>{evd.zoneName} · {evd.cameraId}</div>
          </div>
          <div className="font-mono text-[10px] flex-shrink-0" style={{ color: "#2E4560" }}>
            {timeAgo(evd.createdAt)}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span className="font-mono text-[10px]" style={{ color: "#4A6580" }}>Conf: {evd.confidence}%</span>
          <span className="font-mono text-[10px]" style={{ color: "#4A6580" }}>
            {new Date(evd.detectedAt).toLocaleTimeString("en-GB", { hour12: false })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpen}
            className="flex-1 py-1.5 rounded-[6px] text-[11px] font-medium transition-colors"
            style={{ background: "#131F2E", color: "#94B4CC", border: "1px solid #1E2D3D" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = c + "50"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#1E2D3D"; }}
          >
            ▶ Play Evidence
          </button>
          {evd.videoUrl && (
            <a
              href={evd.videoUrl} download={`${evd.id}.webm`}
              className="py-1.5 px-2.5 rounded-[6px]"
              style={{ background: "#131F2E", color: "#4A6580", border: "1px solid #1E2D3D" }}
              title="Download clip"
            >
              <DownloadIcon size={11} />
            </a>
          )}
          <button
            onClick={onDelete} disabled={deleting}
            className="py-1.5 px-2.5 rounded-[6px]"
            style={{ background: "#200808", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.25)", opacity: deleting ? 0.5 : 1 }}
            title="Delete"
          >
            <TrashIcon size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

type SevFilter    = "ALL" | Severity;
type StatusFilter = "ALL" | EvidenceStatus;

// ── Main Evidence page ────────────────────────────────────────────────────────

export default function Evidence() {
  const { state, reloadEvidence, removeEvidence } = useStore();
  const backendEvidence = state.evidence;

  // Local evidence from IndexedDB + localStorage
  const [localEvidence, setLocalEvidence] = useState<DisplayEvidence[]>([]);
  const [localLoading, setLocalLoading]   = useState(true);

  const loadLocal = useCallback(async () => {
    setLocalLoading(true);
    try {
      const items = loadLocalEvidence();
      const withUrls = await Promise.all(
        items.map(async (item: LocalEvidence) => {
          const url = item.hasBlob ? await getBlobUrl(item.id) : null;
          return localToDisplay(item, url);
        })
      );
      setLocalEvidence(withUrls);
    } catch (e) {
      console.warn("loadLocal error:", e);
    }
    setLocalLoading(false);
  }, []);

  useEffect(() => { loadLocal(); }, [loadLocal]);

  // Merge: local first, then backend (deduplicate by id)
  const allEvidence: DisplayEvidence[] = useMemo(() => {
    const backendMapped: DisplayEvidence[] = backendEvidence.map(e => ({ ...e, isLocal: false }));
    const combined = [...localEvidence, ...backendMapped];
    const seen = new Set<string>();
    return combined.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [localEvidence, backendEvidence]);

  const [search,       setSearch]       = useState("");
  const [sevFilter,    setSevFilter]    = useState<SevFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [camFilter,    setCamFilter]    = useState("ALL");
  const [selected,     setSelected]     = useState<DisplayEvidence | null>(null);
  const [deleting,     setDeleting]     = useState<string | null>(null);

  const handleDelete = useCallback(async (evd: DisplayEvidence) => {
    setDeleting(evd.id);
    if (evd.isLocal) {
      deleteLocalEvidence(evd.id);
      setLocalEvidence(prev => prev.filter(e => e.id !== evd.id));
    } else {
      await removeEvidence(evd.id);
    }
    setDeleting(null);
  }, [removeEvidence]);

  const allCams = ["ALL", ...Array.from(new Set(allEvidence.map(e => e.cameraId))).sort()];

  const filtered = allEvidence.filter(e => {
    if (sevFilter    !== "ALL" && e.severity !== sevFilter)    return false;
    if (statusFilter !== "ALL" && e.status   !== statusFilter) return false;
    if (camFilter    !== "ALL" && e.cameraId !== camFilter)    return false;
    if (search) {
      const q = search.toLowerCase();
      return e.id.toLowerCase().includes(q)
        || e.zoneName.toLowerCase().includes(q)
        || e.cameraId.toLowerCase().includes(q);
    }
    return true;
  });

  const savedCount    = allEvidence.filter(e => e.status === "SAVED").length;
  const criticalCount = allEvidence.filter(e => e.severity === "CRITICAL").length;
  const loading = localLoading && allEvidence.length === 0;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg, #06111A 0%, #040709 100%)" }}>

      {/* Header */}
      <div
        className="flex items-center gap-4 px-6 py-3 flex-shrink-0 flex-wrap gap-y-2"
        style={{ borderBottom: "1px solid #152030", background: "#080E15" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-sm tracking-widest uppercase" style={{ color: "#E8F4FD" }}>Evidence Library</span>
            <span className="font-mono text-[10px]" style={{ color: "#4A6580" }}>
              {allEvidence.length} total
              {savedCount > 0 && <span style={{ color: "#00FF88" }}> · {savedCount} with clip</span>}
              {criticalCount > 0 && <span style={{ color: "#FF2D2D" }}> · {criticalCount} critical</span>}
            </span>
          </div>
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-[6px]"
          style={{ background: "#0D1520", border: "1px solid #1E2D3D", minWidth: 200 }}
        >
          <SearchIcon size={12} style={{ color: "#4A6580" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ID, camera, zone…"
            className="bg-transparent outline-none text-xs flex-1 font-mono"
            style={{ color: "#94B4CC" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ color: "#4A6580" }}>✕</button>}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5">
            {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as SevFilter[]).map(s => (
              <button key={s} onClick={() => setSevFilter(s)}
                className="font-mono text-[9px] px-2 py-1 rounded transition-colors"
                style={{
                  background: sevFilter === s ? (s === "ALL" ? "#131F2E" : SEV_BG[s as Severity]) : "transparent",
                  color: sevFilter === s ? (s === "ALL" ? "#94B4CC" : SEV_COLOR[s as Severity]) : "#2E4560",
                  border: `1px solid ${sevFilter === s ? (s === "ALL" ? "#1E2D3D" : SEV_COLOR[s as Severity] + "40") : "transparent"}`,
                }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 16, background: "#1E2D3D" }} />
          <div className="flex items-center gap-0.5">
            {(["ALL", "SAVED", "UNAVAILABLE"] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="font-mono text-[9px] px-2 py-1 rounded transition-colors"
                style={{
                  background: statusFilter === s ? "#131F2E" : "transparent",
                  color: statusFilter === s ? (s === "ALL" ? "#94B4CC" : STATUS_COLOR[s as EvidenceStatus]) : "#2E4560",
                  border: `1px solid ${statusFilter === s ? "#1E2D3D" : "transparent"}`,
                }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 16, background: "#1E2D3D" }} />
          <select
            value={camFilter} onChange={e => setCamFilter(e.target.value)}
            className="font-mono text-[10px] px-2 py-1.5 rounded-[6px] outline-none"
            style={{ background: "#0D1520", color: "#94B4CC", border: "1px solid #1E2D3D", minWidth: 90 }}
          >
            {allCams.map(c => <option key={c} value={c}>{c === "ALL" ? "All cameras" : c}</option>)}
          </select>
        </div>

        <button
          onClick={() => { loadLocal(); reloadEvidence(); }}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[6px]"
          style={{ background: "#0D1520", color: "#94B4CC", border: "1px solid #1E2D3D", opacity: loading ? 0.5 : 1 }}
        >
          <RefreshIcon size={11} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">

        {loading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ background: "#00F5FF", boxShadow: "0 0 8px #00F5FF", animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <div className="font-mono text-[10px] tracking-widest" style={{ color: "#4A6580" }}>Loading evidence…</div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 56, height: 56, background: "#0D1520", border: "1px solid #1E2D3D" }}
            >
              <span className="text-2xl">📹</span>
            </div>
            <div>
              <div className="font-display font-semibold text-sm tracking-widest uppercase text-center mb-1" style={{ color: "#94B4CC" }}>
                {allEvidence.length === 0 ? "No Evidence Clips" : "No Matching Evidence"}
              </div>
              <div className="text-[11px] text-center max-w-xs" style={{ color: "#4A6580" }}>
                {allEvidence.length === 0
                  ? "Go to Live Monitoring, draw a restricted zone, and clips are saved here automatically when a person enters."
                  : "Try adjusting your search or filters."}
              </div>
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {filtered.map(evd => (
              <EvidenceCard
                key={evd.id}
                evd={evd}
                onOpen={() => setSelected(evd)}
                onDelete={() => handleDelete(evd)}
                deleting={deleting === evd.id}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <EvidenceModal
          evd={selected}
          onClose={() => setSelected(null)}
          onDelete={() => { handleDelete(selected); setSelected(null); }}
        />
      )}
    </div>
  );
}
