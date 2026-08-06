"use client";
import React from "react";
import Image from "next/image";
import { useTheme } from "@mui/material/styles";

/**
 * "Converge" logo mark — the real uploaded asset (public/ApplicationIcon.png,
 * a transparent 4000×4000 PNG), not a hand-drawn approximation. Rendered on
 * a light rounded-square tile for contrast against the app's dark navbar/
 * sidebar backgrounds, matching how the reference artwork presents the mark
 * as an app icon.
 */
export function LogoMark({ size = 28, tile = true }: { size?: number; tile?: boolean }) {
  const img = (
    <Image
      src="/ApplicationIcon.png"
      alt="Converge"
      width={size}
      height={size}
      style={{ width: tile ? "62%" : size, height: tile ? "62%" : size, objectFit: "contain" }}
      priority
    />
  );
  if (!tile) return img;
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.26, background: "#f5f7fa",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
    }}>
      {img}
    </div>
  );
}

export function LogoLockup({ markSize = 30, wordmarkSize = 17 }: { markSize?: number; wordmarkSize?: number }) {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={markSize} />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span style={{
          fontFamily: '"Space Grotesk", sans-serif', fontSize: wordmarkSize, fontWeight: 700,
          background: "linear-gradient(90deg, #6fd6e6, #3f6fb0)",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          letterSpacing: 0.2,
        }}>
          Converge
        </span>
        <span style={{ fontSize: wordmarkSize * 0.5, color: theme.palette.text.secondary, letterSpacing: 2, textTransform: "uppercase" }}>
          Projects
        </span>
      </div>
    </div>
  );
}
