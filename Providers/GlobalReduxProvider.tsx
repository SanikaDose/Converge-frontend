"use client";

import React from "react";
import { Provider } from "react-redux";
import { store } from "@/store/store";

/**
 * Wraps the app in the Redux store so RTK Query's hooks and cache are
 * available — mirrors Scout's `Providers/GlobalReduxProvider.tsx`.
 *
 * Must sit outside every provider that fetches (OrgProvider, AuthProvider),
 * since those now call RTK Query hooks.
 */
export default function GlobalReduxProvider({ children }: { readonly children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
