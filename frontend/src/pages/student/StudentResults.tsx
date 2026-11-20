import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
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

  if (!rows) return <CircularProgress />;
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        {t("nav.myResults")}
      </Typography>
      {rows.length === 0 ? (
        <Alert severity="info">{t("empty")}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("results.test")}</TableCell>
                <TableCell>{t("status")}</TableCell>
                <TableCell>{t("results.score")}</TableCell>
                <TableCell>{t("date")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.testTitle}</TableCell>
                  <TableCell><StatusChip kind="attempt" value={r.status} /></TableCell>
                  <TableCell>{r.score ?? 0} / {r.total ?? 0}</TableCell>
                  <TableCell>{r.finishedAt ? new Date(r.finishedAt).toLocaleString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
