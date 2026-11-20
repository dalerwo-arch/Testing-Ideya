import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { get } from "../../api/client";
import type { StudentTest } from "../../api/types";
import { useAuth } from "../../AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";

export default function StudentTests() {
  const { user } = useAuth();
  const { t } = useI18n();
  const ui = useUi();
  const nav = useNavigate();
  const [tests, setTests] = useState<StudentTest[] | null>(null);

  useEffect(() => {
    get<StudentTest[]>("/student/tests").then(setTests).catch((e) => {
      ui.error(e);
      setTests([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tests) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        {t("nav.myTests")}
      </Typography>
      {!user?.groupId && <Alert severity="warning" sx={{ mb: 2 }}>{t("student.noGroupHint")}</Alert>}
      {tests.length === 0 && user?.groupId && <Alert severity="info">{t("student.noTests")}</Alert>}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" } }}>
        {tests.map((x) => (
          <Card key={x.id}>
            <CardContent>
              <Typography variant="h6">{x.title}</Typography>
              {x.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {x.description}
                </Typography>
              )}
              <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`${x.questionCount} ${t("questions").toLowerCase()}`} />
                <Chip size="small" label={`${x.durationMinutes} ${t("minutes")}`} />
                {x.retakeGranted && <Chip size="small" color="info" label={t("student.retakeAllowed")} />}
                {x.state === "DONE" && <Chip size="small" color="success" label={t("student.done")} />}
              </Stack>
            </CardContent>
            <CardActions>
              {x.state !== "DONE" && (
                <Button variant="contained" onClick={() => nav(`/exam/${x.id}`)}>
                  {x.state === "IN_PROGRESS" ? t("student.resume") : t("student.start")}
                </Button>
              )}
            </CardActions>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
