import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
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
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
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
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.5} mb={3}>
        <Typography variant="h5" fontWeight={700}>
          {t("nav.results")}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => downloadCsv("/admin/results/export.csv", "results.csv").catch(ui.error)}
          sx={{ bgcolor: "#fff" }}
        >
          {t("results.exportCsv")}
        </Button>
      </Stack>

      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              size="small"
              label={t("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField size="small" select label={t("results.test")} value={testId} onChange={(e) => setTestId(e.target.value)} sx={{ minWidth: { sm: 200 } }}>
              <MenuItem value="">{t("all")}</MenuItem>
              {tests.map((x) => (
                <MenuItem key={x.id} value={x.id}>
                  {x.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField size="small" select label={t("group")} value={groupId} onChange={(e) => setGroupId(e.target.value)} sx={{ minWidth: { sm: 160 } }}>
              <MenuItem value="">{t("all")}</MenuItem>
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {!rows ? (
        <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">{t("empty")}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "hidden" }}>
          <Table size="small" sx={{ width: "100%" }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("results.student")}</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{t("group")}</TableCell>
                <TableCell>{t("results.test")}</TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>{t("results.attempt")}</TableCell>
                <TableCell>{t("status")}</TableCell>
                <TableCell>{t("results.score")}</TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>{t("results.entries")}</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{t("date")}</TableCell>
                <TableCell align="right">{t("actions")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ wordBreak: "break-word" }}>
                      {r.user.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                      {r.user.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    {r.user.group ? <Chip size="small" variant="outlined" label={r.user.group} /> : "—"}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500, wordBreak: "break-word" }}>{r.test.title}</TableCell>
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" }, fontVariantNumeric: "tabular-nums" }}>#{r.attemptNo}</TableCell>
                  <TableCell>
                    <StatusChip kind="attempt" value={r.status} />
                  </TableCell>
                  <TableCell sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {r.status === "IN_PROGRESS" ? "…" : `${r.score ?? 0} / ${r.total ?? 0}`}
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" }, fontVariantNumeric: "tabular-nums" }}>{r.entryCount}</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, color: "text.secondary", fontSize: "0.8rem" }}>
                    {new Date(r.startedAt).toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.75} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
                      <Button size="small" variant="outlined" onClick={() => open(r)}>
                        {t("results.details")}
                      </Button>
                      {r.isLatest &&
                        r.status !== "IN_PROGRESS" &&
                        (r.retakeGranted ? (
                          <Chip size="small" label={t("results.retakeGranted")} sx={{ bgcolor: "#e0f2fe", color: "#0369a1" }} />
                        ) : (
                          <Button size="small" variant="contained" onClick={() => allow(r)}>
                            {t("results.allowRetake")}
                          </Button>
                        ))}
                    </Stack>
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
              <Box key={q.id} sx={{ p: 2, borderRadius: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <Typography fontWeight={600} mb={1} sx={{ whiteSpace: "pre-wrap" }}>
                  {i + 1}. {q.text}
                </Typography>
                {q.selectedOptionId === null && (
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
                    {t("results.noAnswer")}
                  </Typography>
                )}
                <Stack spacing={0.5}>
                  {q.options.map((o) => {
                    const chosen = o.id === q.selectedOptionId;
                    return (
                      <Typography
                        key={o.id}
                        variant="body2"
                        sx={{
                          px: 1.25,
                          py: 0.6,
                          borderRadius: 1.5,
                          borderLeft: "3px solid",
                          borderColor: o.isCorrect ? "success.main" : chosen ? "error.main" : "transparent",
                          bgcolor: o.isCorrect ? "#f0fdf4" : chosen ? "#fef2f2" : "#ffffff",
                          fontWeight: chosen || o.isCorrect ? 600 : 400,
                          color: chosen && !o.isCorrect ? "error.main" : undefined,
                        }}
                      >
                        {o.text}
                        {chosen ? ` ← ${t("results.selected")}` : ""}
                      </Typography>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetail(null)}>{t("close")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
