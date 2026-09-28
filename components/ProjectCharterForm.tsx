"use client";
import React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlined from "@mui/icons-material/DeleteOutlineOutlined";
import Stack from "./Stack";
import type {
  ProjectCharter,
  CharterMilestone,
  CharterTechnicalCommitment,
} from "@/lib/types";

/** A blank charter — every field present so the form is fully controlled. */
export const EMPTY_CHARTER: ProjectCharter = {
  proposalNo: "", proposalRevision: "", proposalDate: null,
  poNo: "", poDate: null, salesOwner: "", proposalDocument: "", poDocument: "",
  objective: "",
  solutionOffered: "",
  scope: [], outOfScope: [], assumptions: [], constraints: [],
  technicalCommitments: [],
  milestones: [],
  successCriteria: [],
};

/** Normalise a possibly-partial/legacy charter into a fully-populated one. */
export function charterFromInitial(c?: ProjectCharter | null): ProjectCharter {
  return { ...EMPTY_CHARTER, ...(c ?? {}) };
}

/** The charter is required for a project — these are the fields that must be
 * filled before it can be created (mirrors the PDF's "Required = Yes" flags,
 * plus the objective/solution that give the charter meaning). */
export function isCharterValid(c: ProjectCharter): boolean {
  return (
    c.proposalNo.trim() !== "" &&
    c.poNo.trim() !== "" &&
    c.salesOwner.trim() !== "" &&
    c.objective.trim() !== "" &&
    c.solutionOffered.trim() !== ""
  );
}

/* ------------------------------------------------------------- section shell */

function Section({ no, title, purpose, children }: {
  no: string; title: string; purpose: string; children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, bgcolor: "background.default", borderRadius: 2 }}>
      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 0.25 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 12, color: "primary.main" }}>{no}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{title}</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.75 }}>
        {purpose}
      </Typography>
      {children}
    </Paper>
  );
}

/* ---------------------------------------------------- add/remove string list */

function ListEditor({ label, placeholder, items, onChange }: {
  label: string; placeholder: string; items: string[]; onChange: (next: string[]) => void;
}) {
  const update = (i: number, v: string) => onChange(items.map((it, idx) => idx === i ? v : it));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, ""]);
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.75 }}>
        {label}
      </Typography>
      <Stack spacing={0.75}>
        {items.map((item, i) => (
          <Stack key={i} direction="row" spacing={0.5} alignItems="center">
            <TextField
              size="small" fullWidth value={item} placeholder={placeholder}
              onChange={(e) => update(i, e.target.value)}
            />
            <IconButton size="small" color="error" onClick={() => remove(i)} aria-label="Remove item">
              <DeleteOutlineOutlined fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button size="small" variant="text" startIcon={<AddIcon fontSize="small" />} onClick={add} sx={{ mt: 0.5, textTransform: "none" }}>
        Add item
      </Button>
    </Box>
  );
}

/* ------------------------------------------------------------------- form */

export function ProjectCharterForm({ value, onChange }: {
  value: ProjectCharter;
  onChange: (next: ProjectCharter) => void;
}) {
  const set = <K extends keyof ProjectCharter>(key: K, v: ProjectCharter[K]) =>
    onChange({ ...value, [key]: v });

  // 06 — technical commitments (table rows)
  const setCommitment = (i: number, field: keyof CharterTechnicalCommitment, v: string) =>
    set("technicalCommitments", value.technicalCommitments.map((r, idx) => idx === i ? { ...r, [field]: v } : r));
  const addCommitment = () =>
    set("technicalCommitments", [...value.technicalCommitments, { parameter: "", commitment: "", reference: "", remarks: "" }]);
  const removeCommitment = (i: number) =>
    set("technicalCommitments", value.technicalCommitments.filter((_, idx) => idx !== i));

  // 07 — milestones
  const setMilestone = (i: number, field: keyof CharterMilestone, v: string) =>
    set("milestones", value.milestones.map((m, idx) => idx === i ? { ...m, [field]: field === "targetDate" ? (v || null) : v } : m));
  const addMilestone = () => set("milestones", [...value.milestones, { name: "", targetDate: null }]);
  const removeMilestone = (i: number) => set("milestones", value.milestones.filter((_, idx) => idx !== i));

  return (
    <Stack spacing={2}>
      {/* 02 — Sales / Pre-Sales Information */}
      <Section no="02" title="Sales / Pre-Sales Information" purpose="Proposal and purchase-order references only.">
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5}>
            <TextField label="Proposal / Quotation No." required fullWidth size="small"
              value={value.proposalNo} onChange={(e) => set("proposalNo", e.target.value)} />
            <TextField label="Proposal Revision" fullWidth size="small"
              value={value.proposalRevision} onChange={(e) => set("proposalRevision", e.target.value)} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField label="Proposal Date" type="date" fullWidth size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              value={value.proposalDate ?? ""} onChange={(e) => set("proposalDate", e.target.value || null)} />
            <TextField label="PO No." required fullWidth size="small"
              value={value.poNo} onChange={(e) => set("poNo", e.target.value)} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField label="PO Date" type="date" fullWidth size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              value={value.poDate ?? ""} onChange={(e) => set("poDate", e.target.value || null)} />
            <TextField label="Sales / Pre-Sales Owner" required fullWidth size="small"
              value={value.salesOwner} onChange={(e) => set("salesOwner", e.target.value)} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField label="Proposal Document (link)" fullWidth size="small" placeholder="https://…"
              value={value.proposalDocument} onChange={(e) => set("proposalDocument", e.target.value)} />
            <TextField label="PO Document (link)" fullWidth size="small" placeholder="https://…"
              value={value.poDocument} onChange={(e) => set("poDocument", e.target.value)} />
          </Stack>
        </Stack>
      </Section>

      {/* 03 — Project Objective */}
      <Section no="03" title="Project Objective" purpose="Why the project is being undertaken.">
        <TextField
          label="Objective" required fullWidth multiline minRows={2}
          placeholder="A concise statement of why the project is being undertaken and the intended outcome."
          value={value.objective} onChange={(e) => set("objective", e.target.value)}
        />
      </Section>

      {/* 04 — Solution Offered */}
      <Section no="04" title="Solution Offered" purpose="High-level solution offered to the customer.">
        <TextField
          label="Solution Offered" required fullWidth multiline minRows={3}
          placeholder="High-level summary — e.g. Automation (PLC/HMI/drives), Vision (cameras/optics/AI), Software (traceability/reporting), Infrastructure, Integration."
          value={value.solutionOffered} onChange={(e) => set("solutionOffered", e.target.value)}
        />
      </Section>

      {/* 05 — Project Conditions */}
      <Section no="05" title="Project Conditions" purpose="Scope, out of scope, customer support & assumptions, and constraints.">
        <Stack spacing={2}>
          <ListEditor label="Scope (in scope)" placeholder="e.g. Supply and commission the vision inspection cell"
            items={value.scope} onChange={(v) => set("scope", v)} />
          <ListEditor label="Out of Scope" placeholder="e.g. Changes to the existing PLC program"
            items={value.outOfScope} onChange={(v) => set("outOfScope", v)} />
          <ListEditor label="Customer Support & Assumptions" placeholder="e.g. Customer will provide production samples"
            items={value.assumptions} onChange={(v) => set("assumptions", v)} />
          <ListEditor label="Constraints" placeholder="e.g. Installation only during a planned shutdown"
            items={value.constraints} onChange={(v) => set("constraints", v)} />
        </Stack>
      </Section>

      {/* 06 — Key Technical Commitments */}
      <Section no="06" title="Key Technical Commitments" purpose="Important technical commitments affecting execution or acceptance.">
        <Stack spacing={1.25}>
          {value.technicalCommitments.map((row, i) => (
            <Stack key={i} direction="row" spacing={0.75} alignItems="center">
              <TextField size="small" label="Parameter" sx={{ flex: 1 }}
                value={row.parameter} onChange={(e) => setCommitment(i, "parameter", e.target.value)} />
              <TextField size="small" label="Commitment / Value" sx={{ flex: 1 }}
                value={row.commitment} onChange={(e) => setCommitment(i, "commitment", e.target.value)} />
              <TextField size="small" label="Reference / Basis" sx={{ flex: 1 }}
                value={row.reference} onChange={(e) => setCommitment(i, "reference", e.target.value)} />
              <TextField size="small" label="Remarks" sx={{ flex: 1 }}
                value={row.remarks} onChange={(e) => setCommitment(i, "remarks", e.target.value)} />
              <IconButton size="small" color="error" onClick={() => removeCommitment(i)} aria-label="Remove commitment">
                <DeleteOutlineOutlined fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" variant="text" startIcon={<AddIcon fontSize="small" />} onClick={addCommitment} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
            Add commitment
          </Button>
        </Stack>
      </Section>

      {/* 07 — Major Milestones */}
      <Section no="07" title="Major Milestones – Project Phases" purpose="High-level project phases/milestones. Detailed tasks are generated from the Standard Project Template.">
        <Stack spacing={1}>
          {value.milestones.map((m, i) => (
            <Stack key={i} direction="row" spacing={0.75} alignItems="center">
              <TextField size="small" label="Milestone" sx={{ flex: 1 }} placeholder="e.g. FAT"
                value={m.name} onChange={(e) => setMilestone(i, "name", e.target.value)} />
              <TextField size="small" label="Target date" type="date" sx={{ width: 180 }}
                slotProps={{ inputLabel: { shrink: true } }}
                value={m.targetDate ?? ""} onChange={(e) => setMilestone(i, "targetDate", e.target.value)} />
              <IconButton size="small" color="error" onClick={() => removeMilestone(i)} aria-label="Remove milestone">
                <DeleteOutlineOutlined fontSize="small" />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" variant="text" startIcon={<AddIcon fontSize="small" />} onClick={addMilestone} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
            Add milestone
          </Button>
        </Stack>
      </Section>

      {/* 08 — Success Criteria */}
      <Section no="08" title="Success Criteria" purpose="How successful completion will be determined.">
        <ListEditor label="Success criteria" placeholder="e.g. Vision performance meets agreed acceptance criteria"
          items={value.successCriteria} onChange={(v) => set("successCriteria", v)} />
      </Section>
    </Stack>
  );
}
