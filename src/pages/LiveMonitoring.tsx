import React, { useState, useRef, useCallback } from "react";
import { Badge } from "../components/Badge";
import {
  CameraIcon, MaximizeIcon, RefreshIcon, XIcon,
  EyeIcon, ActivityIcon,
} from "../icons";
import { useStore } from "../lib/store";

type CameraSlot = { id: string; name: string; status: "LIVE" | "OFFLINE" | "WARNING"; zone: string; people: number; fps: number; resolution: string };
const DEFAULT_CAMERAS: CameraSlot[] = [
  { id: "CAM-01", name: "Main Entrance",      status: "LIVE",    zone: "Entry Zone",      people: 0, fps: 30, resolution: "1920×1080" },
  { id: "CAM-02", name: "Server Room",        status: "LIVE",    zone: "Restricted",      people: 0, fps: 30, resolution: "1920×1080" },
  { id: "CAM-03", name: "Loading Bay",        status: "WARNING", zone: "Loading Area",    people: 1, fps: 25, resolution: "1280×720"  },
  { id: "CAM-04", name: "Parking Lot A",      status: "LIVE",    zone: "Perimeter",       people: 0, fps: 30, resolution: "1920×1080" },
  { id: "CAM-05", name: "Emergency Exit",     status: "OFFLINE", zone: "Exit Zone",       people: 0, fps: 0,  resolution: "—"         },
  { id: "CAM-06", name: "Roof Access",        status: "LIVE",    zone: "Restricted",      people: 0, fps: 30, resolution: "1920×1080" },
  { id: "CAM-07", name: "Reception",          status: "LIVE",    zone: "Public Area",     people: 2, fps: 30, resolution: "1920×1080" },
  { id: "CAM-08", name: "Basement Storage",   status: "OFFLINE", zone: "Storage",         people: 0, fps: 0,  resolution: "—"         },
];
import DetectionCamera, { type IntrusionEvent } from "../components/DetectionCamera";
import ConnectCameraModal, { type ConnectedCamera } from "../components/ConnectCameraModal";
import { setLiveStream, setSharedVideoSrc } from "../lib/liveStreamStore";

function UploadIcon({ size = 14, className = "", style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}

const camGradients: Record<string, string[]> = {
  "CAM-01": ["#0a1420", "#0d1e2c", "#071018"],
  "CAM-02": ["#0a1020", "#0a1830", "#050e1a"],
  "CAM-03": ["#180c08", "#1c1008", "#100a06"],
  "CAM-04": ["#0a1418", "#0c1820", "#081018"],
  "CAM-05": ["#080e18", "#0a1220", "#060c14"],
  "CAM-06": ["#0f0a18", "#120d20", "#080812"],
  "CAM-07": ["#0a1210", "#0c1618", "#081010"],
  "CAM-08": ["#100a0a", "#0c0808", "#080606"],
};

function getGrad(id: string) {
  const [a, b, c] = camGradients[id] ?? ["#0a1420", "#0d1e2c", "#071018"];
  return `linear-gradient(135deg, ${a} 0%, ${b} 50%, ${c} 100%)`;
}

// ─── Upload overlay ─────────────────────────────────────────────────────────

function UploadOverlay({ camId, onFile, onDismiss }: {
  camId: string; onFile: (url: string) => void; onDismiss: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("video/")) return;
    onFile(URL.createObjectURL(file));
  };

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3"
      style={{ background: dragging ? "rgba(34,211,238,0.08)" : "rgba(7,10,15,0.88)", backdropFilter: "blur(4px)" }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
    >
      <div
        className="flex flex-col items-center gap-3 px-6 py-5 rounded-[10px] text-center"
        style={{ border: `1.5px dashed ${dragging ? "#22D3EE" : "#24303D"}`, background: dragging ? "rgba(34,211,238,0.06)" : "rgba(17,24,33,0.7)", minWidth: 180 }}
      >
        <UploadIcon size={22} style={{ color: dragging ? "#22D3EE" : "#64748B" }} />
        <div>
          <div className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: dragging ? "#22D3EE" : "#CBD5E1" }}>
            {dragging ? "Drop to load" : "Upload Video Feed"}
          </div>
          <div className="text-[10px]" style={{ color: "#475569" }}>{camId} · Drag & drop or browse</div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 rounded-[6px] font-mono text-[10px] tracking-wider"
          style={{ background: "#22D3EE18", color: "#22D3EE", border: "1px solid #22D3EE40" }}
        >
          BROWSE FILES
        </button>
        <div className="font-mono text-[9px]" style={{ color: "#475569" }}>MP4 · MOV · WEBM · AVI</div>
      </div>
      <button onClick={onDismiss} className="font-mono text-[10px]" style={{ color: "#475569" }}>CANCEL</button>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

// ─── Static camera feed (no upload) ─────────────────────────────────────────

function StaticCameraFeed({ cam, onUpload, onExpand }: {
  cam: CameraSlot; onUpload: (url: string) => void; onExpand?: () => void;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const isOffline = cam.status === "OFFLINE";
  const isWarning = cam.status === "WARNING";

  return (
    <div
      className="rounded-[10px] overflow-hidden flex flex-col"
      style={{
        background: "#111821",
        border: `1px solid ${isWarning ? "#F97316" : "#24303D"}`,
        boxShadow: isWarning ? "0 0 16px rgba(249,115,22,0.1)" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 gap-2" style={{ borderBottom: `1px solid ${isWarning ? "#F9731620" : "#1A242F"}` }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] font-medium" style={{ color: "#22D3EE" }}>{cam.id}</span>
          <span className="text-[11px] truncate" style={{ color: "#CBD5E1" }}>{cam.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={cam.status} dot />
          <button onClick={() => setShowUpload(true)} title="Upload video + enable AI detection" className="text-[#475569] hover:text-[#22D3EE] transition-colors">
            <UploadIcon size={12} />
          </button>
          {onExpand && <button onClick={onExpand} className="text-[#475569] hover:text-[#CBD5E1] transition-colors"><MaximizeIcon size={12} /></button>}
        </div>
      </div>

      {/* Feed */}
      <div className="relative camera-feed" style={{ aspectRatio: "16/9" }}>
        {isOffline ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "#17212C" }}>
              <CameraIcon size={20} className="text-[#475569]" />
            </div>
            <div className="text-center">
              <div className="font-mono text-[11px] font-medium mb-1" style={{ color: "#64748B" }}>CAMERA OFFLINE</div>
              <div className="font-mono text-[10px]" style={{ color: "#475569" }}>Last: 10:38:12</div>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider px-3 py-1.5 rounded"
              style={{ background: "#22D3EE12", color: "#22D3EE", border: "1px solid #22D3EE30" }}
            >
              <UploadIcon size={10} /> UPLOAD + DETECT
            </button>
          </div>
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: getGrad(cam.id) }} />
            <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
            {cam.people > 0 && (
              <>
                <div className={`detection-box ${isWarning ? "detection-box-warning" : ""}`} style={{ top: "15%", left: "28%", width: "20%", height: "60%" }}>
                  <div className="absolute -top-5 left-0 font-mono text-[9px] px-1.5 py-0.5 rounded-sm whitespace-nowrap" style={{ background: isWarning ? "#F97316" : "#22D3EE", color: "#070A0F" }}>
                    {cam.id === "CAM-03" ? "P-104  96%" : `P-0${48 + cam.people}  ${88 + cam.people}%`}
                  </div>
                </div>
                {cam.people > 1 && (
                  <div className="detection-box" style={{ top: "20%", right: "22%", width: "16%", height: "50%" }}>
                    <div className="absolute -top-5 left-0 font-mono text-[9px] px-1.5 py-0.5 rounded-sm whitespace-nowrap" style={{ background: "#22D3EE", color: "#070A0F" }}>P-055  91%</div>
                  </div>
                )}
              </>
            )}
            {isWarning && (
              <div className="zone-overlay" style={{ bottom: "8%", left: "12%", right: "12%", height: "42%" }}>
                <div className="absolute top-1.5 left-2 font-mono text-[9px] flex items-center gap-1" style={{ color: "#EF4444" }}>
                  <span className="w-1 h-1 rounded-full bg-[#EF4444] animate-pulse-dot" />
                  RESTRICTED ZONE — INTRUSION
                </div>
              </div>
            )}
            {["tl","tr","bl","br"].map(c => (
              <div key={c} className="absolute" style={{
                top: c.startsWith("t") ? 8 : undefined, bottom: c.startsWith("b") ? 8 : undefined,
                left: c.endsWith("l") ? 8 : undefined, right: c.endsWith("r") ? 8 : undefined,
                width: 12, height: 12,
                borderTop: c.startsWith("t") ? "1.5px solid rgba(34,211,238,0.35)" : undefined,
                borderBottom: c.startsWith("b") ? "1.5px solid rgba(34,211,238,0.35)" : undefined,
                borderLeft: c.endsWith("l") ? "1.5px solid rgba(34,211,238,0.35)" : undefined,
                borderRight: c.endsWith("r") ? "1.5px solid rgba(34,211,238,0.35)" : undefined,
              }} />
            ))}
            <div className="absolute top-2 left-2 font-mono text-[9px] px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(0,0,0,0.6)", color: "#64748B" }}>{cam.fps} FPS · {cam.resolution}</div>
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: isWarning ? "#F97316" : "#EF4444" }} />
              <span className="font-mono text-[9px]" style={{ color: "#64748B" }}>REC</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center gap-2" style={{ background: "linear-gradient(transparent, rgba(7,10,15,0.85))", zIndex: 2 }}>
              <ActivityIcon size={10} style={{ color: "#22D3EE" }} />
              <span className="font-mono text-[9px]" style={{ color: "#22D3EE" }}>AI DETECTION ACTIVE</span>
              <span className="ml-auto font-mono text-[9px]" style={{ color: "#475569" }}>{cam.people}P detected</span>
            </div>
            <div className="absolute inset-0 scanline" style={{ zIndex: 1 }} />
          </>
        )}
        {showUpload && (
          <UploadOverlay camId={cam.id} onFile={url => { onUpload(url); setShowUpload(false); }} onDismiss={() => setShowUpload(false)} />
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center justify-between gap-2" style={{ borderTop: "1px solid #1A242F" }}>
        <span className="font-mono text-[10px]" style={{ color: "#475569" }}>Zone: <span style={{ color: "#CBD5E1" }}>{cam.zone ?? "—"}</span></span>
        <div className="flex gap-2">
          <button className="text-[#475569] hover:text-[#CBD5E1] transition-colors"><EyeIcon size={12} /></button>
          <button onClick={() => setShowUpload(true)} title="Upload video" className="text-[#475569] hover:text-[#22D3EE] transition-colors"><UploadIcon size={12} /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Compact uploaded camera card (grid view) ─────────────────────────────

function UploadedCameraCard({ cam, src, onRemove, onExpand }: {
  cam: CameraSlot; src: string; onRemove: () => void; onExpand: () => void;
}) {
  return (
    <div
      className="rounded-[10px] overflow-hidden flex flex-col cursor-pointer"
      style={{ background: "#111821", border: "1px solid #22D3EE30", boxShadow: "0 0 16px rgba(34,211,238,0.06)" }}
      onClick={onExpand}
    >
      <div className="flex items-center justify-between px-3 py-2 gap-2" style={{ borderBottom: "1px solid #1A242F" }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] font-medium" style={{ color: "#22D3EE" }}>{cam.id}</span>
          <span className="text-[11px] truncate" style={{ color: "#CBD5E1" }}>{cam.name}</span>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#22D3EE12", color: "#22D3EE", border: "1px solid #22D3EE30" }}>AI ACTIVE</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onRemove(); }} className="text-[#475569] hover:text-[#EF4444] transition-colors font-mono text-[10px]">✕</button>
          <MaximizeIcon size={12} className="text-[#475569]" />
        </div>
      </div>
      <div className="relative" style={{ aspectRatio: "16/9", background: "#000" }}>
        <video src={src} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 scanline pointer-events-none" style={{ zIndex: 1 }} />
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="font-mono text-[10px] px-3 py-1.5 rounded-full" style={{ background: "rgba(34,211,238,0.12)", color: "#22D3EE", border: "1px solid #22D3EE30" }}>
            Click to open with AI detection
          </div>
        </div>
        {["tl","tr","bl","br"].map(c => (
          <div key={c} className="absolute pointer-events-none" style={{ zIndex: 3,
            top: c.startsWith("t") ? 8 : undefined, bottom: c.startsWith("b") ? 8 : undefined,
            left: c.endsWith("l") ? 8 : undefined, right: c.endsWith("r") ? 8 : undefined,
            width: 12, height: 12,
            borderTop: c.startsWith("t") ? "1.5px solid rgba(34,211,238,0.5)" : undefined,
            borderBottom: c.startsWith("b") ? "1.5px solid rgba(34,211,238,0.5)" : undefined,
            borderLeft: c.endsWith("l") ? "1.5px solid rgba(34,211,238,0.5)" : undefined,
            borderRight: c.endsWith("r") ? "1.5px solid rgba(34,211,238,0.5)" : undefined,
          }} />
        ))}
      </div>
      <div className="px-3 py-2 flex items-center justify-between" style={{ borderTop: "1px solid #1A242F" }}>
        <span className="font-mono text-[10px]" style={{ color: "#475569" }}>Zone: <span style={{ color: "#CBD5E1" }}>{cam.zone ?? "—"}</span></span>
        <span className="font-mono text-[10px]" style={{ color: "#22D3EE" }}>Real-time detection</span>
      </div>
    </div>
  );
}

// ─── Full-screen detection view ───────────────────────────────────────────────

function DetectionModal({ cam, src, onClose }: { cam: CameraSlot; src: string; onClose: () => void }) {
  const [events, setEvents] = useState<IntrusionEvent[]>([]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#070A0F" }}
    >
      {/* Modal header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid #1A242F", background: "#0B1017" }}
      >
        <span className="font-mono text-[11px] font-semibold" style={{ color: "#22D3EE" }}>{cam.id}</span>
        <span className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>{cam.name}</span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#22D3EE12", color: "#22D3EE", border: "1px solid #22D3EE30" }}>
          REAL-TIME PERSON DETECTION
        </span>

        {events.length > 0 && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px]"
            style={{ background: "#200808", border: "1px solid #EF444440" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#EF4444" }} />
            <span className="font-mono text-[10px]" style={{ color: "#EF4444" }}>{events.length} INTRUSION{events.length > 1 ? "S" : ""} LOGGED</span>
          </div>
        )}

        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[6px] transition-colors"
          style={{ background: "#17212C", color: "#CBD5E1", border: "1px solid #24303D" }}
        >
          <XIcon size={12} /> Close
        </button>
      </div>

      {/* Detection engine fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DetectionCamera
          videoSrc={src}
          camId={cam.id}
          camName={cam.name}
          onIntrusion={evt => setEvents(prev => [evt, ...prev].slice(0, 100))}
        />
      </div>
    </div>
  );
}

// ─── Connected camera card (live webcam / IP source) ─────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  USB_WEBCAM: "USB WEBCAM",
  PHONE_CAMERA: "PHONE CAMERA",
  IP_CAMERA: "IP CAMERA",
};

function ConnectedCameraCard({ cam, onExpand, onDisconnect }: {
  cam: ConnectedCamera; onExpand: () => void; onDisconnect: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach stream to video element
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (cam.stream) { v.srcObject = cam.stream; v.play().catch(() => {}); }
    else if (cam.streamUrl) { v.src = cam.streamUrl; }
    return () => { if (v) v.srcObject = null; };
  }, [cam.stream, cam.streamUrl]);

  return (
    <div
      className="rounded-[10px] overflow-hidden flex flex-col cursor-pointer"
      style={{ background: "#111821", border: "1px solid #22C55E30", boxShadow: "0 0 16px rgba(34,197,94,0.06)" }}
      onClick={onExpand}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 gap-2" style={{ borderBottom: "1px solid #1A242F" }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[11px] font-medium" style={{ color: "#22D3EE" }}>{cam.id}</span>
          <span className="text-[11px] truncate" style={{ color: "#CBD5E1" }}>{cam.name}</span>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#22C55E12", color: "#22C55E", border: "1px solid #22C55E30" }}>● LIVE</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onDisconnect(); }}
            className="text-[#475569] hover:text-[#EF4444] transition-colors font-mono text-[10px]" title="Disconnect">✕</button>
          <MaximizeIcon size={12} className="text-[#475569]" />
        </div>
      </div>

      {/* Live preview */}
      <div className="relative" style={{ aspectRatio: "16/9", background: "#000" }}>
        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="font-mono text-[10px] px-3 py-1.5 rounded-full" style={{ background: "rgba(34,211,238,0.12)", color: "#22D3EE", border: "1px solid #22D3EE30" }}>
            Click to open AI detection
          </div>
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(0,0,0,0.6)", color: "#22C55E" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot bg-[#22C55E]" /> LIVE
        </div>
        <div className="absolute top-2 right-2 font-mono text-[9px] px-1.5 py-0.5 rounded-sm" style={{ background: "rgba(0,0,0,0.6)", color: "#64748B" }}>
          {SOURCE_LABEL[cam.sourceType] ?? cam.sourceType}
        </div>
        {["tl","tr","bl","br"].map(c => (
          <div key={c} className="absolute pointer-events-none" style={{ zIndex: 3,
            top: c.startsWith("t") ? 8 : undefined, bottom: c.startsWith("b") ? 8 : undefined,
            left: c.endsWith("l") ? 8 : undefined, right: c.endsWith("r") ? 8 : undefined,
            width: 12, height: 12,
            borderTop: c.startsWith("t") ? "1.5px solid rgba(34,197,94,0.5)" : undefined,
            borderBottom: c.startsWith("b") ? "1.5px solid rgba(34,197,94,0.5)" : undefined,
            borderLeft: c.endsWith("l") ? "1.5px solid rgba(34,197,94,0.5)" : undefined,
            borderRight: c.endsWith("r") ? "1.5px solid rgba(34,197,94,0.5)" : undefined,
          }} />
        ))}
        <div className="absolute inset-0 scanline pointer-events-none" style={{ zIndex: 1 }} />
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ borderTop: "1px solid #1A242F" }}>
        <span className="font-mono text-[10px]" style={{ color: "#475569" }}>
          SOURCE: <span style={{ color: "#CBD5E1" }}>{SOURCE_LABEL[cam.sourceType]}</span>
        </span>
        <span className="font-mono text-[10px]" style={{ color: "#22C55E" }}>Real-time AI ready</span>
      </div>
    </div>
  );
}

// ─── Full-screen detection modal for live camera source ────────────────────────

function LiveDetectionModal({ cam, onClose }: { cam: ConnectedCamera; onClose: () => void }) {
  const [events, setEvents] = useState<IntrusionEvent[]>([]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#070A0F" }}>
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #1A242F", background: "#0B1017" }}>
        <span className="font-mono text-[11px] font-semibold" style={{ color: "#22D3EE" }}>{cam.id}</span>
        <span className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>{cam.name}</span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#22C55E12", color: "#22C55E", border: "1px solid #22C55E30" }}>
          ● LIVE · {SOURCE_LABEL[cam.sourceType]}
        </span>
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#22D3EE12", color: "#22D3EE", border: "1px solid #22D3EE30" }}>
          REAL-TIME PERSON DETECTION
        </span>
        {events.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px]" style={{ background: "#200808", border: "1px solid #EF444440" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#EF4444" }} />
            <span className="font-mono text-[10px]" style={{ color: "#EF4444" }}>{events.length} INTRUSION{events.length > 1 ? "S" : ""} LOGGED</span>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onClose} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[6px]"
          style={{ background: "#17212C", color: "#CBD5E1", border: "1px solid #24303D" }}>
          <XIcon size={12} /> Close
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <DetectionCamera
          mediaStream={cam.stream}
          videoSrc={cam.streamUrl}
          camId={cam.id}
          camName={cam.name}
          onIntrusion={evt => setEvents(prev => [evt, ...prev].slice(0, 100))}
        />
      </div>
    </div>
  );
}

// ─── Main LiveMonitoring page ────────────────────────────────────────────────

export default function LiveMonitoring() {
  const { state: storeState, activeCameras } = useStore();
  const cameras = DEFAULT_CAMERAS;

  const [uploads, setUploads] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<CameraSlot | null>(null);
  const [layout, setLayout] = useState<"2x4" | "3x3">("2x4");

  // Connected live cameras (webcam / phone / IP)
  const [connectedCams, setConnectedCams] = useState<ConnectedCamera[]>([]);
  const [expandedLive, setExpandedLive]   = useState<ConnectedCamera | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const PRIMARY_CAM = "CAM-01";

  const handleUpload = (camId: string, url: string) => {
    setUploads(u => ({ ...u, [camId]: url }));
    if (camId === PRIMARY_CAM) setSharedVideoSrc(url);
  };
  const handleRemove = (camId: string) => {
    setUploads(u => {
      const n = { ...u };
      if (n[camId]) URL.revokeObjectURL(n[camId]);
      delete n[camId];
      return n;
    });
    if (camId === PRIMARY_CAM) setSharedVideoSrc(null);
  };

  const handleCameraConnected = useCallback((cam: ConnectedCamera) => {
    setConnectedCams(prev => [cam, ...prev]);
    setShowConnectModal(false);
    setExpandedLive(cam);
    setLiveStream(cam.stream ?? null);
  }, []);

  const handleDisconnect = useCallback((id: string) => {
    setConnectedCams(prev => {
      const cam = prev.find(c => c.id === id);
      cam?.stream?.getTracks().forEach(t => t.stop());
      const remaining = prev.filter(c => c.id !== id);
      setLiveStream(remaining[0]?.stream ?? null);
      return remaining;
    });
    if (expandedLive?.id === id) setExpandedLive(null);
  }, [expandedLive]);

  const uploadedCount = Object.keys(uploads).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0 flex-wrap" style={{ borderBottom: "1px solid #1A242F", background: "#0B1017" }}>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>Live Camera Wall</span>
          <span className="ml-3 font-mono text-[10px]" style={{ color: "#64748B" }}>
            {storeState.cameras.length > 0 ? activeCameras : cameras.filter(c => c.status === "LIVE").length} LIVE · {cameras.filter(c => c.status === "WARNING").length} WARNING · {storeState.cameras.length > 0 ? storeState.cameras.filter(c => c.status === "OFFLINE").length : cameras.filter(c => c.status === "OFFLINE").length} OFFLINE
          </span>
          {connectedCams.length > 0 && (
            <span className="ml-3 font-mono text-[10px]" style={{ color: "#22C55E" }}>
              · {connectedCams.length} real camera{connectedCams.length > 1 ? "s" : ""} connected
            </span>
          )}
          {uploadedCount > 0 && (
            <span className="ml-3 font-mono text-[10px]" style={{ color: "#22D3EE" }}>
              · {uploadedCount} with AI detection
            </span>
          )}
        </div>

        {/* + CONNECT CAMERA button */}
        <button
          onClick={() => setShowConnectModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] font-mono text-[10px] font-bold tracking-wider transition-all"
          style={{ background: "linear-gradient(135deg, #0d3a4a 0%, #0a2a38 100%)", color: "#22D3EE", border: "1px solid #22D3EE40" }}
        >
          <span style={{ fontSize: 13 }}>＋</span> CONNECT CAMERA
        </button>

        <div className="flex items-center gap-1">
          {(["2x4", "3x3"] as const).map(l => (
            <button key={l} onClick={() => setLayout(l)} className="font-mono text-[10px] px-2 py-1 rounded transition-colors"
              style={{ background: layout === l ? "#111821" : "transparent", color: layout === l ? "#22D3EE" : "#64748B", border: `1px solid ${layout === l ? "#24303D" : "transparent"}` }}>
              {l}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[6px]" style={{ background: "#111821", color: "#CBD5E1", border: "1px solid #24303D" }}>
          <RefreshIcon size={11} /> Refresh
        </button>
      </div>

      {/* Camera grid */}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{
          display: "grid",
          gridTemplateColumns: layout === "2x4" ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
          gap: 12,
          alignContent: "start",
        }}
      >
        {/* Connected live cameras appear first */}
        {connectedCams.map(cam => (
          <ConnectedCameraCard
            key={cam.id}
            cam={cam}
            onExpand={() => setExpandedLive(cam)}
            onDisconnect={() => handleDisconnect(cam.id)}
          />
        ))}

        {cameras.map(cam => {
          const src = uploads[cam.id];
          if (src) {
            return (
              <UploadedCameraCard
                key={cam.id}
                cam={cam}
                src={src}
                onRemove={() => handleRemove(cam.id)}
                onExpand={() => setExpanded(cam)}
              />
            );
          }
          return (
            <StaticCameraFeed
              key={cam.id}
              cam={cam}
              onUpload={url => handleUpload(cam.id, url)}
              onExpand={() => setExpanded(cam)}
            />
          );
        })}
      </div>

      {/* Full-screen detection modal */}
      {expanded && uploads[expanded.id] && (
        <DetectionModal
          cam={expanded}
          src={uploads[expanded.id]}
          onClose={() => setExpanded(null)}
        />
      )}

      {/* Static detail modal for non-uploaded expanded cameras */}
      {expanded && !uploads[expanded.id] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(7,10,15,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-3xl rounded-[14px] overflow-hidden animate-fade-in" style={{ background: "#111821", border: "1px solid #24303D" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-sm" style={{ color: "#22D3EE" }}>{expanded.id}</span>
                <span className="font-semibold text-sm">{expanded.name}</span>
                <Badge variant={expanded.status} dot />
              </div>
              <button onClick={() => setExpanded(null)} className="text-[#475569] hover:text-[#F8FAFC]"><XIcon size={16} /></button>
            </div>
            <div className="relative camera-feed" style={{ aspectRatio: "16/9" }}>
              <div className="absolute inset-0" style={{ background: getGrad(expanded.id) }} />
              <div className="absolute inset-0 scanline" />
            </div>
          </div>
        </div>
      )}

      {/* Live camera full-screen AI detection */}
      {expandedLive && (
        <LiveDetectionModal cam={expandedLive} onClose={() => setExpandedLive(null)} />
      )}

      {/* Connect Camera modal */}
      {showConnectModal && (
        <ConnectCameraModal
          onConnect={handleCameraConnected}
          onClose={() => setShowConnectModal(false)}
        />
      )}
    </div>
  );
}
