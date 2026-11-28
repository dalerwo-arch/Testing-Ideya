import { useEffect, useState } from "react";
import { Alert, Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
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

  if (!logs) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        {t("nav.logins")}
      </Typography>
      {logs.length === 0 ? (
        <Alert severity="info">{t("empty")}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ overflowX: "hidden" }}>
          <Table size="small" sx={{ width: "100%" }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("date")}</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{t("fullName")}</TableCell>
                <TableCell>{t("email")}</TableCell>
                <TableCell>{t("admin.success")}</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{t("admin.reason")}</TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>{t("admin.ip")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem" }}>{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" }, fontWeight: 600 }}>{l.user?.fullName ?? "—"}</TableCell>
                  <TableCell sx={{ color: "text.secondary", wordBreak: "break-all" }}>{l.email}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={l.success ? t("yes") : t("no")}
                      sx={{
                        bgcolor: l.success ? "#dcfce7" : "#fee2e2",
                        color: l.success ? "#15803d" : "#b91c1c",
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, wordBreak: "break-word" }}>{l.reason ?? ""}</TableCell>
                  <TableCell sx={{ display: { xs: "none", lg: "table-cell" }, fontFamily: "monospace", fontSize: "0.8rem", color: "text.secondary" }}>
                    {l.ip}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
