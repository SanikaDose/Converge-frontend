"use client";
import React from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { useStatusHex } from "@/lib/theme";
import type { StatusColorKey } from "@/lib/types";

/** Conic-gradient completion ring — ported as-is from the original build. */
export function CompletionRing({ pct, size = 56, color = "amber" }: { pct: number; size?: number; color?: StatusColorKey }) {
  const STATUS_HEX = useStatusHex();
  const theme = useTheme();
  const ringColor = STATUS_HEX[color] || STATUS_HEX.amber;
  const bg = `conic-gradient(${ringColor} ${pct * 3.6}deg, ${theme.palette.divider} 0deg)`;
  return (
    <Box sx={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Box sx={{
        width: size - 12, height: size - 12, borderRadius: "50%", bgcolor: "background.paper",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: "text.primary",
      }}>
        {pct}%
      </Box>
    </Box>
  );
}
