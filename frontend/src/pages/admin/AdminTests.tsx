import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          {t("nav.tests")}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ title: "", durationMinutes: "30" })}>
          {t("test.new")}
        </Button>
      </Stack>

      {!tests ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : tests.length === 0 ? (
        <Alert severity="info">{t("empty")}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "hidden" }}>
          <Table size="small" sx={{ width: "100%" }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("test.title")}</TableCell>
                <TableCell>{t("questions")}</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{t("minutes")}</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{t("test.assignGroups")}</TableCell>
                <TableCell>{t("status")}</TableCell>
                <TableCell align="right">{t("actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tests.map((x) => (
                <TableRow key={x.id} hover sx={{ cursor: "pointer" }} onClick={() => nav(`/admin/tests/${x.id}`)}>
                  <TableCell sx={{ fontWeight: 600, wordBreak: "break-word" }}>{x.title}</TableCell>
                  <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{x._count.questions}</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, fontVariantNumeric: "tabular-nums" }}>{x.durationMinutes}</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    {x.groups.length > 0 ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {x.groups.map((g) => (
                          <Chip key={g.id} size="small" variant="outlined" label={g.name} />
                        ))}
                      </Stack>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={x.isPublished ? t("test.published") : "Draft"}
                      sx={{
                        bgcolor: x.isPublished ? "#dcfce7" : "#f1f5f9",
                        color: x.isPublished ? "#15803d" : "#475569",
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
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
            <TextField
              autoFocus
              label={t("test.title")}
              value={form?.title ?? ""}
              onChange={(e) => form && setForm({ ...form, title: e.target.value })}
              fullWidth
            />
            <TextField
              label={t("test.duration")}
              type="number"
              value={form?.durationMinutes ?? ""}
              onChange={(e) => form && setForm({ ...form, durationMinutes: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setForm(null)} color="inherit">
            {t("cancel")}
          </Button>
          <Button variant="contained" disabled={!form?.title.trim()} onClick={create}>
            {t("add")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
