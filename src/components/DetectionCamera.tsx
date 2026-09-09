import React, { useRef, useState, useEffect, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { createIncident, createEvidence, getOrCreatePerson } from "../lib/api";
import { emitIncident, emitEvidence } from "../lib/detectionBus";
import { sendEmailAlert } from "../lib/emailAlerts";
import { saveBlob, pushLocalEvidence } from "../lib/clipStore";
import { startAlarm, stopAlarm } from "../lib/alarm";
import { setLiveZones } from "../lib/liveStreamStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawnZone {
  id: string; x: number; y: number; w: number; h: number;
  name: string; color: string;
}

export interface PersonDetection {
  bbox: [number, number, number, number];
  score: number; inZone: boolean; zoneId?: string; zoneName?: string;
}

export interface IntrusionEvent {
  id: string; time: string; zoneId: string; zoneName: string;
  confidence: number; ts: number; clipUrl?: string | null; uploading?: boolean;
}

interface Props {
  videoSrc?: string;
  mediaStream?: MediaStream;
  camId: string; camName: string;
  onIntrusion?: (evt: IntrusionEvent) => void;
}

const ZONE_COLORS = ["#EF4444", "#F97316", "#F59E0B", "#22D3EE", "#3B82F6", "#A855F7"];
const CLIP_DURATION_MS = 3_000;
const DEBOUNCE_MS = 8_000;

function overlap(ax: number, ay: number, aw: number, ah: number,
                 bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DetectionCamera({ videoSrc, mediaStream, camId, camName, onIntrusion }: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef     = useRef<cocoSsd.ObjectDetection | null>(null);
  const rafRef       = useRef<number>(0);
  const drawingRef   = useRef<{ sx: number; sy: number } | null>(null);
  const zonesRef     = useRef<DrawnZone[]>([]);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const lastEventRef  = useRef<Map<string, number>>(new Map());
  // Tracks when each zone breach first started — clip fires after DWELL_MS inside the zone
  const breachStartRef = useRef<Map<string, number>>(new Map());
  // Refs for alarm state — avoids recreating runDetection on alarm toggle
  const alarmOnRef   = useRef(false);
  const detectingRef = useRef(false);

  const [modelReady,   setModelReady]   = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [drawMode,     setDrawMode]     = useState(false);
  const [zones,        setZones]        = useState<DrawnZone[]>([]);
  const [detections,   setDetections]   = useState<PersonDetection[]>([]);
  const [intrusions,   setIntrusions]   = useState<IntrusionEvent[]>([]);
  const [mouseZone,    setMouseZone]    = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [colorIdx,     setColorIdx]     = useState(0);
  const [detecting,      setDetecting]      = useState(false);
  const [alarmOn,        setAlarmOn]        = useState(false);
  const [recording,      setRecording]      = useState(false);
  const [recSecs,        setRecSecs]        = useState(0);
  const [evidenceSaved,  setEvidenceSaved]  = useState<IntrusionEvent | null>(null);
  const [saveToast,      setSaveToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { zonesRef.current = zones; }, [zones]);

  // Publish normalized zones to the global store so Overview can render them
  useEffect(() => {
    const canvas = canvasRef.current;
    const W = canvas?.width  || 0;
    const H = canvas?.height || 0;
    if (W === 0 || H === 0) {
      setLiveZones(zones.map(z => ({ id: z.id, name: z.name, color: z.color, xPct: 0.1, yPct: 0.1, wPct: 0.8, hPct: 0.8 })));
      return;
    }
    setLiveZones(zones.map(z => ({
      id: z.id, name: z.name, color: z.color,
      xPct: z.x / W, yPct: z.y / H, wPct: z.w / W, hPct: z.h / H,
    })));
  }, [zones]);
  useEffect(() => { detectingRef.current = detecting; }, [detecting]);
  useEffect(() => { alarmOnRef.current = alarmOn; }, [alarmOn]);

  // Load model
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (!dead) { modelRef.current = model; setModelReady(true); setModelLoading(false); }
      } catch {
        if (!dead) { setLoadError("AI model failed to load."); setModelLoading(false); }
      }
    })();
    return () => { dead = true; };
  }, []);

  // Wire MediaStream to the video element when provided (webcam / live camera)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaStream) return;
    video.srcObject = mediaStream;
    video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [mediaStream]);

  useEffect(() => { if (modelReady) setDetecting(true); }, [modelReady]);
  useEffect(() => () => stopAlarm(), []);

  // Toast helper
  const showToast = useCallback((msg: string, ok: boolean) => {
    setSaveToast({ msg, ok });
    setTimeout(() => setSaveToast(null), 4000);
  }, []);

  // ── Persist Incident + Evidence to backend ────────────────────────────────
  const persistIncident = useCallback(async (
    blob: Blob | null, zoneId: string, zoneName: string, confidence: number,
  ) => {
    const detectedAt         = new Date().toISOString();
    const recordingStartedAt = new Date().toISOString();
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });

    const riskScore = Math.min(100, Math.round(confidence * 0.9 + 10));
    const severity  = confidence >= 90 ? "CRITICAL" : confidence >= 75 ? "HIGH" : confidence >= 55 ? "MEDIUM" : "LOW";

    // Generate a stable local ID for this evidence entry
    const localId = `EVD-local-${Date.now()}`;

    // 1. Persist blob to IndexedDB (survives navigation + refresh)
    let clipUrl: string | null = null;
    if (blob && blob.size > 512) {
      try {
        await saveBlob(localId, blob);
        clipUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.warn("IndexedDB save failed:", e);
        clipUrl = URL.createObjectURL(blob);
      }
    }

    // 2. Persist metadata to localStorage
    pushLocalEvidence({
      id: localId,
      incidentId: `INC-local-${Date.now()}`,
      cameraId: camId,
      cameraName: camName,
      zoneId, zoneName,
      eventType: "UNAUTHORIZED_ENTRY",
      severity, confidence,
      detectedAt,
      duration: CLIP_DURATION_MS / 1000,
      hasBlob: !!clipUrl,
      createdAt: new Date().toISOString(),
    });

    // 3. Update local UI immediately
    const evt: IntrusionEvent = {
      id: localId, time, zoneId, zoneName, confidence,
      ts: Date.now(), clipUrl, uploading: false,
    };
    setIntrusions(prev => [evt, ...prev].slice(0, 100));
    onIntrusion?.(evt);

    // Flash EVIDENCE SAVED state (clears after 6 s)
    setEvidenceSaved(evt);
    setTimeout(() => setEvidenceSaved(prev => prev?.id === evt.id ? null : prev), 6000);

    showToast(clipUrl ? "Evidence saved" : "Incident logged", true);

    // 4. Emit local incident into store IMMEDIATELY — no backend dependency.
    //    This is what makes Incidents / Analytics / People update in real time.
    const personLabel = `P-${camId.replace(/\D/g, "").padStart(3, "0")}`;
    const localIncident = {
      id: localId.replace("EVD-local-", "INC-local-"),
      cameraId: camId, cameraName: camName,
      zoneId, zoneName,
      personId: personLabel,
      eventType: "UNAUTHORIZED_ENTRY" as const,
      severity: severity as any,
      status: "NEW" as const,
      confidence, riskScore,
      detectedAt,
      createdAt: new Date().toISOString(),
    };
    emitIncident(localIncident);

    const localEvidence = {
      id: localId,
      incidentId: localIncident.id,
      cameraId: camId, cameraName: camName,
      zoneId, zoneName,
      personId: personLabel,
      videoUrl: clipUrl,
      thumbnailUrl: null,
      eventType: "UNAUTHORIZED_ENTRY" as const,
      severity: severity as any,
      confidence, riskScore,
      recordingStartedAt,
      detectedAt,
      recordingEndedAt: new Date().toISOString(),
      duration: CLIP_DURATION_MS / 1000,
      status: (clipUrl ? "SAVED" : "UNAVAILABLE") as any,
      createdAt: new Date().toISOString(),
    };
    emitEvidence(localEvidence);

    // 5. Also persist to backend (best-effort — failures don't affect UI)
    try {
      const person = await getOrCreatePerson(camId);
      const incident = await createIncident({
        cameraId: camId, cameraName: camName,
        zoneId, zoneName,
        personId: person.displayId,
        eventType: "UNAUTHORIZED_ENTRY",
        severity, confidence, riskScore, detectedAt,
      });
      // Emit again with real backend ID so store deduplicates correctly
      emitIncident(incident);
      const evidence = await createEvidence({
        incidentId: incident.id,
        cameraId: camId, cameraName: camName,
        zoneId, zoneName,
        personId: person.displayId,
        eventType: "UNAUTHORIZED_ENTRY",
        severity, confidence, riskScore, detectedAt,
        recordingStartedAt,
        recordingEndedAt: new Date().toISOString(),
        duration: CLIP_DURATION_MS / 1000,
        videoUrl: clipUrl,
      });
      emitEvidence(evidence);
    } catch {
      // Backend unavailable — local incident already in store, no action needed
    }

    // 5. Send automatic email alert for confirmed restricted-area intrusion (one per intrusion)
    sendEmailAlert({
      incidentId: localId,
      camera: camId,
      zone: zoneName,
      person: `P-${camId.replace(/\D/g, "").padStart(3, "0")}`,
      severity,
      confidence,
      riskScore,
      time,
      hasEvidence: !!clipUrl,
      evidenceId: clipUrl ? localId : undefined,
      onStatusChange: (record) => {
        if (record.status === "SENT") showToast(`Email alert sent to ${record.recipient}`, true);
        if (record.status === "FAILED") showToast(`Email alert failed: ${record.error}`, false);
      },
    }).catch(() => {});
  }, [camId, camName, onIntrusion, showToast]);

  // ── Capture a video clip ──────────────────────────────────────────────────
  const captureClip = useCallback((zoneId: string, zoneName: string, confidence: number) => {
    const video = videoRef.current;
    if (!video || recorderRef.current) return; // already recording

    // Person has already been inside the zone for DWELL_MS — start recording NOW.
    // The clip will show them already inside the restricted area.
    if (video.paused) video.play().catch(() => {});

    let stream: MediaStream | null = null;
    try {
      stream = (video as any).captureStream?.() ?? (video as any).mozCaptureStream?.();
    } catch (e) {
      console.warn("captureStream not supported:", e);
    }

    if (!stream || stream.getTracks().length === 0) {
      persistIncident(null, zoneId, zoneName, confidence);
      return;
    }

    const mimeType = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
      "",
    ].find(m => !m || MediaRecorder.isTypeSupported(m)) ?? "";

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 1_500_000 } : undefined);
    } catch (e) {
      console.warn("MediaRecorder init failed:", e);
      persistIncident(null, zoneId, zoneName, confidence);
      return;
    }

    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onerror = (e) => { console.error("MediaRecorder error:", e); };
    recorder.onstop = async () => {
      recorderRef.current = null;
      setRecording(false);
      const chunks = chunksRef.current;
      chunksRef.current = [];
      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      persistIncident(blob.size > 512 ? blob : null, zoneId, zoneName, confidence);
    };

    try {
      recorder.start(100);
    } catch (e) {
      console.error("MediaRecorder.start failed:", e);
      persistIncident(null, zoneId, zoneName, confidence);
      return;
    }

    recorderRef.current = recorder;
    setRecording(true);

    setTimeout(() => {
      if (recorderRef.current?.state === "recording") {
        try { recorderRef.current.stop(); } catch { /* already stopped */ }
      }
    }, CLIP_DURATION_MS);
  }, [persistIncident]);

  // ── Detection loop — no state deps, uses refs ─────────────────────────────
  const runDetection = useCallback(async () => {
    if (!detectingRef.current) {
      rafRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const model  = modelRef.current;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!model || !video || !canvas || video.paused || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(runDetection);
      return;
    }

    let preds: cocoSsd.DetectedObject[] = [];
    try { preds = await model.detect(video); } catch { /* skip frame */ }

    const W  = canvas.width,  H  = canvas.height;
    const vW = video.videoWidth || W, vH = video.videoHeight || H;
    const sx = W / vW, sy = H / vH;

    const persons: PersonDetection[] = preds
      .filter(p => p.class === "person" && p.score > 0.4)
      .map(p => {
        const [px, py, pw, ph] = p.bbox;
        const bx = px * sx, by = py * sy, bw = pw * sx, bh = ph * sy;
        let inZone = false, zoneId: string | undefined, zoneName: string | undefined;
        for (const z of zonesRef.current) {
          if (overlap(bx, by, bw, bh, z.x, z.y, z.w, z.h)) {
            inZone = true; zoneId = z.id; zoneName = z.name; break;
          }
        }
        return { bbox: [bx, by, bw, bh], score: p.score, inZone, zoneId, zoneName };
      });

    setDetections(persons);
    drawOverlay(canvas, persons);

    const hasZones = zonesRef.current.length > 0;
    const breachingZones = persons.filter(p => p.inZone);
    const now = Date.now();

    // Alarm + recording only fire when zones are drawn AND someone is inside one
    if (hasZones && breachingZones.length > 0) {
      if (!alarmOnRef.current) {
        alarmOnRef.current = true;
        setAlarmOn(true);
        startAlarm();
      }
    } else {
      if (alarmOnRef.current) {
        alarmOnRef.current = false;
        setAlarmOn(false);
        stopAlarm();
      }
    }

    // ── Dwell-based clip trigger ──────────────────────────────────────────────
    // The clip only fires after a person has been continuously inside the zone
    // for DWELL_MS. This guarantees the recorded video shows them already
    // inside the restricted area — never at the boundary-crossing moment.
    const DWELL_MS = 1500;

    // Only trigger recording when zones are drawn AND a person has been
    // confirmed inside a zone for DWELL_MS. No zones = no recording, ever.
    if (hasZones) {
      const activeZoneIds = new Set(breachingZones.map(p => p.zoneId!));

      // Reset dwell timer for zones no longer actively breached
      for (const key of breachStartRef.current.keys()) {
        if (!activeZoneIds.has(key)) breachStartRef.current.delete(key);
      }

      for (const p of breachingZones) {
        const zKey = p.zoneId!;
        const lastEvent = lastEventRef.current.get(zKey) ?? 0;
        if (now - lastEvent < DEBOUNCE_MS) continue;

        if (!breachStartRef.current.has(zKey)) {
          breachStartRef.current.set(zKey, now);
        }

        const dwell = now - (breachStartRef.current.get(zKey) ?? now);
        if (dwell >= DWELL_MS) {
          lastEventRef.current.set(zKey, now);
          breachStartRef.current.delete(zKey);
          captureClip(zKey, p.zoneName!, Math.round(p.score * 100));
        }
      }
    } else {
      // No zones drawn — clear any stale dwell state, do NOT record
      breachStartRef.current.clear();
    }

    rafRef.current = requestAnimationFrame(runDetection);
  }, [captureClip]); // no alarmOn/detecting state — uses refs

  // Draw boxes + zones
  const drawOverlay = (canvas: HTMLCanvasElement, persons: PersonDetection[]) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const z of zonesRef.current) {
      ctx.save();
      ctx.strokeStyle = z.color; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = z.color + "14"; ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.setLineDash([]);
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      const lw = ctx.measureText(z.name).width + 12;
      ctx.fillStyle = z.color + "dd"; ctx.fillRect(z.x, z.y, lw, 18);
      ctx.fillStyle = "#070A0F"; ctx.fillText(z.name, z.x + 6, z.y + 12);
      ctx.restore();
    }

    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      const [bx, by, bw, bh] = p.bbox;
      const color = p.inZone ? "#EF4444" : "#22D3EE";
      const label = `P-${100 + i + 1}  ${Math.round(p.score * 100)}%`;
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = p.inZone ? 2 : 1.5;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = color; ctx.fillRect(bx, by - 18, tw, 18);
      ctx.fillStyle = "#070A0F"; ctx.fillText(label, bx + 6, by - 6);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(bx + bw / 2, by + bh, 3, 0, Math.PI * 2); ctx.fill();
      if (p.inZone) {
        ctx.fillStyle = "#EF444330"; ctx.strokeStyle = "#EF4444"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(bx, by + bh + 5, 130, 16, 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#EF4444"; ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.fillText("⚠ ZONE BREACH — RECORDING", bx + 5, by + bh + 14);
      }
      ctx.restore();
    }
  };

  // Sync canvas size
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const el = containerRef.current; const c = canvasRef.current;
      if (el && c) { c.width = el.clientWidth; c.height = el.clientHeight; }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Recording timer counter — drives "REC 00:07" display
  useEffect(() => {
    if (!recording) { setRecSecs(0); return; }
    setRecSecs(0);
    const id = setInterval(() => setRecSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Start/stop RAF loop — only restarts when runDetection itself changes (not on alarm toggle)
  useEffect(() => {
    if (!modelReady) return;
    rafRef.current = requestAnimationFrame(runDetection);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [modelReady, runDetection]);

  // Zone drawing
  const pos = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onMD = (e: React.MouseEvent) => { if (drawMode) { const p = pos(e); drawingRef.current = { sx: p.x, sy: p.y }; } };
  const onMM = (e: React.MouseEvent) => {
    if (!drawMode || !drawingRef.current) return;
    const { x, y } = pos(e); const dr = drawingRef.current;
    setMouseZone({ x: Math.min(dr.sx, x), y: Math.min(dr.sy, y), w: Math.abs(x - dr.sx), h: Math.abs(y - dr.sy) });
  };
  const onMU = (e: React.MouseEvent) => {
    if (!drawMode || !drawingRef.current) return;
    const { x, y } = pos(e); const dr = drawingRef.current;
    const w = Math.abs(x - dr.sx), h = Math.abs(y - dr.sy);
    if (w > 10 && h > 10) {
      setZones(prev => [...prev, {
        id: `zone-${Date.now()}`, x: Math.min(dr.sx, x), y: Math.min(dr.sy, y), w, h,
        name: `ZONE ${prev.length + 1}`, color: ZONE_COLORS[colorIdx % ZONE_COLORS.length],
      }]);
      setColorIdx(c => c + 1);
    }
    drawingRef.current = null; setMouseZone(null);
  };

  const inZoneCount = detections.filter(d => d.inZone).length;

  return (
    <div className="flex flex-col h-full" style={{ background: "#0B1017" }}>

      {/* Save toast */}
      {saveToast && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 animate-fade-in px-4 py-2.5 rounded-[8px] flex items-center gap-2"
          style={{
            background: saveToast.ok ? "#0d2a1a" : "#200808",
            border: `1px solid ${saveToast.ok ? "#22C55E40" : "#EF444440"}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <span>{saveToast.ok ? "✓" : "✕"}</span>
          <span className="font-mono text-[11px]" style={{ color: saveToast.ok ? "#22C55E" : "#EF4444" }}>
            {saveToast.msg}
          </span>
        </div>
      )}

      {/* Toolbar — three visual states: NORMAL / INTRUSION / (recording indicator) */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0 flex-wrap"
        style={{
          borderBottom: `1px solid ${inZoneCount > 0 ? "#EF444430" : "#1A242F"}`,
          background: inZoneCount > 0 ? "rgba(239,68,68,0.04)" : "transparent",
          transition: "background 0.3s, border-color 0.3s",
        }}
      >
        {/* Camera ID + name */}
        <span className="font-mono text-[11px] font-semibold" style={{ color: "#22D3EE" }}>{camId}</span>
        <span className="font-mono text-[10px]" style={{ color: "#64748B" }}>·</span>
        <span className="font-mono text-[10px]" style={{ color: "#94A3B8" }}>{camName}</span>

        <div style={{ flex: 1 }} />

        {/* AI state pill */}
        {modelLoading ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[5px]" style={{ background: "#1A1200", border: "1px solid #F59E0B30" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#F59E0B" }} />
            <span className="font-mono text-[10px]" style={{ color: "#F59E0B" }}>LOADING AI</span>
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[5px]" style={{ background: "#200808", border: "1px solid #EF444430" }}>
            <span className="font-mono text-[10px]" style={{ color: "#EF4444" }}>AI ERROR</span>
          </div>
        ) : inZoneCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[5px]" style={{ background: "#1A0000", border: "1px solid #EF444450", boxShadow: "0 0 8px rgba(239,68,68,0.2)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#EF4444" }} />
            <span className="font-mono text-[10px] font-bold" style={{ color: "#EF4444" }}>AI ALERT</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[5px]" style={{ background: "#0a1a0f", border: "1px solid #22C55E30" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#22C55E" }} />
            <span className="font-mono text-[10px]" style={{ color: "#22C55E" }}>AI READY</span>
          </div>
        )}

        {/* Recording state pill */}
        {recording ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[5px]" style={{ background: "#200808", border: "1px solid #EF444460", boxShadow: "0 0 10px rgba(239,68,68,0.25)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#EF4444" }} />
            <span className="font-mono text-[10px] font-bold" style={{ color: "#EF4444" }}>
              ● REC {String(Math.floor(recSecs / 60)).padStart(2, "0")}:{String(recSecs % 60).padStart(2, "0")}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[5px]" style={{ background: "#111821", border: "1px solid #24303D" }}>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#24303D" }} />
            <span className="font-mono text-[10px]" style={{ color: "#475569" }}>STANDBY</span>
          </div>
        )}

        {/* Draw zone button */}
        <button
          onClick={() => setDrawMode(m => !m)}
          disabled={!modelReady}
          className="px-2.5 py-1 rounded-[5px] font-mono text-[10px]"
          style={{
            background: drawMode ? "#0d1f2a" : "transparent",
            color: drawMode ? "#22D3EE" : "#475569",
            border: `1px solid ${drawMode ? "#22D3EE40" : "#24303D"}`,
            opacity: modelReady ? 1 : 0.4,
          }}
        >
          ✏ {drawMode ? "DRAWING…" : "DRAW ZONE"}
        </button>

        {/* Pause / resume */}
        <button
          onClick={() => { setDetecting(d => { const next = !d; detectingRef.current = next; return next; }); }}
          disabled={!modelReady}
          className="px-2.5 py-1 rounded-[5px] font-mono text-[10px]"
          style={{
            background: "transparent",
            color: detecting ? "#475569" : "#22C55E",
            border: "1px solid #24303D",
            opacity: modelReady ? 1 : 0.4,
          }}
        >
          {detecting ? "⏸ PAUSE" : "▶ RESUME"}
        </button>

        {/* Mute alarm */}
        {alarmOn && (
          <button
            onClick={() => { stopAlarm(); alarmOnRef.current = false; setAlarmOn(false); }}
            className="flex items-center gap-1 px-2 py-1 rounded-[5px] font-mono text-[10px]"
            style={{ background: "#1a0d00", color: "#F97316", border: "1px solid #F9731640" }}
          >
            🔔 MUTE
          </button>
        )}
      </div>

      {/* Main */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Video */}
        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={containerRef}
            className="relative flex-1"
            style={{
              background: "#000",
              cursor: drawMode ? "crosshair" : "default",
              boxShadow: inZoneCount > 0 ? "inset 0 0 0 2px rgba(239,68,68,0.5)" : "none",
              transition: "box-shadow 0.3s",
            }}
          >
            <video
              ref={videoRef}
              src={mediaStream ? undefined : videoSrc}
              autoPlay loop={!mediaStream} muted playsInline
              className="absolute inset-0 w-full h-full object-contain"
              style={{ zIndex: 0 }}
            />

            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ zIndex: 2, pointerEvents: drawMode ? "auto" : "none" }}
              onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU}
              onMouseLeave={() => { drawingRef.current = null; setMouseZone(null); }}
            />

            {drawMode && mouseZone && (
              <div className="absolute pointer-events-none" style={{
                left: mouseZone.x, top: mouseZone.y, width: mouseZone.w, height: mouseZone.h,
                border: `2px solid ${ZONE_COLORS[colorIdx % ZONE_COLORS.length]}`,
                background: ZONE_COLORS[colorIdx % ZONE_COLORS.length] + "18", zIndex: 3,
              }} />
            )}

            {drawMode && !mouseZone && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[10px] px-3 py-1.5 rounded-full" style={{ background: "rgba(34,211,238,0.15)", color: "#22D3EE", border: "1px solid #22D3EE40", zIndex: 4, whiteSpace: "nowrap" }}>
                Click and drag to define a restricted zone
              </div>
            )}

            {/* Surveillance mode hint — no zones, incidents fire for any detected person */}
            {modelReady && detecting && zones.length === 0 && !drawMode && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-[8px] animate-fade-in" style={{ background: "rgba(11,16,23,0.88)", border: "1px solid #22C55E30", whiteSpace: "nowrap", backdropFilter: "blur(6px)" }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: "#22C55E" }} />
                <span className="font-mono text-[10px]" style={{ color: "#94A3B8" }}>
                  Surveillance mode — incidents log for any detected person
                </span>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded" style={{ background: "#0d2a1a", color: "#22C55E", border: "1px solid #22C55E30" }}>
                  Draw zones for alarm
                </span>
              </div>
            )}

            {/* STATE B — RESTRICTED ZONE BREACH banner */}
            {inZoneCount > 0 && (
              <div className="absolute top-0 left-0 right-0 z-10 animate-fade-in" style={{ background: "linear-gradient(to bottom, rgba(20,4,4,0.96) 0%, rgba(20,4,4,0) 100%)", padding: "10px 14px 18px" }}>
                {/* Top row: severity label */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#EF4444" }} />
                  <span className="font-mono text-[10px] font-bold tracking-widest" style={{ color: "#EF4444", letterSpacing: "0.14em" }}>
                    RESTRICTED ZONE BREACH
                  </span>
                  {recording && (
                    <span className="ml-auto font-mono text-[10px] font-bold" style={{ color: "#EF4444" }}>
                      ● {String(Math.floor(recSecs / 60)).padStart(2, "0")}:{String(recSecs % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>

                {/* Intruder rows */}
                {detections.filter(d => d.inZone).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[11px] font-bold" style={{ color: "#FCA5A5" }}>
                      P-{(100 + i + 1)} INTRUSION
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#EF444418", color: "#EF4444", border: "1px solid #EF444440" }}>
                      {d.zoneName ?? "ZONE"}
                    </span>
                    <span className="font-mono text-[9px] ml-auto" style={{ color: "#94A3B8" }}>
                      {Math.round(d.score * 100)}% CONF
                    </span>
                  </div>
                ))}

                {/* Camera + zone sub-row */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-mono text-[9px]" style={{ color: "#64748B" }}>{camId} · {camName}</span>
                  {recording && (
                    <span className="font-mono text-[9px] ml-auto" style={{ color: "#64748B" }}>
                      EVENT RECORDING · Capturing evidence…
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Pre-event buffer label — shown during active breach/recording */}
            {(inZoneCount > 0 || recording) && (
              <div className="absolute bottom-10 right-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-[5px] animate-fade-in" style={{ background: "rgba(11,16,23,0.75)", border: "1px solid #1A242F" }}>
                <span className="font-mono text-[9px]" style={{ color: "#334155" }}>PRE-EVENT BUFFER 5s</span>
              </div>
            )}

            {/* STATE C — EVIDENCE SAVED flash */}
            {evidenceSaved && !recording && inZoneCount === 0 && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 animate-fade-in flex items-center gap-2 px-4 py-2 rounded-[8px]" style={{ background: "#0a1a0f", border: "1px solid #22C55E50", boxShadow: "0 0 20px rgba(34,197,94,0.2)", whiteSpace: "nowrap" }}>
                <span style={{ color: "#22C55E", fontSize: 13 }}>✓</span>
                <div>
                  <div className="font-mono text-[10px] font-bold" style={{ color: "#22C55E" }}>EVIDENCE SAVED</div>
                  <div className="font-mono text-[9px]" style={{ color: "#475569" }}>
                    {evidenceSaved.zoneName} · {evidenceSaved.time} · {camId}
                  </div>
                </div>
              </div>
            )}

            {modelLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: "rgba(7,10,15,0.8)", backdropFilter: "blur(3px)" }}>
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: "#22D3EE", animationDelay: `${i * 0.2}s` }} />)}
                </div>
                <div className="font-mono text-[11px] tracking-widest uppercase" style={{ color: "#22D3EE" }}>Loading AI Model…</div>
                <div className="font-mono text-[10px]" style={{ color: "#475569" }}>COCO-SSD · MobileNet v2 · WebGL</div>
              </div>
            )}

            {["tl","tr","bl","br"].map(c => (
              <div key={c} className="absolute pointer-events-none" style={{
                top: c.startsWith("t") ? 10 : undefined, bottom: c.startsWith("b") ? 10 : undefined,
                left: c.endsWith("l") ? 10 : undefined, right: c.endsWith("r") ? 10 : undefined,
                width: 14, height: 14, zIndex: 5,
                borderTop: c.startsWith("t") ? "1.5px solid rgba(34,211,238,0.4)" : undefined,
                borderBottom: c.startsWith("b") ? "1.5px solid rgba(34,211,238,0.4)" : undefined,
                borderLeft: c.endsWith("l") ? "1.5px solid rgba(34,211,238,0.4)" : undefined,
                borderRight: c.endsWith("r") ? "1.5px solid rgba(34,211,238,0.4)" : undefined,
              }} />
            ))}
            <div className="absolute inset-0 scanline pointer-events-none" style={{ zIndex: 1 }} />
          </div>

          <div
            className="flex items-center gap-3 px-3 py-1.5 flex-shrink-0"
            style={{ borderTop: `1px solid ${inZoneCount > 0 ? "#EF444428" : "#1A242F"}`, background: inZoneCount > 0 ? "rgba(239,68,68,0.03)" : "transparent", transition: "all 0.3s" }}
          >
            {/* LIVE dot */}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#22C55E" }} />
              <span className="font-mono text-[9px]" style={{ color: "#475569" }}>LIVE</span>
            </div>

            <span className="font-mono text-[9px]" style={{ color: "#1A242F" }}>|</span>

            {/* State label */}
            {recording ? (
              <span className="font-mono text-[9px] font-bold" style={{ color: "#EF4444" }}>EVENT RECORDING · {CLIP_DURATION_MS / 1000}s clip</span>
            ) : inZoneCount > 0 ? (
              <span className="font-mono text-[9px]" style={{ color: "#F97316" }}>BREACH ACTIVE · recording pending…</span>
            ) : evidenceSaved ? (
              <span className="font-mono text-[9px]" style={{ color: "#22C55E" }}>EVIDENCE SAVED · {evidenceSaved.time}</span>
            ) : (
              <span className="font-mono text-[9px]" style={{ color: "#334155" }}>Event-triggered recording · standby</span>
            )}

            <div style={{ flex: 1 }} />

            {modelReady && detections.length > 0 && (
              <span className="font-mono text-[9px]" style={{ color: inZoneCount > 0 ? "#EF4444" : "#334155" }}>
                {detections.length}P detected{inZoneCount > 0 ? ` · ${inZoneCount} IN ZONE` : ""}
              </span>
            )}

            {zones.length > 0 && (
              <button onClick={() => setZones([])} className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: "#475569", border: "1px solid #24303D" }}>
                CLR ZONES
              </button>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 240, borderLeft: "1px solid #1A242F" }}>

          {/* Zones */}
          <div className="flex-shrink-0" style={{ borderBottom: "1px solid #1A242F" }}>
            <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid #1A242F" }}>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#475569" }}>Restricted Zones</span>
              <span className="font-mono text-[10px]" style={{ color: "#64748B" }}>{zones.length}</span>
            </div>
            {zones.length === 0 ? (
              <div className="px-3 py-3 text-center">
                <div className="font-mono text-[10px] mb-1" style={{ color: "#475569" }}>No zones defined</div>
                <div className="text-[10px]" style={{ color: "#24303D" }}>Enable Draw Zone and drag on video</div>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
                {zones.map(z => (
                  <div key={z.id} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid #1A242F" }}>
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: z.color + "60", border: `1.5px solid ${z.color}` }} />
                    <span className="font-mono text-[10px] flex-1 truncate" style={{ color: "#CBD5E1" }}>{z.name}</span>
                    <button onClick={() => setZones(p => p.filter(zz => zz.id !== z.id))} className="font-mono text-[10px] text-[#475569] hover:text-[#EF4444]">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live detections */}
          <div className="flex-shrink-0" style={{ borderBottom: "1px solid #1A242F" }}>
            <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid #1A242F" }}>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#475569" }}>Live Detections</span>
              <span className="font-mono text-[10px]" style={{ color: "#64748B" }}>{detections.length}</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 100 }}>
              {detections.length === 0 ? (
                <div className="px-3 py-2 font-mono text-[10px] text-center" style={{ color: "#475569" }}>
                  {modelReady ? "No persons in frame" : "Waiting for model…"}
                </div>
              ) : detections.map((d, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: "1px solid #1A242F" }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.inZone ? "#EF4444" : "#22D3EE" }} />
                  <span className="font-mono text-[10px] flex-1" style={{ color: d.inZone ? "#EF4444" : "#22D3EE" }}>P-{100 + i + 1}</span>
                  <span className="font-mono text-[10px]" style={{ color: "#64748B" }}>{Math.round(d.score * 100)}%</span>
                  {d.inZone && <span className="font-mono text-[9px]" style={{ color: "#EF4444" }}>⚠</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Saved Clips — event-triggered evidence log */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0" style={{ borderBottom: "1px solid #1A242F" }}>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#475569" }}>Saved Clips</span>
              {intrusions.length > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#200808", color: "#EF4444", border: "1px solid #EF444430" }}>
                  {String(intrusions.length).padStart(2, "0")}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {intrusions.length === 0 ? (
                <div className="px-3 py-8 text-center flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#111821", border: "1px solid #24303D" }}>
                    <span style={{ color: "#24303D", fontSize: 14 }}>◉</span>
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "#334155" }}>No events recorded</div>
                  <div className="font-mono text-[9px] text-center leading-relaxed" style={{ color: "#1A242F" }}>
                    Recording triggers automatically<br />on confirmed zone breach
                  </div>
                </div>
              ) : intrusions.map((evt, i) => {
                const incId = `INC-${evt.id.replace(/\D/g, "").slice(-4).padStart(3, "0")}`;
                const durationSec = CLIP_DURATION_MS / 1000;
                return (
                  <div
                    key={evt.id}
                    className="px-3 py-3 animate-fade-in"
                    style={{
                      borderBottom: "1px solid #1A242F",
                      background: i === 0 && !recording ? "rgba(239,68,68,0.04)" : "transparent",
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="font-mono text-[9px] font-bold" style={{ color: "#22D3EE" }}>{incId}</span>
                      <span className="ml-auto font-mono text-[9px]" style={{ color: "#334155" }}>{evt.time}</span>
                    </div>

                    {/* Event type */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#EF4444" }} />
                      <span className="font-mono text-[9px] font-bold" style={{ color: "#EF4444" }}>RESTRICTED ZONE BREACH</span>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-0.5 mb-2">
                      <div className="font-mono text-[9px]" style={{ color: "#64748B" }}>{camId} · {evt.zoneName}</div>
                      <div className="font-mono text-[9px]" style={{ color: "#475569" }}>
                        {String(Math.floor(durationSec / 60)).padStart(2, "0")}:{String(durationSec % 60).padStart(2, "0")} · {evt.confidence}% conf
                      </div>
                    </div>

                    {/* Clip / action */}
                    {evt.clipUrl ? (
                      <div>
                        <video
                          src={evt.clipUrl}
                          controls
                          muted
                          style={{ width: "100%", borderRadius: 4, maxHeight: 80, background: "#000", border: "1px solid #1A242F" }}
                        />
                        <div className="font-mono text-[8px] mt-1" style={{ color: "#334155" }}>
                          ✓ EVIDENCE CLIP · {durationSec}s
                        </div>
                      </div>
                    ) : evt.uploading ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full animate-pulse-dot" style={{ background: "#F59E0B" }} />
                        <span className="font-mono text-[9px]" style={{ color: "#F59E0B" }}>Processing clip…</span>
                      </div>
                    ) : (
                      <span className="font-mono text-[9px]" style={{ color: "#334155" }}>Incident logged · no video</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
