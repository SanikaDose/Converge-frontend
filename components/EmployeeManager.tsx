"use client";

import React, { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "./Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import GroupsIcon from "@mui/icons-material/Groups";
import { EmployeeAvatar } from "./common";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_COLORS } from "@/lib/theme";
import {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} from "@/store/api/employeesApi";
import type { Employee, OrgRole } from "@/lib/types";

const ROLES: OrgRole[] = ["User", "Admin"];

interface AddForm {
  name: string;
  teamId: string;
  role: OrgRole;
  email: string;
  phoneNumber: string;
  scrumEnabled: boolean;
}
const EMPTY_ADD: AddForm = { name: "", teamId: "", role: "User", email: "", phoneNumber: "", scrumEnabled: true };

export function EmployeeManager() {
  const { user } = useAuth();
  const isAdmin = user?.appRole === "Admin";

  const { data } = useGetEmployeesQuery();
  const employees: Employee[] = useMemo(() => data?.employees ?? [], [data]);
  const teams = useMemo(() => data?.teams ?? [], [data]);
  const teamName = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams]);

  const [createEmp, { isLoading: creating }] = useCreateEmployeeMutation();
  const [updateEmp] = useUpdateEmployeeMutation();
  const [deleteEmp, { isLoading: deleting }] = useDeleteEmployeeMutation();

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_ADD);
  const [toDelete, setToDelete] = useState<Employee | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deletePwd, setDeletePwd] = useState("");
  const [toDeactivate, setToDeactivate] = useState<Employee | null>(null);
  const [deactivateText, setDeactivateText] = useState("");
  const [snack, setSnack] = useState<{ msg: string; sev: "success" | "error" } | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...employees]
      .filter((e) => !q || e.name.toLowerCase().includes(q) || (e.email ?? "").toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, search]);

  if (!isAdmin) {
    return (
      <Box sx={{ textAlign: "center", py: 10, color: "text.secondary" }}>
        <WarningAmberIcon sx={{ fontSize: 44, opacity: 0.4 }} />
        <Typography sx={{ mt: 1, fontWeight: 600 }}>Admins only</Typography>
        <Typography variant="body2">You don&apos;t have access to manage employees.</Typography>
      </Box>
    );
  }

  const setField = <K extends keyof AddForm>(k: K, v: AddForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const canAdd = form.name.trim().length > 0 && form.teamId !== "";

  const submitAdd = async () => {
    try {
      await createEmp({
        name: form.name.trim(), teamId: form.teamId, role: form.role,
        email: form.email.trim() || undefined, phoneNumber: form.phoneNumber.trim() || undefined,
        scrumEnabled: form.scrumEnabled,
      }).unwrap();
      setAddOpen(false); setForm(EMPTY_ADD);
      setSnack({ msg: "Employee added.", sev: "success" });
    } catch {
      setSnack({ msg: "Couldn't add employee.", sev: "error" });
    }
  };

  const patch = async (e: Employee, p: { status?: "active" | "inactive"; scrumEnabled?: boolean }) => {
    try { await updateEmp({ id: e.id, patch: p }).unwrap(); }
    catch { setSnack({ msg: "Update failed.", sev: "error" }); }
  };

  // Turning someone OFF (→ inactive) is confirmed; turning back ON is instant.
  const onStatusToggle = (e: Employee, nextActive: boolean) => {
    if (nextActive) { patch(e, { status: "active" }); }
    else { setToDeactivate(e); setDeactivateText(""); }
  };

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    await patch(toDeactivate, { status: "inactive" });
    setSnack({ msg: `${toDeactivate.name} marked inactive.`, sev: "success" });
    setToDeactivate(null); setDeactivateText("");
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteEmp({ id: toDelete.id, password: deletePwd }).unwrap();
      setSnack({ msg: `${toDelete.name} deleted.`, sev: "success" });
      setToDelete(null); setConfirmText(""); setDeletePwd("");
    } catch (err) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? "Delete failed.";
      setSnack({ msg, sev: "error" });
    }
  };

  const activeCount = employees.filter((e) => e.status !== "inactive").length;

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ mb: 2.5 }}>
        <Box>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Employees</Typography>
            <GroupsIcon sx={{ color: DASHBOARD_COLORS.blue, fontSize: 22 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Add joiners, mark leavers inactive, and choose who takes part in the daily scrum.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY_ADD); setAddOpen(true); }}>
          Add Employee
        </Button>
      </Stack>

      {/* Search */}
      <Stack direction="row" gap={1.5} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
        <TextField placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 240, bgcolor: "background.paper", "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "text.disabled" }} /></InputAdornment> } }} />
        <Typography variant="body2" color="text.secondary">{activeCount} active · {employees.length} total</Typography>
      </Stack>

      {/* Table */}
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5, bgcolor: "background.paper", overflow: "auto", maxHeight: "64vh" }}>
        <Table stickyHeader sx={{ minWidth: 880 }}>
          <TableHead>
            <TableRow sx={{ "& th": { bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider", py: 1.5, fontWeight: 700, fontSize: 12.5, color: "text.secondary" } }}>
              <TableCell>Employee</TableCell>
              <TableCell sx={{ width: 150 }}>Team</TableCell>
              <TableCell sx={{ width: 110 }}>Role</TableCell>
              <TableCell sx={{ width: 130 }}>Status</TableCell>
              <TableCell sx={{ width: 120 }}>Scrum</TableCell>
              <TableCell sx={{ width: 80 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((e) => {
              const active = e.status !== "inactive";
              return (
                <TableRow key={e.id} sx={{
                  "&:hover": { bgcolor: "action.hover" },
                  ...(active ? {} : { opacity: 0.6 }),
                  "& td": { borderBottom: "1px solid", borderColor: "divider", py: 1.5 },
                }}>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={1.25}>
                      <EmployeeAvatar employeeId={e.id} size={34} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{e.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>{e.email || "—"}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell><Typography variant="body2">{teamName[e.teamId] ?? e.team ?? "—"}</Typography></TableCell>
                  <TableCell>
                    <Chip label={e.role} size="small" sx={{
                      height: 22, borderRadius: "7px", fontWeight: 600,
                      color: e.role === "Admin" ? DASHBOARD_COLORS.violet : "text.secondary",
                      bgcolor: e.role === "Admin" ? alpha(DASHBOARD_COLORS.violet, 0.13) : "action.hover",
                    }} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <Switch size="small" checked={active} onChange={(ev) => onStatusToggle(e, ev.target.checked)} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: active ? DASHBOARD_COLORS.green : "text.disabled" }}>
                        {active ? "Active" : "Inactive"}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Switch size="small" checked={e.scrumEnabled !== false} onChange={(ev) => patch(e, { scrumEnabled: ev.target.checked })} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Delete employee">
                      <IconButton size="small" onClick={() => { setToDelete(e); setConfirmText(""); }} sx={{ color: "text.secondary", "&:hover": { color: DASHBOARD_COLORS.red } }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>No employees match your search.</Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Add dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add Employee</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 0.5 }}>
            <TextField label="Full name" required value={form.name} onChange={(e) => setField("name", e.target.value)} fullWidth autoFocus />
            <TextField label="Team" required select value={form.teamId} onChange={(e) => setField("teamId", e.target.value)} fullWidth>
              {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
            <TextField label="Role" select value={form.role} onChange={(e) => setField("role", e.target.value as OrgRole)} fullWidth>
              {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} fullWidth />
            <TextField label="Phone (optional)" value={form.phoneNumber} onChange={(e) => setField("phoneNumber", e.target.value)} fullWidth />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Include in daily scrum</Typography>
              <Switch checked={form.scrumEnabled} onChange={(e) => setField("scrumEnabled", e.target.checked)} />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              They can sign in with the default password and change it from their profile.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!canAdd || creating} onClick={submitAdd}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {creating ? "Adding…" : "Add Employee"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate confirm — type the name (a step, like delete) */}
      <Dialog open={!!toDeactivate} onClose={() => setToDeactivate(null)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon sx={{ color: DASHBOARD_COLORS.amber }} /> Mark inactive
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <b>{toDeactivate?.name}</b> will be marked inactive — removed from the scrum board and
            no longer selectable, but their records are kept. To confirm, type their name below.
          </Typography>
          <TextField fullWidth placeholder={toDeactivate?.name ?? ""} value={deactivateText}
            onChange={(e) => setDeactivateText(e.target.value)} autoFocus />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setToDeactivate(null)}>Cancel</Button>
          <Button variant="contained" color="warning"
            disabled={deactivateText.trim() !== toDeactivate?.name}
            onClick={confirmDeactivate}>
            Mark Inactive
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm — requires typing the name AND the admin's password */}
      <Dialog open={!!toDelete} onClose={() => { setToDelete(null); setConfirmText(""); setDeletePwd(""); }} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
        <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon sx={{ color: DASHBOARD_COLORS.red }} /> Delete employee
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This permanently removes <b>{toDelete?.name}</b>. This can&apos;t be undone — if they simply left,
            mark them <b>Inactive</b> instead. To confirm, type their name and enter your password.
          </Typography>
          <Stack gap={1.5}>
            <TextField fullWidth label="Employee name" placeholder={toDelete?.name ?? ""} value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)} autoFocus />
            <TextField fullWidth type="password" label="Your password" value={deletePwd}
              onChange={(e) => setDeletePwd(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => { setToDelete(null); setConfirmText(""); setDeletePwd(""); }}>Cancel</Button>
          <Button variant="contained" color="error"
            disabled={confirmText.trim() !== toDelete?.name || !deletePwd || deleting}
            onClick={confirmDelete}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlineIcon />}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {snack ? <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(null)} sx={{ borderRadius: 2 }}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
