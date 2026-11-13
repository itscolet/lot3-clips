"use client";
import { motion } from "motion/react";
import { useState } from "react";
import { compact } from "@/lib/format";

/** Minimal monochrome area chart, no deps. */
export function ViewsChart({ data, height = 200 }: { data: { x: string; y: number }[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2)
    return (
      <div className="grid place-items-center text-[13px] text-dim" style={{ height }}>
        Chart fills in after a couple of daily checks.
      </div>
    );
  const W = 600;
  const H = height;
  const pad = 8;
  const max = Math.max(...data.map((d) => d.y), 1);
  const pts = data.map((d, i) => [pad + (i / (data.length - 1)) * (W - pad * 2), H - pad - (d.y / max) * (H - pad * 2)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="vc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fafafa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#fafafa" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} stroke="#1f1f1f" strokeDasharray="2 4" />
        ))}
        <motion.path d={area} fill="url(#vc-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.path
          d={line}
          fill="none"
          stroke="#fafafa"
          strokeWidth={1.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        {pts.map((p, i) => (
          <rect key={i} x={p[0] - W / data.length / 2} y={0} width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null && (
          <>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={0} y2={H} stroke="#3a3a3a" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r={3.5} fill="#000" stroke="#fafafa" strokeWidth={1.5} />
          </>
        )}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg border border-line2 bg-s2 px-2.5 py-1.5 text-[11px]" style={{ left: `${(pts[hover][0] / W) * 100}%`, transform: "translateX(-50%)" }}>
          <span className="num">{compact(data[hover].y)}</span> <span className="text-dim">{data[hover].x}</span>
        </div>
      )}
    </div>
  );
}
