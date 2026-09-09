import React, { useEffect, useRef, useState } from "react";
import Peer from "peerjs";

/**
 * Mobile-only Camera Sender page.
 * Opened on the phone by scanning the QR code shown in the desktop modal.
 * URL format: /#camera-sender?peer=DESKTOP_PEER_ID
 *
 * Uses PeerJS to stream rear camera to the desktop over WebRTC.
 */
export default function CameraSender() {
  const peerId = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("peer") ?? "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase]     = useState<"init" | "camera" | "connecting" | "streaming" | "error">("init");
  const [errorMsg, setError]  = useState("");
  const [facingMode, setFacing] = useState<"environment" | "user">("environment");
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef   = useRef<Peer | null>(null);

  const startCamera = async (facing: "environment" | "user") => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setPhase("camera");
    } catch (e: any) {
      setError(e.message ?? "Camera access denied");
      setPhase("error");
    }
  };

  useEffect(() => { startCamera(facingMode); }, []);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.destroy();
  }, []);

  const connect = () => {
    if (!peerId || !streamRef.current) return;
    setPhase("connecting");

    const peer = new Peer({ debug: 0 });
    peerRef.current = peer;

    peer.on("open", () => {
      const call = peer.call(peerId, streamRef.current!);
      call.on("stream", () => setPhase("streaming"));
      call.on("error", (e: any) => { setError(e.message ?? "Call failed"); setPhase("error"); });
      setPhase("streaming");
    });

    peer.on("error", (e: any) => {
      setError(e.message ?? "Peer connection failed");
      setPhase("error");
    });
  };

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacing(next);
    startCamera(next);
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: "#040709", color: "#E8F4FD", fontFamily: "'JetBrains Mono', monospace" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #152030", background: "#080E15" }}>
        <div>
          <div className="text-xs font-bold tracking-widest uppercase" style={{ color: "#22D3EE" }}>SENTINELX</div>
          <div className="text-[10px] tracking-wider" style={{ color: "#4A6580" }}>CAMERA SENDER</div>
        </div>
        <div className="flex items-center gap-2">
          {phase === "streaming" && (
            <>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
              <span className="text-[11px]" style={{ color: "#22C55E" }}>STREAMING</span>
            </>
          )}
          {phase === "connecting" && (
            <>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#F59E0B" }} />
              <span className="text-[11px]" style={{ color: "#F59E0B" }}>CONNECTING…</span>
            </>
          )}
          {phase === "camera" && (
            <>
              <span className="w-2 h-2 rounded-full" style={{ background: "#22D3EE" }} />
              <span className="text-[11px]" style={{ color: "#22D3EE" }}>READY</span>
            </>
          )}
        </div>
      </div>

      {/* Camera preview */}
      <div className="flex-1 relative overflow-hidden" style={{ background: "#000" }}>
        <video
          ref={videoRef}
          autoPlay muted playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {/* Corner brackets */}
        {["tl","tr","bl","br"].map(c => (
          <div key={c} className="absolute pointer-events-none" style={{
            top: c.startsWith("t") ? 16 : undefined, bottom: c.startsWith("b") ? 16 : undefined,
            left: c.endsWith("l") ? 16 : undefined, right: c.endsWith("r") ? 16 : undefined,
            width: 24, height: 24, zIndex: 5,
            borderTop: c.startsWith("t") ? "2px solid rgba(34,211,238,0.6)" : undefined,
            borderBottom: c.startsWith("b") ? "2px solid rgba(34,211,238,0.6)" : undefined,
            borderLeft: c.endsWith("l") ? "2px solid rgba(34,211,238,0.6)" : undefined,
            borderRight: c.endsWith("r") ? "2px solid rgba(34,211,238,0.6)" : undefined,
          }} />
        ))}

        {/* Streaming badge */}
        {phase === "streaming" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)" }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
            <span className="text-[11px]" style={{ color: "#22C55E" }}>LIVE · STREAMING TO SENTINELX</span>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ background: "rgba(4,7,9,0.9)" }}>
            <div className="text-2xl">⚠️</div>
            <div className="text-sm font-bold" style={{ color: "#FF2D2D" }}>CONNECTION ERROR</div>
            <div className="text-xs" style={{ color: "#4A6580" }}>{errorMsg}</div>
            <button
              onClick={() => { setPhase("init"); startCamera(facingMode); }}
              className="px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: "#200808", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.3)" }}
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 px-4 py-4" style={{ background: "#080E15", borderTop: "1px solid #152030" }}>

        {/* Camera info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: "#0D1520", border: "1px solid #1E2D3D" }}>
            <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "#2E4560" }}>Camera</div>
            <div className="text-[11px]" style={{ color: "#94B4CC" }}>{facingMode === "environment" ? "Rear Camera" : "Front Camera"} · 720p</div>
          </div>
          <button
            onClick={flipCamera}
            className="px-3 py-2 rounded-lg text-[11px]"
            style={{ background: "#0D1520", color: "#4A6580", border: "1px solid #1E2D3D" }}
          >
            🔄 Flip
          </button>
        </div>

        {/* Connect / Stop button */}
        {phase === "camera" || phase === "init" ? (
          <button
            onClick={connect}
            disabled={!peerId}
            className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wider"
            style={{
              background: "linear-gradient(135deg, #0d3a4a 0%, #0a2a38 100%)",
              color: "#22D3EE",
              border: "1px solid #22D3EE40",
            }}
          >
            {peerId ? "▶ START STREAMING" : "⚠ No Peer ID in URL"}
          </button>
        ) : phase === "streaming" ? (
          <button
            onClick={() => { peerRef.current?.destroy(); streamRef.current?.getTracks().forEach(t => t.stop()); setPhase("init"); startCamera(facingMode); }}
            className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wider"
            style={{ background: "#200808", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.3)" }}
          >
            ⏹ STOP STREAM
          </button>
        ) : phase === "connecting" ? (
          <div className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wider text-center" style={{ background: "#0D1520", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" }}>
            Connecting…
          </div>
        ) : null}

        <div className="text-center mt-3 text-[9px] uppercase tracking-widest" style={{ color: "#2E4560" }}>
          SentinelX AI Monitoring · Camera Sender
        </div>
      </div>
    </div>
  );
}
