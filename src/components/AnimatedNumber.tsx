import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedNumber({ value, duration = 800, decimals = 0, prefix = "", suffix = "", className = "", style }: Props) {
  const [display, setDisplay] = useState(value);
  const startRef  = useRef(value);
  const frameRef  = useRef<number>(0);
  const startTime = useRef<number>(0);

  useEffect(() => {
    const from = startRef.current;
    const to   = value;
    if (from === to) return;

    cancelAnimationFrame(frameRef.current);
    startTime.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-quart
      const ease = 1 - Math.pow(1 - progress, 4);
      const current = from + (to - from) * ease;
      setDisplay(current);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return (
    <span className={className} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
