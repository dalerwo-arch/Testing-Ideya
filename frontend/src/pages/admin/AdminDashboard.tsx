import { useEffect, useState } from "react";
import { Box, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import { get } from "../../api/client";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";

interface Stats {
  students: number;
  pending: number;
  locked: number;
  tests: number;
  attempts: number;
  groups: number;
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const ui = useUi();
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    get<Stats>("/admin/stats").then(setS).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!s) return <CircularProgress />;
  const keys: (keyof Stats)[] = ["students", "pending", "locked", "groups", "tests", "attempts"];
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        {t("nav.dashboard")}
      </Typography>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)" } }}>
        {keys.map((k) => (
          <Card key={k}>
            <CardContent>
              <Typography variant="h4" fontWeight={700} color={k === "pending" && s.pending > 0 ? "warning.main" : "primary"}>
                {s[k]}
              </Typography>
              <Typography color="text.secondary">{t(`admin.stats.${k}`)}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
