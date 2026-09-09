/**
 * Tiny pub-sub store that shares the active live camera stream and drawn
 * restricted zones across pages without lifting state into App.tsx.
 */

export interface SharedZone {
  id: string;
  name: string;
  color: string;
  /** 0–1 fractions of the canvas/video dimensions */
  xPct: number; yPct: number; wPct: number; hPct: number;
}

type StreamListener   = (s: MediaStream | null) => void;
type VideoSrcListener = (src: string | null) => void;
type ZonesListener    = (z: SharedZone[]) => void;

let _stream:   MediaStream | null = null;
let _videoSrc: string | null      = null;
let _zones:    SharedZone[]       = [];
const _streamListeners   = new Set<StreamListener>();
const _videoSrcListeners = new Set<VideoSrcListener>();
const _zonesListeners    = new Set<ZonesListener>();

export function setLiveStream(s: MediaStream | null) {
  _stream = s;
  // A real stream takes over; clear any shared video src
  if (s) { _videoSrc = null; _videoSrcListeners.forEach(l => l(null)); }
  _streamListeners.forEach(l => l(s));
}

export function setSharedVideoSrc(src: string | null) {
  _videoSrc = src;
  // A shared video clears any live stream reference (stream stays in DetectionCamera)
  _videoSrcListeners.forEach(l => l(src));
}

export function setLiveZones(z: SharedZone[]) {
  _zones = z;
  _zonesListeners.forEach(l => l(z));
}

export function getLiveStream()    { return _stream;   }
export function getSharedVideoSrc(){ return _videoSrc; }
export function getLiveZones()     { return _zones;    }

// React hooks — safe to call anywhere, no provider needed
import { useEffect, useState } from "react";

export function useLiveStream(): MediaStream | null {
  const [s, setS] = useState<MediaStream | null>(_stream);
  useEffect(() => {
    setS(_stream);
    _streamListeners.add(setS);
    return () => { _streamListeners.delete(setS); };
  }, []);
  return s;
}

export function useSharedVideoSrc(): string | null {
  const [src, setSrc] = useState<string | null>(_videoSrc);
  useEffect(() => {
    setSrc(_videoSrc);
    _videoSrcListeners.add(setSrc);
    return () => { _videoSrcListeners.delete(setSrc); };
  }, []);
  return src;
}

export function useLiveZones(): SharedZone[] {
  const [z, setZ] = useState<SharedZone[]>(_zones);
  useEffect(() => {
    setZ(_zones);
    _zonesListeners.add(setZ);
    return () => { _zonesListeners.delete(setZ); };
  }, []);
  return z;
}
