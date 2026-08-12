"use client";
import React from "react";
import Image from "next/image";
import { useAppContext } from "@/context/AppContext";

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
 * illegible noise below ~90px tall). Rendered as a plain image, same as
 * ConvergeLogo on the login page — no boxed/tile treatment, which read as
 * a pasted-in photo rather than a logo.
 */
export function ConvergeNavbarLogo({ height = 40 }: { height?: number }) {
  const width = Math.round(height * NAVBAR_ASPECT);
  // The supplied asset is dark ink flattened onto an opaque white
  // background, so on a dark bar it would show as a white rectangle with
  // invisible text. converge-navbar-dark.png is the same artwork with the
  // background made transparent and the wordmark lifted to white; the
  // cyan/navy brand mark is untouched in both.
  const { mode } = useAppContext();
  const src = mode === "dark" ? "/converge-navbar-dark.png" : "/converge-navbar.png";
  return (
    <Image
      src={src} alt="Converge"
      width={1796} height={876}
      style={{ width, height, objectFit: "contain", display: "block", flexShrink: 0 }}
      priority
    />
  );
}
