"use client";
import React from "react";
import Image from "next/image";

const ASPECT = 1774 / 887;

/**
 * Full "Converge" lockup — the real uploaded asset (public/converge-logo.png:
 * icon + "Converge" wordmark + "Plan. Collaborate. Deliver." tagline baked
 * into one image on a white background). `tile` wraps it in a light rounded
 * box so that white background reads as an intentional badge against the
 * app's dark-mode navbar instead of a bare white rectangle; omit it where
 * the surrounding surface is already white (e.g. the login card, which is
 * pinned to the light theme regardless of the app's mode).
 */
export function ConvergeLogo({ height = 32, tile = false }: { height?: number; tile?: boolean }) {
  const width = Math.round(height * ASPECT);
  const img = (
    <Image
      src="/converge-logo.png" alt="Converge — Plan. Collaborate. Deliver."
      width={1774} height={887}
      style={{ width, height, objectFit: "contain", display: "block" }}
      priority
    />
  );
  if (!tile) return img;
  const padY = Math.round(height * 0.18);
  const padX = Math.round(height * 0.3);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: `${padY}px ${padX}px`, borderRadius: Math.round((height + padY * 2) * 0.22),
      background: "#f5f7fa", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)", flexShrink: 0,
    }}>
      {img}
    </div>
  );
}

const NAVBAR_ASPECT = 1796 / 876;

/**
 * Compact "Converge" wordmark for the navbar (public/converge-navbar.png) —
 * icon + wordmark only, no tagline, so it stays legible at the small size
 * the top bar allows (the full converge-logo.png lockup's tagline turns to
 * illegible noise below ~90px tall). Same white-background asset, wrapped
 * in the same light tile as ConvergeLogo for contrast against the app's
 * dark-mode navbar.
 */
export function ConvergeNavbarLogo({ height = 26 }: { height?: number }) {
  const width = Math.round(height * NAVBAR_ASPECT);
  const padY = Math.round(height * 0.22);
  const padX = Math.round(height * 0.32);
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: `${padY}px ${padX}px`, borderRadius: Math.round((height + padY * 2) * 0.22),
      background: "#f5f7fa", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)", flexShrink: 0,
    }}>
      <Image
        src="/converge-navbar.png" alt="Converge"
        width={1796} height={876}
        style={{ width, height, objectFit: "contain", display: "block" }}
        priority
      />
    </div>
  );
}
