import { useEffect, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { get } from "../../api/client";
import type { AttemptStatus } from "../../api/types";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";
import StatusChip from "../../components/StatusChip";

interface Row {
  id: string;
  testTitle: string;
  status: AttemptStatus;
  score: number | null;
  total: number | null;
  finishedAt: string | null;
}

export default function StudentResults() {
  const { t } = useI18n();
  const ui = useUi();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    get<Row[]>("/student/results").then(setRows).catch((e) => {
      ui.error(e);
      setRows([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rows) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        {t("nav.myResults")}
      </Typography>
      {rows.length === 0 ? (
        <Alert severity="info">{t("empty")}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "hidden" }}>
          <Table size="small" sx={{ width: "100%" }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("results.test")}</TableCell>
                <TableCell>{t("status")}</TableCell>
                <TableCell>{t("results.score")}</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{t("date")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const score = r.score ?? 0;
                const total = r.total ?? 0;
                const pct = total > 0 ? Math.round((score / total) * 100) : 0;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 600, wordBreak: "break-word" }}>{r.testTitle}</TableCell>
                    <TableCell>
                      <StatusChip kind="attempt" value={r.status} />
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      <Typography component="span" fontWeight={700}>
                        {score} / {total}
                      </Typography>
                      {total > 0 && (
                        <Chip
                          size="small"
                          label={`${pct}%`}
                          sx={{ ml: 1, height: 22, fontSize: "0.72rem", bgcolor: "#f1f5f9", color: "#475569" }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, color: "text.secondary" }}>
                      {r.finishedAt ? new Date(r.finishedAt).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
