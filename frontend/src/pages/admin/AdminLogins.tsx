import { useEffect, useState } from "react";
import { Box, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { get } from "../../api/client";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";

interface Log {
  id: string;
  email: string;
  success: boolean;
  reason: string | null;
  ip: string | null;
  createdAt: string;
  user: { fullName: string } | null;
}

export default function AdminLogins() {
  const { t } = useI18n();
  const ui = useUi();
  const [logs, setLogs] = useState<Log[] | null>(null);

  useEffect(() => {
    get<Log[]>("/admin/login-logs").then(setLogs).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!logs) return <CircularProgress />;
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>{t("nav.logins")}</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("date")}</TableCell>
              <TableCell>{t("fullName")}</TableCell>
              <TableCell>{t("email")}</TableCell>
              <TableCell>{t("admin.success")}</TableCell>
              <TableCell>{t("admin.reason")}</TableCell>
              <TableCell>{t("admin.ip")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                <TableCell>{l.user?.fullName ?? "—"}</TableCell>
                <TableCell>{l.email}</TableCell>
                <TableCell>{l.success ? t("yes") : t("no")}</TableCell>
                <TableCell>{l.reason ?? ""}</TableCell>
                <TableCell>{l.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
