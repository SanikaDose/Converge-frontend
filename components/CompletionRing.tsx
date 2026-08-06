"use client";
import React from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { useStatusHex } from "@/lib/theme";
import type { StatusColorKey } from "@/lib/types";

/**
 * Conic-gradient completion ring. Stroke width and label size scale with
 * `size` (instead of a fixed 12px cutout + 13px font) so the percentage
 * text always has room to breathe — at smaller ring sizes the old fixed
 * values left too little room and the text crowded/overlapped the ring.
 */
export function CompletionRing({ pct, size = 56, color = "amber" }: { pct: number; size?: number; color?: StatusColorKey }) {
  const STATUS_HEX = useStatusHex();
  const theme = useTheme();
  const ringColor = STATUS_HEX[color] || STATUS_HEX.amber;
  const bg = `conic-gradient(${ringColor} ${pct * 3.6}deg, ${theme.palette.divider} 0deg)`;
  const stroke = Math.max(4, Math.round(size * 0.12));
  const fontSize = Math.max(10, Math.round(size * 0.24));
  return (
    <Box sx={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Box sx={{
        width: size - stroke * 2, height: size - stroke * 2, borderRadius: "50%", bgcolor: "background.paper",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize, fontWeight: 700, lineHeight: 1, color: "text.primary",
      }}>
        {pct}%
      </Box>
    </Box>
  );
}
