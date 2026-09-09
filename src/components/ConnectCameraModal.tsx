import React, { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import { XIcon } from "../icons";
import { supabase } from "../lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SourceType = "USB_WEBCAM" | "PHONE_CAMERA" | "IP_CAMERA";

export interface ConnectedCamera {
  id: string;
  name: string;
  sourceType: SourceType;
  stream?: MediaStream;
  streamUrl?: string;
  resolution: string;
  fps: number;
  status: "CONNECTING" | "LIVE" | "OFFLINE" | "PERMISSION_REQUIRED" | "ERROR";
  connectedAt: string;
}

interface Props {
  onConnect: (cam: ConnectedCamera) => void;
  onClose: () => void;
}

let camCounter = 1;
function nextCamId(prefix: string) { return `${prefix}-${camCounter++}`; }

// ── Real scannable QR Code via canvas ────────────────────────────────────────

function QrCode({ data }: { data: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    QRCode.toCanvas(canvasRef.current, data, {
      width: 160,
      margin: 1,
      color: { dark: "#0a0f14", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).catch(console.error);
  }, [data]);

  return <canvas ref={canvasRef} style={{ display: "block", borderRadius: 4 }} />;
}

// ── Source option card ────────────────────────────────────────────────────────

function SourceCard({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-4 px-4 py-4 rounded-[10px] text-left transition-all"
      style={{ background: "#0D1520", border: "1px solid #1E2D3D" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#22D3EE40")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E2D3D")}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[11px] font-bold mb-1 tracking-wider" style={{ color: "#E8F4FD" }}>{title}</div>
        <div className="text-[10px]" style={{ color: "#4A6580" }}>{desc}</div>
      </div>
      <span className="self-center text-xl" style={{ color: "#2E4560" }}>›</span>
    </button>
  );
}

// ── USB Webcam flow ───────────────────────────────────────────────────────────

function UsbWebcamFlow({ onConnect }: { onConnect: (s: MediaStream, label: string) => void }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState("");
  const [phase, setPhase] = useState<"pick" | "connecting" | "denied" | "error">("pick");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(d => { const cams = d.filter(x => x.kind === "videoinput"); setDevices(cams); if (cams[0]) setSelected(cams[0].deviceId); })
      .catch(() => {});
  }, []);

  const connect = async () => {
    setPhase("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selected ? { deviceId: { exact: selected } } : true,
        audio: false,
      });
      const label = devices.find(d => d.deviceId === selected)?.label || "Webcam";
      onConnect(stream, label);
    } catch (e: any) {
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") setPhase("denied");
      else { setErrMsg(e.message ?? "Could not access camera"); setPhase("error"); }
    }
  };

  if (phase === "connecting") return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: "#22D3EE", animationDelay: `${i * 0.2}s` }} />)}</div>
      <div className="font-mono text-[11px]" style={{ color: "#4A6580" }}>CONNECTING TO CAMERA…</div>
    </div>
  );

  if (phase === "denied") return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="font-mono text-sm font-bold" style={{ color: "#FF2D2D" }}>CAMERA ACCESS DENIED</div>
      <div className="text-[11px] max-w-xs" style={{ color: "#4A6580" }}>Allow camera access in your browser settings and try again.</div>
      <button onClick={() => setPhase("pick")} className="font-mono text-[11px] px-4 py-2 rounded-[6px]" style={{ background: "#200808", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.3)" }}>TRY AGAIN</button>
    </div>
  );

  if (phase === "error") return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="font-mono text-sm font-bold" style={{ color: "#FF2D2D" }}>CONNECTION FAILED</div>
      <div className="text-[11px]" style={{ color: "#4A6580" }}>{errMsg}</div>
      <button onClick={() => setPhase("pick")} className="font-mono text-[11px] px-4 py-2 rounded-[6px]" style={{ background: "#200808", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.3)" }}>TRY AGAIN</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#4A6580" }}>Available Cameras</div>
      {devices.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="text-[10px]" style={{ color: "#4A6580" }}>No cameras detected. Connect a webcam or request access.</div>
          <button onClick={connect} className="font-mono text-[10px] px-4 py-2 rounded-[6px]" style={{ background: "#0d1e30", color: "#22D3EE", border: "1px solid #22D3EE30" }}>REQUEST ACCESS</button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {devices.map((d, i) => (
              <button key={d.deviceId} onClick={() => setSelected(d.deviceId)}
                className="flex items-center gap-3 px-4 py-3 rounded-[8px] text-left"
                style={{ background: selected === d.deviceId ? "#0d2a1a" : "#0D1520", border: `1px solid ${selected === d.deviceId ? "#22C55E40" : "#1E2D3D"}` }}>
                <span style={{ fontSize: 18 }}>📷</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[11px]" style={{ color: selected === d.deviceId ? "#22C55E" : "#E8F4FD" }}>{d.label || `Camera ${i + 1}`}</div>
                </div>
                {selected === d.deviceId && <span style={{ color: "#22C55E" }}>✓</span>}
              </button>
            ))}
          </div>
          <button onClick={connect} className="w-full py-3 rounded-[8px] font-mono text-[11px] font-bold tracking-wider"
            style={{ background: "linear-gradient(135deg, #0d3a4a 0%, #0a2a38 100%)", color: "#22D3EE", border: "1px solid #22D3EE40" }}>
            CONNECT CAMERA
          </button>
        </>
      )}
    </div>
  );
}

// ── Phone Camera flow — WebRTC signaled via Supabase Realtime Broadcast ──────

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function PhoneCameraFlow({ onConnect }: { onConnect: (s: MediaStream) => void }) {
  const [code] = useState(randomCode);
  const [phase, setPhase]   = useState<"waiting" | "connecting" | "streaming" | "error">("waiting");
  const [errMsg, setErrMsg] = useState("");
  const [tunnelUrl, setTunnel] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // Fetch localtunnel URL (publicly accessible, bypasses Figma auth proxy)
  useEffect(() => {
    fetch("/api/tunnel-url")
      .then(r => r.json())
      .then(d => { if (d.url) setTunnel(d.url); })
      .catch(() => {});
  }, []);

  // QR code URL — available immediately (code is generated without network call)
  const senderUrl = tunnelUrl ? `${tunnelUrl}/camera-sender.html?code=${code}` : "";

  // WebRTC + Supabase Realtime signaling
  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    pcRef.current = pc;

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (stream) { setPhase("streaming"); onConnect(stream); }
    };

    const ch = supabase.channel(`webrtc-sentinelx-${code}`, { config: { broadcast: { ack: false } } });

    ch.on("broadcast", { event: "answer" }, async ({ payload }: any) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        setPhase("connecting");
      } catch (_) {}
    });

    ch.on("broadcast", { event: "ice-phone" }, async ({ payload }: any) => {
      try {
        if (payload?.candidate) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (_) {}
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ch.send({ type: "broadcast", event: "ice-desktop", payload: { candidate: e.candidate.toJSON() } });
      }
    };

    ch.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      try {
        const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: false });
        await pc.setLocalDescription(offer);
        await ch.send({ type: "broadcast", event: "offer", payload: { sdp: pc.localDescription } });
      } catch (e: any) {
        setErrMsg(e.message ?? "WebRTC offer failed");
        setPhase("error");
      }
    });

    return () => { pc.close(); ch.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const reset = () => window.location.reload();

  if (phase === "error") return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className="font-mono text-sm font-bold" style={{ color: "#FF2D2D" }}>CONNECTION FAILED</div>
      <div className="text-[11px] max-w-xs" style={{ color: "#4A6580" }}>{errMsg}</div>
      <button onClick={reset} className="font-mono text-[11px] px-4 py-2 rounded-[6px]" style={{ background: "#200808", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.3)" }}>TRY AGAIN</button>
    </div>
  );

  if (phase === "streaming") return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-4 py-3 rounded-[8px]" style={{ background: "#0d2a1a", border: "1px solid #22C55E30" }}>
        <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: "#22C55E" }} />
        <span className="font-mono text-[11px] font-bold" style={{ color: "#22C55E" }}>✓ PHONE CONNECTED — STREAMING</span>
      </div>
      <div className="text-[10px] text-center" style={{ color: "#4A6580" }}>Live feed is active. Close this modal to use the camera.</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-mono text-[11px] font-bold tracking-wider mb-1" style={{ color: "#E8F4FD" }}>USE PHONE AS CAMERA</div>
        <div className="text-[10px]" style={{ color: "#4A6580" }}>Scan the QR code with your phone browser to start streaming.</div>
      </div>

      <div className="flex flex-col gap-2">
        {[
          "Open your phone's camera app and scan the QR code below.",
          "If a localtunnel warning appears, tap \"Click to Continue\".",
          "Allow camera permission when prompted.",
          "Tap \"Start Streaming\" on your phone.",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold"
              style={{ background: "#131F2E", border: "1px solid #1E2D3D", color: "#22D3EE" }}>
              {i + 1}
            </div>
            <span className="text-[11px] pt-0.5" style={{ color: "#94B4CC" }}>{step}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-5 items-start">
        {/* QR code */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="p-2 rounded-[6px]" style={{ background: "white" }}>
            {senderUrl
              ? <QrCode data={senderUrl} />
              : <div className="flex items-center justify-center" style={{ width: 164, height: 164, background: "#f4f4f4" }}>
                  <div className="text-[10px] text-center" style={{ color: "#999", fontFamily: "monospace" }}>Building URL…</div>
                </div>
            }
          </div>
          <div className="font-mono text-[9px]" style={{ color: "#4A6580" }}>Scan with phone camera</div>
        </div>

        {/* URL + pairing code + status */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">

          {/* Big pairing code for manual entry */}
          <div className="px-3 py-2 rounded-[8px]" style={{ background: "#080E15", border: "1px solid #1E2D3D" }}>
            <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "#2E4560" }}>Pairing Code</div>
            <div className="font-mono text-2xl font-bold tracking-widest" style={{ color: "#22D3EE" }}>{code}</div>
          </div>

          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: "#4A6580" }}>Or open URL manually</div>
            <div
              className="font-mono text-[9px] px-2 py-1.5 rounded-[6px] break-all cursor-pointer"
              style={{ background: "#0D1520", border: "1px solid #1E2D3D", color: "#22D3EE" }}
              onClick={() => senderUrl && navigator.clipboard?.writeText(senderUrl).catch(() => {})}
              title="Click to copy"
            >
              {senderUrl || "Fetching tunnel URL…"}
            </div>
            <div className="font-mono text-[9px] mt-1" style={{ color: "#2E4560" }}>Tap to copy</div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-[6px]" style={{ background: "#0D1520", border: "1px solid #1E2D3D" }}>
            <span className="w-2 h-2 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: phase === "connecting" ? "#22C55E" : "#F59E0B" }} />
            <span className="font-mono text-[10px]" style={{ color: phase === "connecting" ? "#22C55E" : "#F59E0B" }}>
              {phase === "connecting" ? "PHONE CONNECTED — SYNCING…" : "WAITING FOR PHONE…"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── IP / CCTV Camera flow ─────────────────────────────────────────────────────

function IpCameraFlow({ onConnect }: { onConnect: (url: string, name: string) => void }) {
  const [url, setUrl]     = useState("");
  const [name, setName]   = useState("IP Camera");
  const [phase, setPhase] = useState<"form" | "connecting" | "error">("form");

  const connect = () => {
    if (!url.trim()) return;
    setPhase("connecting");
    const video = document.createElement("video");
    video.src = url;
    const timer = setTimeout(() => { cleanup(); onConnect(url, name || "IP Camera"); }, 4000);
    const onLoad = () => { clearTimeout(timer); cleanup(); onConnect(url, name || "IP Camera"); };
    const onErr  = () => { clearTimeout(timer); cleanup(); setPhase("error"); };
    const cleanup = () => { video.removeEventListener("loadedmetadata", onLoad); video.removeEventListener("error", onErr); };
    video.addEventListener("loadedmetadata", onLoad, { once: true });
    video.addEventListener("error", onErr, { once: true });
    video.load();
  };

  if (phase === "connecting") return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="flex gap-1.5">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: "#22D3EE", animationDelay: `${i * 0.2}s` }} />)}</div>
      <div className="font-mono text-[11px]" style={{ color: "#4A6580" }}>CONNECTING…</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: "#4A6580" }}>Camera Name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Main Entrance"
          className="w-full px-3 py-2.5 rounded-[8px] outline-none font-mono text-sm"
          style={{ background: "#0D1520", border: "1px solid #1E2D3D", color: "#E8F4FD" }} />
      </div>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: "#4A6580" }}>Stream URL</div>
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && connect()}
          placeholder="http://192.168.x.x:8080/video  or  rtsp://…"
          className="w-full px-3 py-2.5 rounded-[8px] outline-none font-mono text-[11px]"
          style={{ background: "#0D1520", border: "1px solid #1E2D3D", color: "#E8F4FD" }} />
        <div className="font-mono text-[9px] mt-1.5" style={{ color: "#2E4560" }}>
          For phone: install "IP Webcam" (Android) or "EpocCam" (iOS), start server, enter URL shown in app.
        </div>
      </div>
      {phase === "error" && (
        <div className="font-mono text-[10px] px-3 py-2 rounded-[6px]" style={{ background: "#200808", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.2)" }}>
          Could not reach that URL. Check the address and try again.
        </div>
      )}
      <button onClick={connect} disabled={!url.trim()} className="w-full py-3 rounded-[8px] font-mono text-[11px] font-bold tracking-wider"
        style={{ background: url.trim() ? "linear-gradient(135deg, #0d3a4a 0%, #0a2a38 100%)" : "#0D1520", color: url.trim() ? "#22D3EE" : "#2E4560", border: `1px solid ${url.trim() ? "#22D3EE40" : "#1E2D3D"}` }}>
        CONNECT CAMERA
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

type Screen = "select" | "usb" | "phone" | "ip";

export default function ConnectCameraModal({ onConnect, onClose }: Props) {
  const [screen, setScreen] = useState<Screen>("select");

  const handleUsb = useCallback((stream: MediaStream, label: string) => {
    onConnect({ id: nextCamId("WCAM"), name: label, sourceType: "USB_WEBCAM", stream, resolution: "HD", fps: 30, status: "LIVE", connectedAt: new Date().toISOString() });
  }, [onConnect]);

  const handlePhone = useCallback((stream: MediaStream) => {
    onConnect({ id: nextCamId("PHONE"), name: "Phone Camera", sourceType: "PHONE_CAMERA", stream, resolution: "1080p", fps: 30, status: "LIVE", connectedAt: new Date().toISOString() });
  }, [onConnect]);

  const handleIp = useCallback((url: string, name: string) => {
    onConnect({ id: nextCamId("IPCAM"), name, sourceType: "IP_CAMERA", streamUrl: url, resolution: "—", fps: 0, status: "LIVE", connectedAt: new Date().toISOString() });
  }, [onConnect]);

  const titles: Record<Screen, string> = { select: "Connect Camera", usb: "USB / Wired Webcam", phone: "Phone Camera", ip: "IP / CCTV Camera" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(4,7,9,0.92)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-[14px] overflow-hidden animate-fade-in"
        style={{ background: "#0D1520", border: "1px solid #1E2D3D", boxShadow: "0 32px 80px rgba(0,0,0,0.8)", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10" style={{ borderBottom: "1px solid #152030", background: "#0D1520" }}>
          <div className="flex items-center gap-3">
            {screen !== "select" && (
              <button onClick={() => setScreen("select")} className="font-mono text-[10px] px-2 py-1 rounded"
                style={{ color: "#4A6580", border: "1px solid #1E2D3D" }}>← BACK</button>
            )}
            <span className="font-display font-bold text-sm tracking-widest uppercase" style={{ color: "#E8F4FD" }}>{titles[screen]}</span>
          </div>
          <button onClick={onClose} className="text-[#4A6580] hover:text-[#E8F4FD] transition-colors"><XIcon size={16} /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {screen === "select" && (
            <div className="flex flex-col gap-3">
              <div className="font-mono text-[10px] mb-1" style={{ color: "#4A6580" }}>Select a camera source to add to SentinelX</div>
              <SourceCard icon="🎥" title="USB / WIRED WEBCAM" desc="Use a webcam connected to this device" onClick={() => setScreen("usb")} />
              <SourceCard icon="📱" title="PHONE CAMERA" desc="Stream from your phone via WebRTC — scan QR code with phone browser" onClick={() => setScreen("phone")} />
              <SourceCard icon="🌐" title="IP / CCTV CAMERA" desc="Connect via HTTP stream URL (IP Webcam app, RTSP proxy, HLS)" onClick={() => setScreen("ip")} />
            </div>
          )}
          {screen === "usb"   && <UsbWebcamFlow onConnect={handleUsb} />}
          {screen === "phone" && <PhoneCameraFlow onConnect={handlePhone} />}
          {screen === "ip"    && <IpCameraFlow onConnect={handleIp} />}
        </div>
      </div>
    </div>
  );
}
