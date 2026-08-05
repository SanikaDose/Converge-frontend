import React from "react";
import MuiStack from "@mui/material/Stack";

/**
 * Thin wrapper around MUI's Stack. This MUI version (9.x) only applies
 * `direction`/`spacing`/`divider` as real Stack props — passing other
 * CSS-shorthand props (justifyContent, alignItems, flexWrap, gap,
 * rowGap) directly, the way earlier MUI versions allowed, silently does
 * nothing (verified: the generated class only carried `display/flex-
 * direction`, none of the rest). `sx` reliably works everywhere, so this
 * wrapper redirects those specific props into `sx` instead, letting the
 * rest of the app keep using the more readable direct-prop form.
 */
const SX_SHORTHANDS = ["justifyContent", "alignItems", "alignContent", "flexWrap", "gap", "rowGap", "columnGap", "flex", "textAlign", "flexShrink", "flexGrow", "minWidth", "width"];

export default function Stack({ sx, ...props }) {
  const extraSx = {};
  const rest = {};
  Object.entries(props).forEach(([k, v]) => {
    if (SX_SHORTHANDS.includes(k)) extraSx[k] = v;
    else rest[k] = v;
  });
  const mergedSx = Array.isArray(sx) ? [extraSx, ...sx] : { ...extraSx, ...sx };
  return <MuiStack sx={mergedSx} {...rest} />;
}
