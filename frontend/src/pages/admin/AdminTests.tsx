import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, CircularProgress, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { del, get, post } from "../../api/client";
import type { TestSummary } from "../../api/types";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";

export default function AdminTests() {
  const { t } = useI18n();
  const ui = useUi();
  const nav = useNavigate();
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  const [form, setForm] = useState<null | { title: string; durationMinutes: string }>(null);

  const load = useCallback(() => {
    get<TestSummary[]>("/admin/tests").then(setTests).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(load, [load]);

  const create = async () => {
    if (!form) return;
    try {
      const created = await post<TestSummary>("/admin/tests", { title: form.title, durationMinutes: Number(form.durationMinutes) || 30 });
      setForm(null);
      nav(`/admin/tests/${created.id}`);
    } catch (e) {
      ui.error(e);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={700}>{t("nav.tests")}</Typography>
        <Button variant="contained" onClick={() => setForm({ title: "", durationMinutes: "30" })}>{t("test.new")}</Button>
      </Stack>
      {!tests ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("test.title")}</TableCell>
                <TableCell>{t("questions")}</TableCell>
                <TableCell>{t("minutes")}</TableCell>
                <TableCell>{t("test.assignGroups")}</TableCell>
                <TableCell>{t("status")}</TableCell>
                <TableCell align="right">{t("actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tests.map((x) => (
                <TableRow key={x.id} hover sx={{ cursor: "pointer" }} onClick={() => nav(`/admin/tests/${x.id}`)}>
                  <TableCell>{x.title}</TableCell>
                  <TableCell>{x._count.questions}</TableCell>
                  <TableCell>{x.durationMinutes}</TableCell>
                  <TableCell>{x.groups.map((g) => g.name).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <Chip size="small" color={x.isPublished ? "success" : "default"} label={x.isPublished ? t("test.published") : "Draft"} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="error"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!(await ui.confirm(`${t("confirmDelete")} (${x.title})`))) return;
                        try {
                          await del(`/admin/tests/${x.id}`);
                          load();
                        } catch (err) {
                          ui.error(err);
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
        <DialogTitle>{t("test.new")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField autoFocus label={t("test.title")} value={form?.title ?? ""} onChange={(e) => form && setForm({ ...form, title: e.target.value })} fullWidth />
            <TextField label={t("test.duration")} type="number" value={form?.durationMinutes ?? ""} onChange={(e) => form && setForm({ ...form, durationMinutes: e.target.value })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(null)}>{t("cancel")}</Button>
          <Button variant="contained" disabled={!form?.title.trim()} onClick={create}>{t("add")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
