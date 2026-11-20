import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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
import { downloadCsv, get, post } from "../../api/client";
import type { AttemptStatus, Group, ResultRow, TestSummary } from "../../api/types";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";
import StatusChip from "../../components/StatusChip";

interface Detail {
  id: string;
  status: AttemptStatus;
  score: number | null;
  total: number | null;
  user: { fullName: string; email: string };
  testTitle: string;
  questions: { id: string; text: string; selectedOptionId: string | null; options: { id: string; text: string; isCorrect: boolean }[] }[];
}

export default function AdminResults() {
  const { t } = useI18n();
  const ui = useUi();
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [testId, setTestId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams();
    if (testId) qs.set("testId", testId);
    if (groupId) qs.set("groupId", groupId);
    if (search) qs.set("search", search);
    get<ResultRow[]>(`/admin/results?${qs}`).then(setRows).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, groupId, search]);

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    get<TestSummary[]>("/admin/tests").then(setTests).catch(ui.error);
    get<Group[]>("/admin/groups").then(setGroups).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allow = async (r: ResultRow) => {
    try {
      await post(`/admin/attempts/${r.id}/allow-retake`);
      ui.success(t("results.retakeGranted"));
      load();
    } catch (e) {
      ui.error(e);
    }
  };

  const open = async (r: ResultRow) => {
    try {
      setDetail(await get<Detail>(`/admin/attempts/${r.id}`));
    } catch (e) {
      ui.error(e);
    }
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} mb={2}>
        <Typography variant="h5" fontWeight={700}>{t("nav.results")}</Typography>
        <Button variant="outlined" onClick={() => downloadCsv("/admin/results/export.csv", "results.csv").catch(ui.error)}>
          {t("results.exportCsv")}
        </Button>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2}>
        <TextField size="small" label={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
        <TextField size="small" select label={t("results.test")} value={testId} onChange={(e) => setTestId(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">{t("all")}</MenuItem>
          {tests.map((x) => <MenuItem key={x.id} value={x.id}>{x.title}</MenuItem>)}
        </TextField>
        <TextField size="small" select label={t("group")} value={groupId} onChange={(e) => setGroupId(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">{t("all")}</MenuItem>
          {groups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
        </TextField>
      </Stack>

      {!rows ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("results.student")}</TableCell>
                <TableCell>{t("group")}</TableCell>
                <TableCell>{t("results.test")}</TableCell>
                <TableCell>{t("results.attempt")}</TableCell>
                <TableCell>{t("status")}</TableCell>
                <TableCell>{t("results.score")}</TableCell>
                <TableCell>{t("results.entries")}</TableCell>
                <TableCell>{t("date")}</TableCell>
                <TableCell align="right">{t("actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.user.fullName}<br /><Typography variant="caption" color="text.secondary">{r.user.email}</Typography></TableCell>
                  <TableCell>{r.user.group ?? "—"}</TableCell>
                  <TableCell>{r.test.title}</TableCell>
                  <TableCell>#{r.attemptNo}</TableCell>
                  <TableCell><StatusChip kind="attempt" value={r.status} /></TableCell>
                  <TableCell>{r.status === "IN_PROGRESS" ? "…" : `${r.score ?? 0} / ${r.total ?? 0}`}</TableCell>
                  <TableCell>{r.entryCount}</TableCell>
                  <TableCell>{new Date(r.startedAt).toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Button size="small" onClick={() => open(r)}>{t("results.details")}</Button>
                    {r.isLatest && r.status !== "IN_PROGRESS" && (
                      r.retakeGranted ? (
                        <Chip size="small" color="info" label={t("results.retakeGranted")} />
                      ) : (
                        <Button size="small" onClick={() => allow(r)}>{t("results.allowRetake")}</Button>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="md">
        <DialogTitle>
          {detail?.user.fullName} — {detail?.testTitle} ({detail?.score ?? 0}/{detail?.total ?? 0})
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {detail?.questions.map((q, i) => (
              <Box key={q.id}>
                <Typography fontWeight={600} sx={{ whiteSpace: "pre-wrap" }}>{i + 1}. {q.text}</Typography>
                {q.selectedOptionId === null && <Typography variant="caption" color="text.secondary">{t("results.noAnswer")}</Typography>}
                {q.options.map((o) => {
                  const chosen = o.id === q.selectedOptionId;
                  return (
                    <Typography
                      key={o.id}
                      variant="body2"
                      sx={{
                        pl: 1,
                        borderLeft: 3,
                        borderColor: o.isCorrect ? "success.main" : chosen ? "error.main" : "transparent",
                        fontWeight: chosen ? 700 : 400,
                        color: chosen && !o.isCorrect ? "error.main" : undefined,
                      }}
                    >
                      {o.text}
                      {chosen ? ` ← ${t("results.selected")}` : ""}
                    </Typography>
                  );
                })}
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>{t("close")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
