"use client";
import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

/**
 * Multi-segment donut — same conic-gradient technique as CompletionRing,
 * generalized to N colored arcs (one per status bucket) instead of a
 * single completed/remaining split.
 */
export function DonutChart({ segments, size = 150, centerValue, centerLabel }: {
  segments: { value: number; color: string }[];
  size?: number;
  centerValue?: React.ReactNode;
  centerLabel?: React.ReactNode;
}) {
  const theme = useTheme();
  const total = segments.reduce((a, s) => a + s.value, 0);
  const stroke = Math.round(size * 0.22);
  let acc = 0;
  const bg = total > 0
    ? `conic-gradient(${segments.map(seg => {
        const from = (acc / total) * 360; acc += seg.value; const to = (acc / total) * 360;
        return `${seg.color} ${from}deg ${to}deg`;
      }).join(", ")})`
    : undefined;

  return (
    <Box sx={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: bg, bgcolor: bg ? undefined : "divider",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Box sx={{
        width: size - stroke * 2, height: size - stroke * 2, borderRadius: "50%", bgcolor: "background.paper",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        border: `1px solid ${theme.palette.divider}`,
      }}>
        {centerValue !== undefined && <Typography sx={{ fontWeight: 800, fontSize: Math.round(size * 0.17), lineHeight: 1.1 }}>{centerValue}</Typography>}
        {centerLabel !== undefined && <Typography variant="caption" color="text.secondary">{centerLabel}</Typography>}
      </Box>
    </Box>
  );
}

function YAxisLabels({ height, valueSuffix }: { height: number; valueSuffix: string }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height, pb: 2.5, flexShrink: 0 }}>
      {[100, 75, 50, 25, 0].map(v => (
        <Typography key={v} variant="caption" color="text.secondary" sx={{ fontSize: 10.5, lineHeight: 1 }}>{v}{valueSuffix}</Typography>
      ))}
    </Box>
  );
}

/**
 * Lightweight inline-SVG line/area chart — no charting dependency. Values
 * are expected as 0–100 (percent scale); the viewBox is a fixed
 * coordinate system (0–560 x, 0–160 y) with axis labels drawn separately
 * so the chart itself can scale to any container width via width="100%".
 */
export function TrendLineChart({ points, height = 170, valueSuffix = "%" }: {
  points: { label: string; value: number }[];
  height?: number;
  valueSuffix?: string;
}) {
  const theme = useTheme();
  const color = theme.palette.primary.main;
  const gridColor = theme.palette.divider;
  const W = 560, H = 160, padTop = 8, padBottom = 4;
  const plotH = H - padTop - padBottom;
  const n = points.length;
  const stepX = n > 1 ? W / (n - 1) : 0;
  const toY = (v: number) => padTop + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;
  const toXY = (i: number, v: number): [number, number] => [i * stepX, toY(v)];

  const linePath = points.map((p, i) => {
    const [x, y] = toXY(i, p.value);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const areaPath = n > 0 ? `${linePath} L${((n - 1) * stepX).toFixed(1)},${H} L0,${H} Z` : "";
  const gradientId = "trendFillGradient";

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <YAxisLabels height={height} valueSuffix={valueSuffix} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map(v => (
            <line key={v} x1={0} x2={W} y1={toY(v)} y2={toY(v)} stroke={gridColor} strokeWidth={1} />
          ))}
          {n > 0 && <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />}
          {n > 1 && <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
          {points.map((p, i) => {
            const [x, y] = toXY(i, p.value);
            return <circle key={i} cx={x} cy={y} r={4} fill={theme.palette.background.paper} stroke={color} strokeWidth={2.5} />;
          })}
        </svg>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
          {points.map((p, i) => (
            <Typography key={i} variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>{p.label}</Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
