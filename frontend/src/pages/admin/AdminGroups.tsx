import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { del, get, patch, post } from "../../api/client";
import type { Group } from "../../api/types";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";

export default function AdminGroups() {
  const { t } = useI18n();
  const ui = useUi();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [form, setForm] = useState<null | { id?: string; name: string }>(null);

  const load = useCallback(() => {
    get<Group[]>("/admin/groups").then(setGroups).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    if (!form) return;
    try {
      if (form.id) await patch(`/admin/groups/${form.id}`, { name: form.name });
      else await post("/admin/groups", { name: form.name });
      setForm(null);
      ui.success(t("saved"));
      load();
    } catch (e) {
      ui.error(e);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          {t("nav.groups")}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ name: "" })}>
          {t("admin.addGroup")}
        </Button>
      </Stack>

      {!groups ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : groups.length === 0 ? (
        <Alert severity="info">{t("empty")}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "hidden" }}>
          <Table size="small" sx={{ width: "100%" }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("admin.groupName")}</TableCell>
                <TableCell>{t("admin.members")}</TableCell>
                <TableCell>{t("admin.testsCount")}</TableCell>
                <TableCell align="right">{t("actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{g.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={g._count?.users ?? 0} sx={{ bgcolor: "#eff6ff", color: "#2563eb", fontVariantNumeric: "tabular-nums" }} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={g._count?.assignments ?? 0} sx={{ bgcolor: "#f1f5f9", color: "#475569", fontVariantNumeric: "tabular-nums" }} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setForm({ id: g.id, name: g.name })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={async () => {
                        if (!(await ui.confirm(`${t("confirmDelete")} (${g.name})`))) return;
                        try {
                          await del(`/admin/groups/${g.id}`);
                          load();
                        } catch (e) {
                          ui.error(e);
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{form?.id ? t("edit") : t("admin.addGroup")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            sx={{ mt: 1 }}
            fullWidth
            label={t("admin.groupName")}
            value={form?.name ?? ""}
            onChange={(e) => form && setForm({ ...form, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setForm(null)} color="inherit">
            {t("cancel")}
          </Button>
          <Button variant="contained" disabled={!form?.name.trim()} onClick={save}>
            {t("save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
