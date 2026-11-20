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
    <Box sx={{ minHeight: "100vh", p: { xs: 1.5, sm: 3 }, maxWidth: 820, mx: "auto" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700}>
          {exam?.testTitle || t("appName")}
        </Typography>
        <LanguageSwitch />
      </Stack>
      {children}
    </Box>
  );

  // 1) Экрани оғоз бо огоҳӣ
  if (!exam && !result) {
    return shell(
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">{t("student.warnTitle")}</Typography>
            <Alert severity="warning">{t("student.warnBody", { max: maxEntries })}</Alert>
            {startError && <Alert severity="error">{startError}</Alert>}
            <Stack direction="row" spacing={1}>
              <Button onClick={() => nav("/")}>{t("back")}</Button>
              <Button variant="contained" onClick={start} disabled={starting}>
                {starting ? <CircularProgress size={22} /> : t("student.start")}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // 3) Натиҷа
  if (result) {
    return shell(
      <Card>
        <CardContent>
          <Stack spacing={2} alignItems="flex-start">
            <Typography variant="h5">{t("student.result")}</Typography>
            {result.timeUp && <Alert severity="info">{t("student.timeUp")}</Alert>}
            {result.score !== null && result.total !== null && (
              <Typography variant="h6">{t("student.resultText", { score: result.score, total: result.total })}</Typography>
            )}
            <Button variant="contained" onClick={() => nav("/")}>
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
    <Stack spacing={2}>
      <Card>
        <CardContent sx={{ pb: "16px !important" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
            <Chip color={low ? "error" : "primary"} label={`${t("student.timeLeft")}: ${fmt(remaining)}`} />
            <Chip size="small" variant="outlined" label={t("student.entryInfo", { n: e.entryCount, max: e.maxEntries })} />
            <Typography variant="body2">{t("student.unanswered", { n: unanswered })}</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress * 100} sx={{ mt: 1.5, height: 6, borderRadius: 3 }} />
        </CardContent>
      </Card>

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
        {e.questions.map((qq, i) => (
          <Chip
            key={qq.id}
            label={i + 1}
            clickable
            onClick={() => setIdx(i)}
            color={i === idx ? "primary" : answers[qq.id] ? "success" : "default"}
            variant={i === idx ? "filled" : "outlined"}
            sx={{ minWidth: 40 }}
          />
        ))}
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="overline" color="text.secondary">
            {t("student.question")} {idx + 1} {t("student.of")} {e.questions.length}
          </Typography>
          <Typography variant="h6" sx={{ mb: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {q.text}
          </Typography>
          <RadioGroup value={answers[q.id] ?? ""} onChange={(ev) => choose(q.id, ev.target.value)}>
            {q.options.map((o) => (
              <FormControlLabel
                key={o.id}
                value={o.id}
                disabled={!!answers[q.id] || saving}
                control={<Radio />}
                label={o.text}
                sx={{
                  m: 0,
                  mb: 1,
                  px: 1,
                  py: 0.5,
                  border: 1,
                  borderColor: answers[q.id] === o.id ? "primary.main" : "divider",
                  borderRadius: 2,
                  bgcolor: answers[q.id] === o.id ? "action.selected" : "background.paper",
                  "& .MuiFormControlLabel-label": { wordBreak: "break-word" },
                }}
              />
            ))}
          </RadioGroup>
          {answers[q.id] && (
            <Typography variant="caption" color="text.secondary">
              {t("student.answerLocked")}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Button disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
          {t("student.prev")}
        </Button>
        {idx < e.questions.length - 1 ? (
          <Button variant="outlined" onClick={() => setIdx(idx + 1)}>
            {t("student.next")}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={async () => {
              if (await ui.confirm(`${t("student.confirmFinish")}${unanswered ? "\n" + t("student.unanswered", { n: unanswered }) : ""}`)) finish("finish");
            }}
          >
            {t("student.finish")}
          </Button>
        )}
      </Stack>

      <Box>
        <Button
          color="error"
          size="small"
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
