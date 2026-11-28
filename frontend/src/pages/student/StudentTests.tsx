import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
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

  if (!tests) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          {t("nav.myTests")}
        </Typography>
      </Stack>

      {!user?.groupId && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          {t("student.noGroupHint")}
        </Alert>
      )}
      {tests.length === 0 && user?.groupId && <Alert severity="info">{t("student.noTests")}</Alert>}

      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" } }}>
        {tests.map((x) => {
          const isDone = x.state === "DONE";
          const isProgress = x.state === "IN_PROGRESS";
          const accent = isDone ? "#16a34a" : isProgress ? "#0284c7" : "#2563eb";

          return (
            <Card
              key={x.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
                overflow: "hidden",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
                },
              }}
            >
              <Box sx={{ height: 4, bgcolor: accent }} />
              <CardContent sx={{ p: 2.5, flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} mb={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "10px",
                      bgcolor: isDone ? "#dcfce7" : isProgress ? "#e0f2fe" : "#eff6ff",
                      color: accent,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? <CheckCircleOutlineIcon fontSize="small" /> : <QuizOutlinedIcon fontSize="small" />}
                  </Box>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end">
                    {x.retakeGranted && (
                      <Chip size="small" label={t("student.retakeAllowed")} sx={{ bgcolor: "#e0f2fe", color: "#0369a1" }} />
                    )}
                    {isDone && <Chip size="small" label={t("student.done")} sx={{ bgcolor: "#dcfce7", color: "#15803d" }} />}
                    {isProgress && <Chip size="small" label={t("attempt.IN_PROGRESS")} sx={{ bgcolor: "#e0f2fe", color: "#0369a1" }} />}
                  </Stack>
                </Stack>

                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ lineHeight: 1.3 }}>
                  {x.title}
                </Typography>

                {x.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
                    {x.description}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<HelpOutlineIcon sx={{ fontSize: "16px !important" }} />}
                    label={`${x.questionCount} ${t("questions").toLowerCase()}`}
                    sx={{ borderColor: "#e2e8f0", bgcolor: "#f8fafc", color: "#475569" }}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<AccessTimeOutlinedIcon sx={{ fontSize: "16px !important" }} />}
                    label={`${x.durationMinutes} ${t("minutes")}`}
                    sx={{ borderColor: "#e2e8f0", bgcolor: "#f8fafc", color: "#475569" }}
                  />
                </Stack>
              </CardContent>

              {!isDone && (
                <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PlayArrowRoundedIcon />}
                    onClick={() => nav(`/exam/${x.id}`)}
                    sx={{ py: 1 }}
                  >
                    {isProgress ? t("student.resume") : t("student.start")}
                  </Button>
                </CardActions>
              )}
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
