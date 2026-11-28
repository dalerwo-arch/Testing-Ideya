import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import { ApiError, get, post } from "../../api/client";
import type { ExamPayload } from "../../api/types";
import { useAuth } from "../../AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";
import LanguageSwitch from "../../components/LanguageSwitch";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function ExamPage() {
  const { testId } = useParams();
  const nav = useNavigate();
  const { logout } = useAuth();
  const { t, errorText } = useI18n();
  const ui = useUi();

  const [exam, setExam] = useState<ExamPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ score: number | null; total: number | null; timeUp?: boolean } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const offsetRef = useRef(0);
  const finishingRef = useRef(false);
  const [maxEntries, setMaxEntries] = useState(3);

  useEffect(() => {
    get<{ maxExamEntries?: number }>("/auth/config")
      .then((c) => c.maxExamEntries && setMaxEntries(c.maxExamEntries))
      .catch(() => undefined);
  }, []);

  const start = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const p = await post<ExamPayload>(`/student/tests/${testId}/start`);
      offsetRef.current = new Date(p.serverNow).getTime() - Date.now();
      setAnswers(p.answers);
      setExam(p);
      const firstOpen = p.questions.findIndex((q) => !p.answers[q.id]);
      setIdx(firstOpen >= 0 ? firstOpen : 0);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      setStartError(errorText(code));
      if (code === "ACCOUNT_LOCKED_EXAM") {
        setTimeout(() => {
          logout();
          nav("/login");
        }, 4000);
      }
    } finally {
      setStarting(false);
    }
  };

  const finish = useCallback(
    async (kind: "finish" | "exit", timeUp = false) => {
      if (!exam || finishingRef.current) return;
      finishingRef.current = true;
      try {
        const r = await post<{ score: number | null; total: number | null }>(`/student/attempts/${exam.attemptId}/${kind}`);
        if (kind === "exit") {
          nav("/");
          return;
        }
        setResult({ ...r, timeUp });
      } catch (e) {
        finishingRef.current = false;
        ui.error(e);
      }
    },
    [exam, nav, ui]
  );

  // Таймер
  useEffect(() => {
    if (!exam || result) return;
    const end = new Date(exam.endsAt).getTime();
    const tick = () => {
      const left = end - (Date.now() + offsetRef.current);
      setRemaining(left);
      if (left <= 0) finish("finish", true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [exam, result, finish]);

  const choose = async (questionId: string, optionId: string) => {
    if (!exam || answers[questionId] || saving) return;
    setSaving(true);
    try {
      await post(`/student/attempts/${exam.attemptId}/answer`, { questionId, optionId });
      setAnswers((a) => ({ ...a, [questionId]: optionId }));
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      if (code === "EXAM_EXPIRED") {
        setResult({ score: null, total: null, timeUp: true });
        finishingRef.current = true;
      } else if (code === "ANSWER_LOCKED") {
        ui.error(e);
      } else {
        ui.error(e);
      }
    } finally {
      setSaving(false);
    }
  };

  const unanswered = useMemo(() => (exam ? exam.questions.filter((q) => !answers[q.id]).length : 0), [exam, answers]);

  const shell = (children: ReactNode) => (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", pb: 5 }}>
      <Box
        sx={{
          bgcolor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ maxWidth: 860, mx: "auto", px: { xs: 2, sm: 3 }, py: 1.5 }}
        >
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              <SchoolRoundedIcon fontSize="small" />
            </Box>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {exam?.testTitle || t("appName")}
            </Typography>
          </Stack>
          <LanguageSwitch />
        </Stack>
      </Box>
      <Box sx={{ maxWidth: 860, mx: "auto", px: { xs: 2, sm: 3 }, pt: 3 }}>{children}</Box>
    </Box>
  );

  // 1) Экрани оғоз бо огоҳӣ
  if (!exam && !result) {
    return shell(
      <Card sx={{ maxWidth: 580, mx: "auto", mt: { xs: 2, sm: 5 } }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  bgcolor: "#fef3c7",
                  color: "#d97706",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <WarningAmberRoundedIcon />
              </Box>
              <Typography variant="h6" fontWeight={700}>
                {t("student.warnTitle")}
              </Typography>
            </Stack>

            <Alert severity="warning" sx={{ lineHeight: 1.6 }}>
              {t("student.warnBody", { max: maxEntries })}
            </Alert>
            {startError && <Alert severity="error">{startError}</Alert>}

            <Stack direction="row" spacing={1.5} justifyContent="flex-end" pt={1}>
              <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => nav("/")}>
                {t("back")}
              </Button>
              <Button variant="contained" onClick={start} disabled={starting} sx={{ px: 3 }}>
                {starting ? <CircularProgress size={22} color="inherit" /> : t("student.start")}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // 3) Натиҷа
  if (result) {
    const hasScore = result.score !== null && result.total !== null;
    const pct = hasScore && result.total! > 0 ? Math.round((result.score! / result.total!) * 100) : null;
    return shell(
      <Card sx={{ maxWidth: 540, mx: "auto", mt: { xs: 2, sm: 5 }, textAlign: "center" }}>
        <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
          <Stack spacing={2.5} alignItems="center">
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "20px",
                bgcolor: "#dcfce7",
                color: "#16a34a",
                display: "grid",
                placeItems: "center",
              }}
            >
              <CheckCircleRoundedIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>
              {t("student.result")}
            </Typography>
            {result.timeUp && (
              <Alert severity="info" sx={{ width: "100%", textAlign: "left" }}>
                {t("student.timeUp")}
              </Alert>
            )}
            {hasScore && (
              <Box
                sx={{
                  width: "100%",
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography variant="h3" fontWeight={800} color="primary.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {result.score} / {result.total}
                </Typography>
                {pct !== null && (
                  <Chip label={`${pct}%`} size="small" sx={{ mt: 1, bgcolor: "#eff6ff", color: "#2563eb", fontWeight: 700 }} />
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                  {t("student.resultText", { score: result.score!, total: result.total! })}
                </Typography>
              </Box>
            )}
            <Button variant="contained" size="large" onClick={() => nav("/")} sx={{ px: 4, py: 1.2 }}>
              {t("student.toList")}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // 2) Худи имтиҳон
  const e = exam!;
  const q = e.questions[idx];
  const progress = (e.questions.length - unanswered) / e.questions.length;
  const low = remaining < 60_000;

  return shell(
    <Stack spacing={2.5}>
      <Card>
        <CardContent sx={{ p: 2.5, pb: "20px !important" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1.5}>
            <Chip
              icon={<TimerOutlinedIcon sx={{ fontSize: "18px !important" }} />}
              label={`${t("student.timeLeft")}: ${fmt(remaining)}`}
              sx={{
                fontWeight: 700,
                fontSize: "0.9rem",
                fontVariantNumeric: "tabular-nums",
                bgcolor: low ? "#fee2e2" : "#eff6ff",
                color: low ? "#dc2626" : "#1d4ed8",
                "& .MuiChip-icon": { color: "inherit" },
                px: 0.75,
                height: 34,
              }}
            />
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Chip
                size="small"
                variant="outlined"
                label={t("student.entryInfo", { n: e.entryCount, max: e.maxEntries })}
                sx={{ borderColor: "#cbd5e1", color: "#475569" }}
              />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {t("student.unanswered", { n: unanswered })}
              </Typography>
            </Stack>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress * 100}
            sx={{
              mt: 2,
              height: 8,
              borderRadius: 4,
              bgcolor: "#e2e8f0",
              "& .MuiLinearProgress-bar": { borderRadius: 4, bgcolor: "#2563eb" },
            }}
          />
        </CardContent>
      </Card>

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
        {e.questions.map((qq, i) => {
          const active = i === idx;
          const answered = !!answers[qq.id];
          return (
            <Button
              key={qq.id}
              onClick={() => setIdx(i)}
              size="small"
              variant={active ? "contained" : "outlined"}
              sx={{
                minWidth: 40,
                height: 36,
                px: 1,
                borderRadius: "10px",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                ...(active
                  ? { bgcolor: "#2563eb", color: "#fff" }
                  : answered
                    ? { bgcolor: "#dcfce7", borderColor: "#86efac", color: "#15803d", "&:hover": { bgcolor: "#bbf7d0" } }
                    : { bgcolor: "#ffffff", borderColor: "#cbd5e1", color: "#475569" }),
              }}
            >
              {i + 1}
            </Button>
          );
        })}
      </Stack>

      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Chip
            size="small"
            label={`${t("student.question")} ${idx + 1} ${t("student.of")} ${e.questions.length}`}
            sx={{ mb: 2, bgcolor: "#f1f5f9", color: "#475569", fontWeight: 700 }}
          />
          <Typography variant="h6" sx={{ mb: 2.5, fontSize: { xs: "1.05rem", sm: "1.2rem" }, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {q.text}
          </Typography>
          <RadioGroup value={answers[q.id] ?? ""} onChange={(ev) => choose(q.id, ev.target.value)}>
            {q.options.map((o) => {
              const selected = answers[q.id] === o.id;
              return (
                <FormControlLabel
                  key={o.id}
                  value={o.id}
                  disabled={!!answers[q.id] || saving}
                  control={<Radio />}
                  label={o.text}
                  sx={{
                    m: 0,
                    mb: 1.25,
                    px: 1.5,
                    py: 1,
                    border: "1.5px solid",
                    borderColor: selected ? "#2563eb" : "#e2e8f0",
                    borderRadius: "12px",
                    bgcolor: selected ? "#eff6ff" : "#ffffff",
                    transition: "border-color 0.15s ease, background-color 0.15s ease",
                    "&:hover": !answers[q.id] ? { borderColor: "#93c5fd", bgcolor: "#f8fafc" } : undefined,
                    "& .MuiFormControlLabel-label": {
                      wordBreak: "break-word",
                      fontWeight: selected ? 600 : 400,
                      color: selected ? "#1e3a8a" : "#0f172a",
                    },
                  }}
                />
              );
            })}
          </RadioGroup>
          {answers[q.id] && (
            <Stack direction="row" spacing={0.75} alignItems="center" mt={1} color="text.secondary">
              <LockOutlinedIcon sx={{ fontSize: 16 }} />
              <Typography variant="caption" fontWeight={500}>
                {t("student.answerLocked")}
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          disabled={idx === 0}
          onClick={() => setIdx(idx - 1)}
          sx={{ bgcolor: "#fff" }}
        >
          {t("student.prev")}
        </Button>
        {idx < e.questions.length - 1 ? (
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => setIdx(idx + 1)}>
            {t("student.next")}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={async () => {
              if (await ui.confirm(`${t("student.confirmFinish")}${unanswered ? "\n" + t("student.unanswered", { n: unanswered }) : ""}`)) finish("finish");
            }}
            sx={{ px: 3 }}
          >
            {t("student.finish")}
          </Button>
        )}
      </Stack>

      <Box sx={{ pt: 1 }}>
        <Button
          color="error"
          size="small"
          startIcon={<ExitToAppIcon fontSize="small" />}
          onClick={async () => {
            if (await ui.confirm(t("student.confirmExit"))) finish("exit");
          }}
        >
          {t("student.exit")}
        </Button>
      </Box>
    </Stack>
  );
}
