import React, { useState, useEffect, useRef } from "react";
import { Badge } from "../components/Badge";
import {
  AlertTriangleIcon, CameraIcon, MapPinIcon,
  UsersIcon, ArrowRightIcon, TrendingUpIcon, ZapIcon
} from "../icons";
import { cameras } from "../data";
import { useStore } from "../lib/store";
import { useLiveStream, useSharedVideoSrc, useLiveZones, setLiveStream, setSharedVideoSrc } from "../lib/liveStreamStore";
import DetectionCamera from "../components/DetectionCamera";
import { loadLocalEvidence } from "../lib/clipStore";

interface Props { onNavigate: (page: string) => void; }

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, accent, trend, delay = 0 }: {
  label: string; value: number | string; sub?: string;
  icon: React.FC<any>; accent: string; trend?: "up" | "down";
  delay?: number;
}) {
  const numericVal = typeof value === "number" ? value : parseInt(value) || 0;
  const counted    = useCountUp(numericVal);
  const displayVal = typeof value === "string" && value.includes("/")
    ? value.replace(/^\d+/, String(counted))
    : counted;

  return (
    <div
      className="metric-card rounded-[10px] p-5 flex flex-col gap-4 animate-slide-up relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)",
        border: `1px solid ${accent}25`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)`,
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}50`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${accent}15`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `${accent}25`;
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)";
      }}
    >
      {/* Accent corner glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${accent}12 0%, transparent 65%)`,
        }}
      />

      <div className="flex items-center justify-between relative">
        <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#4A6580" }}>{label}</span>
        <div
          className="flex items-center justify-center rounded-[8px]"
          style={{
            width: 32, height: 32,
            background: `${accent}12`,
            border: `1px solid ${accent}30`,
            boxShadow: `0 0 12px ${accent}20`,
          }}
        >
          <Icon size={14} style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent}60)` }} />
        </div>
      </div>

      <div className="relative">
        <div
          className="font-mono text-4xl font-bold leading-none mb-1.5 tracking-tight"
          style={{ color: "#E8F4FD", textShadow: `0 0 20px rgba(255,255,255,0.1)` }}
        >
          {displayVal}
        </div>
        {sub && <div className="text-xs" style={{ color: "#4A6580" }}>{sub}</div>}
      </div>

      {trend && (
        <div className="flex items-center gap-1.5 relative">
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full"
            style={{
              background: trend === "up" ? "rgba(255,45,45,0.1)" : "rgba(0,255,136,0.1)",
              border: `1px solid ${trend === "up" ? "rgba(255,45,45,0.2)" : "rgba(0,255,136,0.2)"}`,
            }}
          >
            <TrendingUpIcon
              size={10}
              style={{
                color: trend === "up" ? "#FF2D2D" : "#00FF88",
                transform: trend === "down" ? "scaleY(-1)" : undefined,
              }}
            />
            <span className="font-mono text-[10px]" style={{ color: trend === "up" ? "#FF2D2D" : "#00FF88" }}>
              {trend === "up" ? "+2 from yesterday" : "-1 from yesterday"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Animated bar chart ────────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: { day: string; total: number; critical: number }[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 300); return () => clearTimeout(t); }, []);
  const max = Math.max(...data.map(d => d.total));

  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex flex-col justify-end" style={{ height: 48 }}>
            <div
              className="w-full rounded-sm relative overflow-hidden"
              style={{
                height: mounted ? `${(d.total / max) * 100}%` : "0%",
                transition: `height 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 0.06}s`,
                background: d.critical > 0
                  ? "linear-gradient(0deg, rgba(255,45,45,0.5), rgba(255,45,45,0.2))"
                  : "linear-gradient(0deg, rgba(0,245,255,0.4), rgba(0,245,255,0.15))",
                border: `1px solid ${d.critical > 0 ? "rgba(255,45,45,0.4)" : "rgba(0,245,255,0.3)"}`,
                boxShadow: d.critical > 0 ? "0 0 6px rgba(255,45,45,0.2)" : "0 0 6px rgba(0,245,255,0.1)",
              }}
            />
          </div>
          <div className="font-mono text-[9px]" style={{ color: "#2E4560" }}>{d.day}</div>
        </div>
      ))}
    </div>
  );
}

// ── Radar widget ──────────────────────────────────────────────────────────────
function RadarWidget() {
  const [dots] = useState([
    { x: 42, y: 35, color: "#FF2D2D", size: 4, label: "P-104" },
    { x: 68, y: 55, color: "#FFB800", size: 3, label: "P-098" },
    { x: 25, y: 70, color: "#00F5FF", size: 3, label: "P-091" },
    { x: 75, y: 25, color: "#00F5FF", size: 2.5, label: "P-087" },
  ]);

  return (
    <div className="relative" style={{ width: 120, height: 120 }}>
      {/* Rings */}
      {[1, 0.66, 0.33].map((r, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            inset: `${(1 - r) * 50}%`,
            border: "1px solid rgba(0,245,255,0.12)",
          }}
        />
      ))}

      {/* Cross hair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-full h-px" style={{ background: "rgba(0,245,255,0.08)" }} />
        <div className="absolute w-px h-full" style={{ background: "rgba(0,245,255,0.08)" }} />
      </div>

      {/* Sweep */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden animate-sweep"
        style={{ transformOrigin: "center" }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: "50%", height: "50%",
            transformOrigin: "left top",
            background: "linear-gradient(45deg, rgba(0,245,255,0.15), transparent)",
            clipPath: "polygon(0 0, 100% 0, 0 100%)",
          }}
        />
      </div>

      {/* Dots */}
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse-dot"
          style={{
            left: `${d.x}%`, top: `${d.y}%`,
            width: d.size * 2, height: d.size * 2,
            background: d.color,
            boxShadow: `0 0 6px ${d.color}, 0 0 12px ${d.color}60`,
            transform: "translate(-50%, -50%)",
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Camera thumb ──────────────────────────────────────────────────────────────
function CameraThumb({
  cam, delay = 0,
  videoSrc, onUpload, onRemove,
}: {
  cam: typeof cameras[0]; delay?: number;
  videoSrc?: string;
  onUpload: (camId: string, url: string) => void;
  onRemove: (camId: string) => void;
}) {
  const isWarning = cam.status === "WARNING";
  const isOffline = cam.status === "OFFLINE";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("video/")) return;
    const url = URL.createObjectURL(file);
    onUpload(cam.id, url);
  }

  const accentColor = isWarning ? "rgba(255,107,53,0.5)" : "rgba(30,45,61,0.8)";

  return (
    <div
      className="rounded-[10px] overflow-hidden animate-fade-in"
      style={{
        background: "#0D1520",
        border: `1px solid ${dragging ? "rgba(59,130,246,0.7)" : videoSrc ? "rgba(0,245,255,0.4)" : accentColor}`,
        boxShadow: videoSrc
          ? "0 0 16px rgba(0,245,255,0.08)"
          : isWarning ? "0 0 20px rgba(255,107,53,0.1)" : undefined,
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />

      <div className="relative camera-feed" style={{ aspectRatio: "16/9" }}>
        {isOffline && !videoSrc ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: "#060D14" }}>
            <CameraIcon size={20} style={{ color: "#2E4560" }} />
            <span className="font-mono text-[9px] tracking-widest" style={{ color: "#2E4560" }}>OFFLINE</span>
          </div>
        ) : videoSrc ? (
          <>
            {/* Real video */}
            <video
              key={videoSrc}
              src={videoSrc}
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Scanline overlay */}
            <div className="absolute inset-0 scanline pointer-events-none" style={{ zIndex: 1 }} />
            {/* Horizontal sweep line */}
            <div className="h-sweep-line" style={{ zIndex: 4 }} />
            {/* Corner brackets */}
            {["tl","tr","bl","br"].map(c => (
              <div key={c} className="absolute pointer-events-none" style={{
                top: c.startsWith("t") ? 7 : undefined, bottom: c.startsWith("b") ? 7 : undefined,
                left: c.endsWith("l") ? 7 : undefined, right: c.endsWith("r") ? 7 : undefined,
                width: 10, height: 10,
                borderTop:    c.startsWith("t") ? "1.5px solid rgba(0,245,255,0.6)" : undefined,
                borderBottom: c.startsWith("b") ? "1.5px solid rgba(0,245,255,0.6)" : undefined,
                borderLeft:   c.endsWith("l")   ? "1.5px solid rgba(0,245,255,0.6)" : undefined,
                borderRight:  c.endsWith("r")   ? "1.5px solid rgba(0,245,255,0.6)" : undefined,
              }} />
            ))}
            {/* REC dot */}
            <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none" style={{ zIndex: 2 }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#FF2D2D", boxShadow: "0 0 5px rgba(255,45,45,0.7)" }} />
              <span className="font-mono text-[9px]" style={{ color: "#4A6580" }}>REC</span>
            </div>
            {/* Remove button on hover */}
            {hover && (
              <button
                onClick={() => onRemove(cam.id)}
                className="absolute top-2 left-2 font-mono text-[9px] px-1.5 py-0.5 rounded transition-all"
                style={{ background: "rgba(239,68,68,0.8)", color: "#fff", zIndex: 3 }}
              >
                ✕ REMOVE
              </button>
            )}
          </>
        ) : (
          <>
            {/* Simulated background */}
            <div className="absolute inset-0" style={{
              background: isWarning
                ? "radial-gradient(ellipse at 50% 80%, #1a0b08 0%, #060D14 100%)"
                : "radial-gradient(ellipse at 50% 80%, #081218 0%, #040C14 100%)",
            }} />
            <div className="absolute inset-0" style={{
              backgroundImage: "linear-gradient(rgba(0,245,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }} />
            {/* Simulated detections */}
            {cam.people > 0 && (
              <>
                <div
                  className={`detection-box ${isWarning ? "detection-box-warning" : ""}`}
                  style={{ top: "18%", left: "28%", width: "22%", height: "56%" }}
                >
                  <div className="absolute -top-[18px] left-0 font-mono text-[9px] px-1.5 py-0.5 rounded-sm"
                    style={{ background: isWarning ? "#FF6B35" : "#00F5FF", color: "#040709" }}>
                    P-{50 + cam.people} {88 + cam.people}%
                  </div>
                </div>
                {cam.people > 1 && (
                  <div className="detection-box" style={{ top: "22%", right: "18%", width: "18%", height: "44%" }}>
                    <div className="absolute -top-[18px] left-0 font-mono text-[9px] px-1.5 py-0.5 rounded-sm" style={{ background: "#00F5FF", color: "#040709" }}>P-048</div>
                  </div>
                )}
              </>
            )}
            {isWarning && (
              <div className="zone-overlay" style={{ bottom: "8%", left: "12%", right: "12%", height: "38%" }}>
                <div className="absolute top-1 left-2 font-mono text-[9px] animate-blink" style={{ color: "#FF2D2D" }}>⚠ RESTRICTED</div>
              </div>
            )}
            {["tl","tr","bl","br"].map(c => (
              <div key={c} className="absolute" style={{
                top: c.startsWith("t") ? 7 : undefined, bottom: c.startsWith("b") ? 7 : undefined,
                left: c.endsWith("l") ? 7 : undefined, right: c.endsWith("r") ? 7 : undefined,
                width: 10, height: 10,
                borderTop:    c.startsWith("t") ? `1.5px solid rgba(0,245,255,${isWarning ? "0.6" : "0.35"})` : undefined,
                borderBottom: c.startsWith("b") ? `1.5px solid rgba(0,245,255,${isWarning ? "0.6" : "0.35"})` : undefined,
                borderLeft:   c.endsWith("l")   ? `1.5px solid rgba(0,245,255,${isWarning ? "0.6" : "0.35"})` : undefined,
                borderRight:  c.endsWith("r")   ? `1.5px solid rgba(0,245,255,${isWarning ? "0.6" : "0.35"})` : undefined,
              }} />
            ))}
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#FF2D2D", boxShadow: "0 0 5px rgba(255,45,45,0.7)" }} />
              <span className="font-mono text-[9px]" style={{ color: "#4A6580" }}>REC</span>
            </div>
            <div className="absolute inset-0 scanline pointer-events-none" style={{ zIndex: 1 }} />

            {/* Upload overlay on hover */}
            {hover && !isOffline && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 transition-all"
                style={{ background: "rgba(4,12,20,0.75)", zIndex: 4 }}
              >
                <span className="text-lg" style={{ color: "#00F5FF" }}>↑</span>
                <span className="font-mono text-[9px] tracking-widest" style={{ color: "#00F5FF" }}>UPLOAD VIDEO</span>
              </button>
            )}
            {/* Drag indicator */}
            {dragging && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)", border: "2px dashed rgba(59,130,246,0.6)", zIndex: 5 }}>
                <span className="font-mono text-[10px]" style={{ color: "#3B82F6" }}>DROP VIDEO</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] font-semibold" style={{ color: "#00F5FF", textShadow: "0 0 8px rgba(0,245,255,0.4)" }}>
            {cam.id}
          </div>
          <div className="text-[11px] truncate" style={{ color: "#94B4CC" }}>{cam.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px]" style={{ color: "#4A6580" }}>
            {isOffline && !videoSrc ? "—" : videoSrc ? "LIVE" : `${cam.people}P`}
          </span>
          <Badge variant={videoSrc ? "LIVE" : cam.status} dot />
        </div>
      </div>
    </div>
  );
}

// ── Live Feed Hero ────────────────────────────────────────────────────────────
function LiveFeedHero({ onNavigate }: { onNavigate: (p: string) => void }) {
  const sharedStream    = useLiveStream();
  const sharedVideoSrc  = useSharedVideoSrc();   // video uploaded to CAM-01 in Live Monitoring
  const liveZones       = useLiveZones();
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const localStreamRef  = useRef<MediaStream | null>(null);
  const fileUrlRef      = useRef<string | null>(null);
  const [hasSignal,   setHasSignal]   = useState(false);
  const [starting,    setStarting]    = useState(false);
  const [camError,    setCamError]    = useState("");
  const [localActive, setLocalActive] = useState(false);
  const [fileActive,  setFileActive]  = useState(false);
  const [fileUrl,     setFileUrl]     = useState<string | null>(null);
  const [fileName,    setFileName]    = useState("");

  // Effective video src: local upload > shared from Live Monitoring
  const effectiveVideoSrc = fileActive ? fileUrl : sharedVideoSrc;
  // Effective stream: local cam > shared stream from Live Monitoring
  const activeStream = localActive
    ? (localStreamRef.current ?? undefined)
    : (!fileActive && !sharedVideoSrc ? (sharedStream ?? undefined) : undefined);

  // Determine if we have any signal
  const anySignal = !!(activeStream || effectiveVideoSrc);

  useEffect(() => { setHasSignal(anySignal); }, [anySignal]);

  // If shared stream disconnects and we have no local source, clear signal
  useEffect(() => {
    if (!sharedStream && !sharedVideoSrc && !localActive && !fileActive) setHasSignal(false);
  }, [sharedStream, sharedVideoSrc, localActive, fileActive]);

  async function startLocalCam() {
    setCamError("");
    setStarting(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      stopFilePlayback(false);
      localStreamRef.current = s;
      setLocalActive(true);
      setLiveStream(s);
      setHasSignal(true);
    } catch (e: any) {
      setCamError(e.name === "NotAllowedError" ? "Camera access denied — allow in browser settings." : (e.message ?? "Could not start camera."));
    } finally {
      setStarting(false);
    }
  }

  function stopLocalCam() {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalActive(false);
    setLiveStream(null);
    if (!fileActive) setHasSignal(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    stopLocalCam();
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    setFileUrl(url);
    setFileName(file.name);
    setFileActive(true);
    setHasSignal(true);
    e.target.value = "";
  }

  function stopFilePlayback(updateSignal = true) {
    if (fileUrlRef.current) { URL.revokeObjectURL(fileUrlRef.current); fileUrlRef.current = null; }
    setFileUrl(null);
    setFileActive(false);
    setFileName("");
    if (updateSignal) setHasSignal(false);
  }

  const zoneCount = liveZones.length;

  return (
    <div
      className="rounded-[12px] overflow-hidden relative animate-fade-in"
      style={{
        border: "1px solid #1E2D3D",
        background: "#040C14",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />

      {/* ── Header bar ── */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid #1A2A38", background: "rgba(8,14,21,0.95)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: hasSignal ? "#FF2D2D" : "#24303D",
                boxShadow: hasSignal ? "0 0 6px rgba(255,45,45,0.8)" : undefined,
                animation: hasSignal ? "pulse 1.2s infinite" : undefined,
              }}
            />
            <span className="font-mono text-[10px] tracking-widest font-bold" style={{ color: hasSignal ? "#FF2D2D" : "#2E4560" }}>
              {hasSignal ? "LIVE" : "NO SIGNAL"}
            </span>
          </div>
          <div style={{ width: 1, height: 14, background: "#1A2A38" }} />
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#4A6580" }}>
            {fileActive
              ? `FILE · ${fileName.length > 28 ? fileName.slice(0, 25) + "…" : fileName}`
              : sharedVideoSrc && !localActive
              ? "CAM-01 · SHARED FROM MONITORING"
              : "PRIMARY FEED · CAM-01"}
          </span>
          {zoneCount > 0 && (
            <>
              <div style={{ width: 1, height: 14, background: "#1A2A38" }} />
              <span className="font-mono text-[10px]" style={{ color: "#EF4444" }}>
                {zoneCount} RESTRICTED ZONE{zoneCount > 1 ? "S" : ""} ACTIVE
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasSignal && !fileActive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E", animation: "pulse 1.5s infinite" }} />
              <span className="font-mono text-[9px] tracking-widest" style={{ color: "#22C55E" }}>STREAMING</span>
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="font-mono text-[10px] px-3 py-1.5 rounded-[6px] transition-all flex items-center gap-1.5"
            style={{ background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.25)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.18)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.08)"; }}
          >
            ↑ UPLOAD VIDEO
          </button>

          {fileActive && (
            <button onClick={() => stopFilePlayback()} className="font-mono text-[10px] px-3 py-1.5 rounded-[6px] transition-all"
              style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              STOP
            </button>
          )}
          {localActive && (
            <button onClick={stopLocalCam} className="font-mono text-[10px] px-3 py-1.5 rounded-[6px] transition-all"
              style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              STOP
            </button>
          )}
          {!localActive && !fileActive && (
            <button
              onClick={hasSignal ? () => onNavigate("monitoring") : startLocalCam}
              disabled={starting}
              className="font-mono text-[10px] px-3 py-1.5 rounded-[6px] transition-all flex items-center gap-1.5 disabled:opacity-50"
              style={{ background: "rgba(0,245,255,0.08)", color: "#00F5FF", border: "1px solid rgba(0,245,255,0.2)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,245,255,0.15)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,245,255,0.08)"; }}
            >
              {hasSignal ? <><span>FULL MONITOR</span> <ArrowRightIcon size={10} /></> : (starting ? "STARTING…" : <><CameraIcon size={11} /> START CAMERA</>)}
            </button>
          )}
        </div>
      </div>

      {/* ── Feed area ── */}
      {hasSignal ? (
        /* DetectionCamera handles video, zone drawing, AI detection, and overlays */
        <div style={{ height: 420 }}>
          <DetectionCamera
            key={effectiveVideoSrc ?? (activeStream ? "stream" : "idle")}
            camId="CAM-01"
            camName="PRIMARY FEED · MAIN ENTRANCE"
            mediaStream={activeStream}
            videoSrc={effectiveVideoSrc ?? undefined}
          />
        </div>
      ) : (
        /* No-signal placeholder */
        <div className="relative" style={{ aspectRatio: "16/6", background: "#040C14" }}>
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 80%, #081218 0%, #040c14 100%)" }} />
          <div className="absolute inset-0" style={{
            backgroundImage: "linear-gradient(rgba(0,245,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.025) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

          {/* Simulated restricted zone */}
          <div className="absolute flex items-start p-1.5" style={{
            left: "18%", top: "15%", width: "35%", height: "72%",
            border: "1.5px dashed rgba(239,68,68,0.6)",
            background: "rgba(239,68,68,0.06)",
            boxShadow: "inset 0 0 24px rgba(239,68,68,0.08), 0 0 20px rgba(239,68,68,0.1)",
          }}>
            <span className="font-mono text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm" style={{ background: "#EF4444", color: "#fff" }}>
              RESTRICTED EQUIPMENT AREA
            </span>
          </div>
          {/* Simulated person detection */}
          <div className="absolute" style={{
            left: "22%", top: "22%", width: "10%", height: "52%",
            border: "1.5px solid #00F5FF", boxShadow: "0 0 10px rgba(0,245,255,0.3)",
          }}>
            <span className="absolute -top-5 left-0 font-mono text-[9px] px-1.5 py-0.5 rounded-sm" style={{ background: "#00F5FF", color: "#040709" }}>
              P-104 · 96%
            </span>
          </div>

          <div className="absolute inset-0 scanline pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div>
                <CameraIcon size={32} style={{ color: "#1E3A4A", margin: "0 auto 10px" }} />
                <div className="font-mono text-[11px] tracking-widest uppercase mb-1" style={{ color: "#2E4560" }}>No Live Feed Connected</div>
                <div className="text-xs" style={{ color: "#1E3A4A" }}>Start your camera or connect a phone</div>
              </div>
              {camError && (
                <div className="text-[11px] px-3 py-2 rounded-[6px]" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", maxWidth: 280 }}>
                  {camError}
                </div>
              )}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={startLocalCam} disabled={starting}
                  className="flex items-center gap-2 font-mono text-[11px] font-bold px-5 py-2.5 rounded-[8px] transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#0d2a38,#0a1e2c)", color: "#00F5FF", border: "1px solid rgba(0,245,255,0.4)", boxShadow: "0 0 16px rgba(0,245,255,0.1)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(0,245,255,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(0,245,255,0.1)"; }}
                >
                  <CameraIcon size={13} />
                  {starting ? "STARTING…" : "START CAMERA"}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 font-mono text-[11px] font-bold px-5 py-2.5 rounded-[8px] transition-all"
                  style={{ background: "linear-gradient(135deg,#0d1a38,#0a102c)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.4)", boxShadow: "0 0 16px rgba(59,130,246,0.1)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(59,130,246,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(59,130,246,0.1)"; }}
                >
                  ↑ UPLOAD VIDEO
                </button>
                <button
                  onClick={() => onNavigate("monitoring")}
                  className="font-mono text-[10px] px-4 py-2.5 rounded-[8px] transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: "#4A6580", border: "1px solid #1E2D3D" }}
                >
                  CONNECT PHONE →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Overview ─────────────────────────────────────────────────────────────
export default function Overview({ onNavigate }: Props) {
  const [liveEvents, setLiveEvents] = useState<{ type: string; msg: string; time: string; camera?: string; id?: number }[]>([]);
  const { activeIncidents, highRiskEvents, evidenceCount, state } = useStore();

  // Local evidence count (DetectionCamera saves clips here without a backend)
  const [localEvidenceCount, setLocalEvidenceCount] = useState(() => loadLocalEvidence().length);
  useEffect(() => {
    // Re-read on focus so newly saved clips are picked up
    const refresh = () => setLocalEvidenceCount(loadLocalEvidence().length);
    window.addEventListener("focus", refresh);
    const id = setInterval(refresh, 5000);
    return () => { window.removeEventListener("focus", refresh); clearInterval(id); };
  }, []);
  const totalEvidence = evidenceCount + localEvidenceCount;

  // Camera counts: prefer backend state, fall back to mock
  const backendCams = state.cameras;
  const activeCams  = backendCams.length > 0 ? backendCams.filter(c => c.status === "LIVE").length    : cameras.filter(c => c.status !== "OFFLINE").length;
  const warningCams = backendCams.length > 0 ? backendCams.filter(c => (c.status as string) === "ERROR" || (c.status as string) === "CONNECTING").length : cameras.filter(c => c.status === "WARNING").length;
  const offlineCams = backendCams.length > 0 ? backendCams.filter(c => c.status === "OFFLINE").length : cameras.filter(c => c.status === "OFFLINE").length;
  const totalCams   = backendCams.length > 0 ? backendCams.length : cameras.length;

  const restrictedZones = state.incidents.filter(i => i.severity === "CRITICAL" || i.severity === "HIGH").length;

  // People detected: unique personIds from backend evidence; local clips counted by record
  const localEvidence  = loadLocalEvidence();
  const uniquePersons  = new Set(state.evidence.map(e => e.personId).filter(Boolean));
  const totalPeople    = uniquePersons.size > 0
    ? uniquePersons.size
    : state.evidence.length + localEvidence.length;

  // Severity breakdown from real incidents (or mock fallback)
  const incList = state.incidents.length > 0 ? state.incidents : ([] as typeof state.incidents);
  const sevCounts = {
    CRITICAL: incList.filter(i => i.severity === "CRITICAL").length,
    HIGH:     incList.filter(i => i.severity === "HIGH").length,
    MEDIUM:   incList.filter(i => i.severity === "MEDIUM").length,
    LOW:      incList.filter(i => i.severity === "LOW").length,
  };
  const sevTotal = Math.max(1, sevCounts.CRITICAL + sevCounts.HIGH + sevCounts.MEDIUM + sevCounts.LOW);

  // Detection map: derive from most recent active incidents
  const detectionEntries = (() => {
    const active = state.incidents.filter(i => i.status !== "RESOLVED").slice(0, 3);
    if (active.length > 0) {
      return active.map((inc, idx) => ({
        id: (inc as any).personId ?? `P-${100 + idx}`,
        zone: inc.zoneName ?? inc.cameraId ?? "—",
        color: inc.severity === "CRITICAL" ? "#FF2D2D" : inc.severity === "HIGH" ? "#FFB800" : "#00F5FF",
        status: inc.status === "NEW" ? "BREACH" : inc.status === "INVESTIGATING" ? "NEAR" : "CLEAR",
      }));
    }
    return [
      { id: "P-104", zone: "Zone A", color: "#FF2D2D", status: "BREACH" },
      { id: "P-098", zone: "Zone B", color: "#FFB800", status: "NEAR" },
      { id: "P-091", zone: "Zone C", color: "#00F5FF", status: "CLEAR" },
    ];
  })();

  // Incidents by day for mini chart
  const incidentsByDay = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { day: d.toLocaleDateString("en-US", { weekday: "short" }), total: 0, critical: 0 };
    });
    for (const inc of state.incidents) {
      const day = new Date(inc.detectedAt).toLocaleDateString("en-US", { weekday: "short" });
      const entry = days.find(d => d.day === day);
      if (entry) { entry.total++; if (inc.severity === "CRITICAL") entry.critical++; }
    }
    return days;
  })();

  // Critical alert to show in header — pick the newest unresolved CRITICAL incident
  const criticalInc = state.incidents.find(i => i.severity === "CRITICAL" && i.status === "NEW");

  // Per-camera video uploads in the grid
  const [thumbUploads, setThumbUploads] = useState<Record<string, string>>({});
  const handleThumbUpload = (camId: string, url: string) => {
    setThumbUploads(prev => ({ ...prev, [camId]: url }));
    if (camId === "CAM-01") setSharedVideoSrc(url);
  };
  const handleThumbRemove = (camId: string) => {
    setThumbUploads(prev => {
      const next = { ...prev };
      if (next[camId]) URL.revokeObjectURL(next[camId]);
      delete next[camId];
      return next;
    });
    if (camId === "CAM-01") setSharedVideoSrc(null);
  };

  // Periodically prepend a synthetic event to simulate live feed
  useEffect(() => {
    const syntheticEvents = [
      { type: "info", msg: "Motion analysis complete — CAM-02 clear", time: "Just now", camera: "CAM-02" },
      { type: "warning", msg: "P-098 proximity alert — approaching boundary", time: "Just now", camera: "CAM-07" },
      { type: "success", msg: "Zone sweep verified — no anomalies", time: "Just now", camera: "CAM-05" },
    ];
    let idx = 0;
    const id = setInterval(() => {
      setLiveEvents(prev => [{ ...syntheticEvents[idx % syntheticEvents.length], time: new Date().toLocaleTimeString("en-GB", { hour12: false }) }, ...prev.slice(0, 14)]);
      idx++;
    }, 7000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="h-full overflow-y-auto px-6 py-5 space-y-5"
      style={{ background: "linear-gradient(180deg, #06111A 0%, #040709 100%)" }}
    >
      {/* ── Page header ── */}
      <div className="flex items-start justify-between animate-fade-in">
        <div>
          <h1
            className="font-display font-bold text-2xl tracking-widest uppercase mb-1"
            style={{ color: "#E8F4FD", letterSpacing: "0.1em", textShadow: "0 0 40px rgba(0,245,255,0.15)" }}
          >
            Security Operations Center
          </h1>
          <div className="flex items-center gap-4">
            {[
              { dot: offlineCams === 0 ? "#00FF88" : "#FFB800", label: offlineCams === 0 ? "All Systems Nominal" : `${offlineCams} Camera${offlineCams > 1 ? "s" : ""} Offline`, color: offlineCams === 0 ? "#00FF88" : "#FFB800" },
              { dot: "#00F5FF", label: "AI Engine Ready",     color: "#00F5FF" },
              { dot: "#3B82F6", label: `${totalCams} Cameras Online`, color: "#3B82F6" },
            ].map(({ dot, label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: dot, boxShadow: `0 0 6px ${dot}` }} />
                <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Critical alert */}
        {criticalInc && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-[10px] animate-threat"
            style={{
              background: "linear-gradient(135deg, #1a0808 0%, #120606 100%)",
              border: "1px solid rgba(255,45,45,0.4)",
            }}
          >
            <span className="text-lg animate-pulse-dot">🚨</span>
            <div>
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: "#FF2D2D", textShadow: "0 0 10px rgba(255,45,45,0.6)" }}>INTRUSION DETECTED</div>
              <div className="font-mono text-[10px] mt-0.5" style={{ color: "#4A6580" }}>{criticalInc.cameraId} — {criticalInc.zoneName ?? "Restricted Area"}</div>
            </div>
            <button
              onClick={() => onNavigate("incidents")}
              className="ml-2 font-mono text-[10px] tracking-wider px-3 py-1.5 rounded-[6px] transition-all"
              style={{ background: "rgba(255,45,45,0.15)", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.3)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,45,45,0.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,45,45,0.15)"; }}
            >
              RESPOND →
            </button>
          </div>
        )}
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Active Incidents" value={activeIncidents}    sub={activeIncidents > 0 ? `${highRiskEvents} high risk` : "All clear"} icon={AlertTriangleIcon} accent="#FF2D2D" trend={activeIncidents > 0 ? "up" : undefined} delay={0} />
        <MetricCard label="People Detected"  value={totalPeople}        sub="Tracked anonymously" icon={UsersIcon}    accent="#00F5FF"  delay={60} />
        <MetricCard label="Active Cameras"   value={`${activeCams}/${totalCams}`} sub="AI-monitored feeds"  icon={CameraIcon}  accent="#3B82F6"  delay={120} />
        <MetricCard label="Evidence Clips"   value={totalEvidence}      sub={localEvidenceCount > 0 ? `${localEvidenceCount} local · ${evidenceCount} cloud` : "Saved clips"}    icon={MapPinIcon}  accent="#FFB800"  delay={180} />
      </div>

      {/* ── Live Feed Hero ── */}
      <LiveFeedHero onNavigate={onNavigate} />

      {/* ── Cameras + Activity + Radar ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>

        {/* Camera grid */}
        <div
          className="rounded-[10px] p-4"
          style={{
            background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)",
            border: "1px solid #1E2D3D",
            boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-sm tracking-widest uppercase" style={{ color: "#E8F4FD" }}>Live Camera Feeds</h2>
              <div className="font-mono text-[10px] mt-0.5" style={{ color: "#4A6580" }}>
                {activeCams} active · {warningCams} warning · {offlineCams} offline
              </div>
            </div>
            <button
              onClick={() => onNavigate("monitoring")}
              className="flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded-[6px] transition-all"
              style={{ color: "#00F5FF", background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,245,255,0.15)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,245,255,0.08)"; }}
            >
              VIEW ALL <ArrowRightIcon size={10} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {cameras.slice(0, 4).map((cam, i) => (
              <CameraThumb
                key={cam.id}
                cam={cam}
                delay={i * 80}
                videoSrc={thumbUploads[cam.id]}
                onUpload={handleThumbUpload}
                onRemove={handleThumbRemove}
              />
            ))}
          </div>
        </div>

        {/* Live activity + Radar */}
        <div className="flex flex-col gap-4">

          {/* Radar */}
          <div
            className="rounded-[10px] p-4 flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)",
              border: "1px solid #1E2D3D",
            }}
          >
            <RadarWidget />
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-xs tracking-widest uppercase mb-3" style={{ color: "#E8F4FD" }}>Detection Map</div>
              <div className="space-y-1.5">
                {detectionEntries.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-dot" style={{ background: p.color, boxShadow: `0 0 5px ${p.color}` }} />
                    <span className="font-mono text-[10px]" style={{ color: "#94B4CC" }}>{p.id}</span>
                    <span className="font-mono text-[9px]" style={{ color: "#4A6580" }}>{p.zone}</span>
                    <span className="ml-auto font-mono text-[9px] font-bold" style={{ color: p.color }}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live activity feed */}
          <div
            className="rounded-[10px] p-4 flex flex-col flex-1"
            style={{
              background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)",
              border: "1px solid #1E2D3D",
              minHeight: 0,
            }}
          >
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div>
                <h2 className="font-display font-bold text-xs tracking-widest uppercase" style={{ color: "#E8F4FD" }}>Live Events</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#00F5FF", boxShadow: "0 0 5px #00F5FF" }} />
                <span className="font-mono text-[9px] tracking-widest" style={{ color: "#00F5FF" }}>STREAMING</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0" style={{ maxHeight: 200 }}>
              {liveEvents.slice(0, 10).map((a, i) => {
                const color = { critical: "#FF2D2D", warning: "#FFB800", success: "#00FF88", info: "#4A6580", high: "#FF6B35" }[a.type] ?? "#4A6580";
                return (
                  <div
                    key={i}
                    className="flex gap-2.5 py-2 animate-fade-in"
                    style={{ borderBottom: "1px solid #152030", animationFillMode: "both" }}
                  >
                    <div className="flex flex-col items-center flex-shrink-0 mt-1.5" style={{ width: 6 }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 4px ${color}80` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] leading-snug mb-0.5" style={{ color: "#94B4CC" }}>{a.msg}</div>
                      <div className="flex gap-2">
                        <span className="font-mono text-[9px]" style={{ color: "#2E4560" }}>{a.time}</span>
                        <span className="font-mono text-[9px]" style={{ color: "#00F5FF" }}>{a.camera}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Incidents + Analytics ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>

        {/* Incidents table */}
        <div
          className="rounded-[10px] overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)",
            border: "1px solid #1E2D3D",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #152030" }}>
            <h2 className="font-display font-bold text-xs tracking-widest uppercase" style={{ color: "#E8F4FD" }}>Recent Incidents</h2>
            <button
              onClick={() => onNavigate("incidents")}
              className="font-mono text-[10px] px-2.5 py-1 rounded-[6px] transition-all"
              style={{ color: "#00F5FF", background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.15)" }}
            >
              View all →
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #152030" }}>
                {["ID", "Severity", "Type", "Camera", "Zone", "Time", "Status"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-mono text-[9px] tracking-widest uppercase" style={{ color: "#2E4560" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(state.incidents.length > 0 ? state.incidents : []).slice(0, 5).map((inc, i) => (
                <tr
                  key={inc.id}
                  className="cursor-pointer transition-all animate-fade-in"
                  style={{ borderBottom: "1px solid #152030", animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#131F2E"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: "#00F5FF" }}>{inc.id}</td>
                  <td className="px-4 py-2.5"><Badge variant={inc.severity} /></td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "#94B4CC" }}>{(inc as any).eventType?.replace(/_/g, " ") ?? "Zone Breach"}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: "#4A6580" }}>{inc.cameraId}</td>
                  <td className="px-4 py-2.5 text-[11px] max-w-[120px] truncate" style={{ color: "#4A6580" }}>{inc.zoneName}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: "#2E4560" }}>{new Date(inc.detectedAt ?? inc.createdAt).toLocaleTimeString("en-GB", { hour12: false })}</td>
                  <td className="px-4 py-2.5"><Badge variant={inc.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Analytics panel */}
        <div
          className="rounded-[10px] p-4"
          style={{
            background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)",
            border: "1px solid #1E2D3D",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xs tracking-widest uppercase" style={{ color: "#E8F4FD" }}>Threat Analytics</h2>
            <button onClick={() => onNavigate("analytics")} className="font-mono text-[10px]" style={{ color: "#00F5FF" }}>Full view →</button>
          </div>

          <div className="mb-5">
            <div className="font-mono text-[9px] tracking-widest uppercase mb-2" style={{ color: "#2E4560" }}>Incidents — Last 7 Days</div>
            <MiniBarChart data={incidentsByDay} />
          </div>

          <div className="rule my-4" />

          <div className="space-y-2.5">
            <div className="font-mono text-[9px] tracking-widest uppercase mb-3" style={{ color: "#2E4560" }}>Severity Breakdown</div>
            {[
              { label: "Critical", count: sevCounts.CRITICAL, color: "#FF2D2D", pct: Math.round(sevCounts.CRITICAL / sevTotal * 100) },
              { label: "High",     count: sevCounts.HIGH,     color: "#FF6B35", pct: Math.round(sevCounts.HIGH     / sevTotal * 100) },
              { label: "Medium",   count: sevCounts.MEDIUM,   color: "#FFB800", pct: Math.round(sevCounts.MEDIUM   / sevTotal * 100) },
              { label: "Low",      count: sevCounts.LOW,      color: "#38BDF8", pct: Math.round(sevCounts.LOW      / sevTotal * 100) },
            ].map(s => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: "#94B4CC" }}>{s.label}</span>
                  <span className="font-mono text-[10px] font-bold" style={{ color: s.color }}>{s.count}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "#0D1520" }}>
                  <div
                    className="h-full rounded-full bar-fill"
                    style={{
                      width: `${s.pct}%`,
                      background: `linear-gradient(90deg, ${s.color}60, ${s.color})`,
                      boxShadow: `0 0 6px ${s.color}40`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rule my-4" />

          {/* Predictive alert */}
          <div
            className="rounded-[8px] p-3 animate-threat"
            style={{
              background: "linear-gradient(135deg, #1a1208 0%, #120e06 100%)",
              border: "1px solid rgba(255,184,0,0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <ZapIcon size={11} style={{ color: "#FFB800", filter: "drop-shadow(0 0 4px rgba(255,184,0,0.6))" }} />
              <span className="font-mono text-[10px] tracking-widest uppercase font-bold" style={{ color: "#FFB800" }}>AI Prediction</span>
            </div>
            <div className="text-[11px] mb-1.5" style={{ color: "#94B4CC" }}>
              {(() => {
                const near = state.incidents.find(i => i.status === "INVESTIGATING" || i.status === "ACKNOWLEDGED");
                return near
                  ? `${(near as any).personId ?? "Unknown"} detected near ${near.zoneName ?? near.cameraId}`
                  : "P-098 approaching Restricted Equipment Zone";
              })()}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "#0D1520" }}>
                <div className="h-full rounded-full" style={{ width: "76%", background: "linear-gradient(90deg, #FFB80060, #FFB800)", boxShadow: "0 0 6px rgba(255,184,0,0.5)" }} />
              </div>
              <span className="font-mono text-[9px]" style={{ color: "#FFB800" }}>~4s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
