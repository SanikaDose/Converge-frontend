"use client";

import React, { useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import Stack from "./Stack";
import { DASHBOARD_COLORS } from "@/lib/theme";
import type { PhaseDiscipline, PhaseTemplateItem } from "@/lib/types";

const DISCIPLINE_COLOR: Record<PhaseDiscipline, string> = {
  Software: DASHBOARD_COLORS.blue,
  Vision: DASHBOARD_COLORS.violet,
  Automation: DASHBOARD_COLORS.orange,
};
const accentFor = (d: PhaseDiscipline | null) => (d ? DISCIPLINE_COLOR[d] : DASHBOARD_COLORS.slate);
function splitPhaseName(name: string) {
  const [num, ...rest] = name.split(" · ");
  return rest.length ? { num, title: rest.join(" · ") } : { num: "", title: name };
}

/**
 * Read-only preview of the phases + tasks a project will be generated with,
 * for the given disciplines. Shown from the create form so the user sees the
 * plan before creating. `phases` is the live template (GET /project-templates);
 * `undefined` while it loads.
 */
export function TemplatePreviewDialog({ open, onClose, phases, disciplines }: {
  open: boolean;
  onClose: () => void;
  phases: PhaseTemplateItem[] | undefined;
  disciplines: PhaseDiscipline[];
}) {
  const included = useMemo(() => {
    if (!phases) return [];
    return disciplines.length === 0
      ? phases
      : phases.filter(p => !p.discipline || disciplines.includes(p.discipline));
  }, [phases, disciplines]);
  const taskCount = included.reduce((a, p) => a + p.tasks.length, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { maxHeight: "82vh" } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        Plan preview
        {!!phases && (
          <Typography variant="body2" color="text.secondary">
            {included.length} phase{included.length === 1 ? "" : "s"} · {taskCount} task{taskCount === 1 ? "" : "s"} will be created
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {!phases ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}><CircularProgress size={26} /></Box>
        ) : (
          <Stack gap={2}>
            {included.map((phase) => {
              const accent = accentFor(phase.discipline);
              const { num, title } = splitPhaseName(phase.name);
              return (
                <Box key={phase.id}>
                  <Stack direction="row" alignItems="center" gap={1.25} sx={{ mb: 0.75 }}>
                    <Box sx={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      bgcolor: alpha(accent, 0.14), color: accent, fontWeight: 800, fontSize: 11,
                    }}>{num}</Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{title}</Typography>
                    {phase.discipline && (
                      <Chip label={phase.discipline} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: alpha(accent, 0.14), color: accent }} />
                    )}
                  </Stack>
                  <Box sx={{ pl: "13px", ml: "12px", borderLeft: "2px solid", borderColor: alpha(accent, 0.25) }}>
                    {phase.tasks.map((t) => (
                      <Stack key={t.id} direction="row" alignItems="baseline" justifyContent="space-between" gap={1} sx={{ py: 0.4 }}>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>{t.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                          day {t.dayOffset} · {t.duration}d
                        </Typography>
                      </Stack>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
