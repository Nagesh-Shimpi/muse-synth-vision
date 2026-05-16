import { useEffect, useRef, useState } from "react";
import { ensureAudio, getAnalyser } from "@/lib/audio-engine";

export function Waveform({ height = 64 }: { height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    (async () => {
      await ensureAudio();
      if (cancelled) return;
      setReady(true);
      const draw = () => {
        const a = getAnalyser();
        const canvas = ref.current;
        if (!a || !canvas) {
          raf = requestAnimationFrame(draw);
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr; canvas.height = h * dpr;
          ctx.scale(dpr, dpr);
        }
        ctx.clearRect(0, 0, w, h);
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, "oklch(0.78 0.18 320)");
        grad.addColorStop(1, "oklch(0.78 0.18 220)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const data = a.getValue() as Float32Array;
        for (let i = 0; i < data.length; i++) {
          const x = (i / data.length) * w;
          const y = h / 2 + data[i] * h * 0.9;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ height }}
      className={`w-full rounded-xl glass ${ready ? "opacity-100" : "opacity-50"}`}
    />
  );
}
