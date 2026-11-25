import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { del, get, patch, post } from "../../api/client";
import type { AttemptStatus, Group, User } from "../../api/types";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";
import StatusChip from "../../components/StatusChip";

interface History {
  logins: { id: string; success: boolean; reason: string | null; ip: string | null; createdAt: string }[];
  attempts: { id: string; status: AttemptStatus; score: number | null; total: number | null; startedAt: string; test: { title: string } }[];
}

export default function AdminUsers() {
  const { t } = useI18n();
  const ui = useUi();
  const [users, setUsers] = useState<User[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [groupId, setGroupId] = useState("");
  const [form, setForm] = useState<null | { id?: string; fullName: string; email: string; password: string; groupId: string; isAdmin: boolean }>(null);
  const [history, setHistory] = useState<{ user: User; data: History } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [menu, setMenu] = useState<{ el: HTMLElement; user: User } | null>(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (status) qs.set("status", status);
    if (groupId) qs.set("groupId", groupId);
    get<User[]>(`/admin/users?${qs}`).then(setUsers).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, groupId]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    get<Group[]>("/admin/groups").then(setGroups).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (fn: () => Promise<unknown>, okMsg = t("saved")) => {
    try {
      await fn();
      ui.success(okMsg);
      load();
    } catch (e) {
      ui.error(e);
    }
  };

  const saveForm = async () => {
    if (!form) return;
    await act(async () => {
      if (form.id) {
        await patch(`/admin/users/${form.id}`, {
          fullName: form.fullName,
          email: form.email,
          groupId: form.groupId || null,
          ...(form.password ? { newPassword: form.password } : {}),
        });
      } else {
        await post("/admin/users", {
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          groupId: form.groupId || null,
          role: form.isAdmin ? "ADMIN" : "STUDENT",
        });
      }
      setForm(null);
    });
  };

  const openHistory = async (u: User) => {
    try {
      setHistory({ user: u, data: await get<History>(`/admin/users/${u.id}/history`) });
    } catch (e) {
      ui.error(e);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          {t("nav.users")}
        </Typography>
        <Button variant="contained" onClick={() => setForm({ fullName: "", email: "", password: "", groupId: "", isAdmin: false })}>
          {t("admin.addUser")}
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2}>
        <TextField size="small" label={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
        <TextField size="small" select label={t("status")} value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 170 }}>
          <MenuItem value="">{t("all")}</MenuItem>
          {["PENDING", "ACTIVE", "REJECTED", "LOCKED"].map((s) => (
            <MenuItem key={s} value={s}>{t(`status.${s}`)}</MenuItem>
          ))}
        </TextField>
        <TextField size="small" select label={t("group")} value={groupId} onChange={(e) => setGroupId(e.target.value)} sx={{ minWidth: 170 }}>
          <MenuItem value="">{t("all")}</MenuItem>
          {groups.map((g) => (
            <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {!users ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("fullName")}</TableCell>
                <TableCell>{t("email")}</TableCell>
                <TableCell>{t("group")}</TableCell>
                <TableCell>{t("role")}</TableCell>
                <TableCell>{t("status")}</TableCell>
                <TableCell align="right">{t("actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.group?.name ?? "—"}</TableCell>
                  <TableCell>{t(`role.${u.role}`)}</TableCell>
                  <TableCell>
                    <StatusChip kind="status" value={u.status} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {u.status === "PENDING" && (
                      <>
                        <Tooltip title={t("admin.approve")}>
                          <IconButton color="success" onClick={() => act(() => post(`/admin/users/${u.id}/approve`))}><CheckIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title={t("admin.reject")}>
                          <IconButton color="error" onClick={() => act(() => post(`/admin/users/${u.id}/reject`))}><CloseIcon /></IconButton>
                        </Tooltip>
                      </>
                    )}
                    <IconButton onClick={() => setForm({ id: u.id, fullName: u.fullName, email: u.email, password: "", groupId: u.groupId ?? "", isAdmin: u.role === "ADMIN" })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={(e) => setMenu({ el: e.currentTarget, user: u })}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
        {menu && [
          <MenuItem key="h" onClick={() => { const u = menu.user; setMenu(null); openHistory(u); }}>{t("admin.history")}</MenuItem>,
          menu.user.status === "LOCKED" ? (
            <MenuItem key="l" onClick={() => { const u = menu.user; setMenu(null); act(() => post(`/admin/users/${u.id}/unlock`)); }}>{t("admin.unlock")}</MenuItem>
          ) : menu.user.status === "ACTIVE" ? (
            <MenuItem key="l" onClick={() => { const u = menu.user; setMenu(null); act(() => post(`/admin/users/${u.id}/lock`)); }}>{t("admin.lock")}</MenuItem>
          ) : null,
          menu.user.status === "REJECTED" ? (
            <MenuItem key="a" onClick={() => { const u = menu.user; setMenu(null); act(() => post(`/admin/users/${u.id}/approve`)); }}>{t("admin.approve")}</MenuItem>
          ) : null,
          menu.user.role === "STUDENT" ? (
            <MenuItem key="p" onClick={() => { const u = menu.user; setMenu(null); act(() => post(`/admin/users/${u.id}/promote`)); }}>{t("admin.promote")}</MenuItem>
          ) : (
            <MenuItem key="d" onClick={() => { const u = menu.user; setMenu(null); act(() => post(`/admin/users/${u.id}/demote`)); }}>{t("admin.demote")}</MenuItem>
          ),
          <MenuItem
            key="x"
            sx={{ color: "error.main" }}
            onClick={async () => {
              const u = menu.user;
              setMenu(null);
              if (await ui.confirm(`${t("confirmDelete")} (${u.fullName})`)) act(() => del(`/admin/users/${u.id}`));
            }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            {t("delete")}
          </MenuItem>,
        ]}
      </Menu>

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{form?.id ? t("admin.editUser") : t("admin.addUser")}</DialogTitle>
        <DialogContent>
          {form && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label={t("fullName")} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} fullWidth />
              <TextField label={t("email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
              <TextField
                label={form.id ? t("newPassword") : t("password")}
                type={showPassword ? "text" : "password"}
                helperText={form.id ? t("admin.passwordHint") : undefined}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                fullWidth
                autoComplete="new-password"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField select label={t("group")} value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })} fullWidth>
                <MenuItem value="">{t("noGroup")}</MenuItem>
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                ))}
              </TextField>
              {!form.id && (
                <FormControlLabel control={<Checkbox checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />} label={t("role.ADMIN")} />
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>{t("cancel")}</Button>
          <Button variant="contained" onClick={saveForm} disabled={!form || form.fullName.trim().length < 2 || !form.email || (!form.id && form.password.length < 6)}>
            {t("save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!history} onClose={() => setHistory(null)} fullWidth maxWidth="md">
        <DialogTitle>{history?.user.fullName}</DialogTitle>
        <DialogContent dividers>
          {history && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>{t("admin.exams")}</Typography>
                {history.data.attempts.length === 0 ? (
                  <Typography color="text.secondary">{t("empty")}</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableBody>
                        {history.data.attempts.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>{a.test.title}</TableCell>
                            <TableCell><StatusChip kind="attempt" value={a.status} /></TableCell>
                            <TableCell>{a.score ?? 0} / {a.total ?? 0}</TableCell>
                            <TableCell>{new Date(a.startedAt).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>{t("admin.loginHistory")}</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      {history.data.logins.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{l.success ? t("yes") : `${t("no")} (${l.reason ?? ""})`}</TableCell>
                          <TableCell>{l.ip}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistory(null)}>{t("close")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
