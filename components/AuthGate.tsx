"use client";

import React, { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { AppShell } from "./AppShell";
import { useAuth } from "@/context/AuthContext";

const LOGIN_PATH = "/login";

function FullPageSpinner() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default" }}>
      <CircularProgress />
    </Box>
  );
}

/**
 * Decides what chrome the current route gets: the login screen renders
 * bare (no navbar), every other route renders inside AppShell and only
 * once there's a session. Redirects are effects, not render-time
 * `router.push` calls, so they don't fire mid-render.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onLoginPage = pathname === LOGIN_PATH;

  useEffect(() => {
    if (!ready) return;
    if (!user && !onLoginPage) router.replace(LOGIN_PATH);
    if (user && onLoginPage) router.replace("/");
  }, [ready, user, onLoginPage, router]);

  // Reading the stored session, or waiting on a redirect that's already
  // queued — render neither the app nor the login form in the meantime,
  // so nothing flashes before the redirect lands.
  if (!ready) return <FullPageSpinner />;
  if (!user && !onLoginPage) return <FullPageSpinner />;
  if (user && onLoginPage) return <FullPageSpinner />;

  if (onLoginPage) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
