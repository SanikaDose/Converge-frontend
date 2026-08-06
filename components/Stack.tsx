import React, { type CSSProperties } from "react";
import MuiStack, { type StackProps } from "@mui/material/Stack";

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
interface ShorthandProps {
  justifyContent?: CSSProperties["justifyContent"];
  alignItems?: CSSProperties["alignItems"];
  alignContent?: CSSProperties["alignContent"];
  flexWrap?: CSSProperties["flexWrap"];
  gap?: CSSProperties["gap"];
  rowGap?: CSSProperties["rowGap"];
  columnGap?: CSSProperties["columnGap"];
  flex?: CSSProperties["flex"];
  textAlign?: CSSProperties["textAlign"];
  flexShrink?: CSSProperties["flexShrink"];
  flexGrow?: CSSProperties["flexGrow"];
  minWidth?: CSSProperties["minWidth"];
  width?: CSSProperties["width"];
}

export type StackShimProps = StackProps & ShorthandProps;

export default function Stack({
  sx, justifyContent, alignItems, alignContent, flexWrap, gap, rowGap, columnGap,
  flex, textAlign, flexShrink, flexGrow, minWidth, width, ...rest
}: StackShimProps) {
  const extraSx: ShorthandProps = {
    justifyContent, alignItems, alignContent, flexWrap, gap, rowGap, columnGap,
    flex, textAlign, flexShrink, flexGrow, minWidth, width,
  };
  const mergedSx = Array.isArray(sx) ? [extraSx, ...sx] : { ...extraSx, ...sx };
  return <MuiStack sx={mergedSx} {...rest} />;
}
