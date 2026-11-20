import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  Stack,
  Switch,
  TextField,
  Typography,
  Autocomplete,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { del, get, patch, post, put } from "../../api/client";
import type { Group, QuestionDto, TestDetail } from "../../api/types";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";

interface QForm {
  id?: string;
  text: string;
  options: { text: string; isCorrect: boolean }[];
}

const emptyQ = (): QForm => ({
  text: "",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
});

export default function AdminTestEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t } = useI18n();
  const ui = useUi();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [selGroups, setSelGroups] = useState<Group[]>([]);
  const [published, setPublished] = useState(false);
  const [qForm, setQForm] = useState<QForm | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await get<TestDetail>(`/admin/tests/${id}`);
      setTest(d);
      setTitle(d.title);
      setDescription(d.description ?? "");
      setDuration(String(d.durationMinutes));
      setSelGroups(d.groups.map((g) => ({ id: g.id, name: g.name })));
      setPublished(d.isPublished);
    } catch (e) {
      ui.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
    get<Group[]>("/admin/groups").then(setGroups).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (!test) return <CircularProgress />;
  const locked = test._count.attempts > 0;

  const saveMeta = async () => {
    try {
      await patch(`/admin/tests/${test.id}`, {
        title,
        description: description || null,
        durationMinutes: Number(duration) || 30,
        isPublished: published,
        groupIds: selGroups.map((g) => g.id),
      });
      ui.success(t("saved"));
      load();
    } catch (e) {
      ui.error(e);
    }
  };

  const saveQuestion = async () => {
    if (!qForm) return;
    try {
      const body = { text: qForm.text, options: qForm.options.filter((o) => o.text.trim()) };
      if (qForm.id) await put(`/admin/questions/${qForm.id}`, body);
      else await post(`/admin/tests/${test.id}/questions`, body);
      setQForm(null);
      load();
    } catch (e) {
      ui.error(e);
    }
  };

  const editQuestion = (q: QuestionDto) =>
    setQForm({ id: q.id, text: q.text, options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) });

  const filled = qForm ? qForm.options.filter((o) => o.text.trim()) : [];
  const qValid = !!qForm && qForm.text.trim() && filled.length >= 2 && filled.filter((o) => o.isCorrect).length === 1;

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => nav("/admin/tests")} sx={{ mb: 1 }}>
        {t("back")}
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField label={t("test.title")} value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            <TextField label={t("test.description")} value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} />
            <TextField label={t("test.duration")} type="number" value={duration} onChange={(e) => setDuration(e.target.value)} sx={{ maxWidth: 220 }} />
            <Autocomplete
              multiple
              options={groups}
              value={selGroups}
              getOptionLabel={(g) => g.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              onChange={(_, v) => setSelGroups(v)}
              renderInput={(p) => <TextField {...p} label={t("test.assignGroups")} />}
            />
            <FormControlLabel control={<Switch checked={published} onChange={(e) => setPublished(e.target.checked)} />} label={t("test.published")} />
            <Typography variant="caption" color="text.secondary">{t("test.publishHint")}</Typography>
            <Box>
              <Button variant="contained" onClick={saveMeta} disabled={!title.trim()}>{t("save")}</Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="h6" fontWeight={700}>{t("questions")} ({test.questions.length})</Typography>
        <Button variant="contained" disabled={locked} onClick={() => setQForm(emptyQ())}>{t("test.addQuestion")}</Button>
      </Stack>
      {locked && <Alert severity="info" sx={{ mb: 2 }}>{t("test.lockedHint")}</Alert>}
      {test.questions.length === 0 && <Typography color="text.secondary">{t("test.noQuestions")}</Typography>}

      <Stack spacing={1.5}>
        {test.questions.map((q, i) => (
          <Card key={q.id} variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography fontWeight={600} sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {i + 1}. {q.text}
                </Typography>
                <Box sx={{ whiteSpace: "nowrap" }}>
                  <IconButton disabled={locked} onClick={() => editQuestion(q)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton
                    disabled={locked}
                    color="error"
                    onClick={async () => {
                      if (!(await ui.confirm(t("confirmDelete")))) return;
                      try {
                        await del(`/admin/questions/${q.id}`);
                        load();
                      } catch (e) {
                        ui.error(e);
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Stack>
              <Stack spacing={0.5} mt={1}>
                {q.options.map((o) => (
                  <Stack key={o.id} direction="row" spacing={1} alignItems="center">
                    <CheckCircleIcon fontSize="small" color={o.isCorrect ? "success" : "disabled"} />
                    <Typography variant="body2" sx={{ wordBreak: "break-word" }}>{o.text}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Dialog open={!!qForm} onClose={() => setQForm(null)} fullWidth maxWidth="sm">
        <DialogTitle>{qForm?.id ? t("test.editQuestion") : t("test.addQuestion")}</DialogTitle>
        <DialogContent>
          {qForm && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label={t("test.questionText")} value={qForm.text} onChange={(e) => setQForm({ ...qForm, text: e.target.value })} multiline minRows={2} fullWidth />
              {qForm.options.map((o, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={0.5}>
                  <Radio
                    checked={o.isCorrect}
                    onChange={() => setQForm({ ...qForm, options: qForm.options.map((x, j) => ({ ...x, isCorrect: j === i })) })}
                    inputProps={{ "aria-label": t("test.correct") }}
                  />
                  <TextField size="small" fullWidth label={`${t("test.option")} ${i + 1}`} value={o.text} onChange={(e) => setQForm({ ...qForm, options: qForm.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                  <IconButton
                    disabled={qForm.options.length <= 2}
                    onClick={() => {
                      const opts = qForm.options.filter((_, j) => j !== i);
                      if (!opts.some((x) => x.isCorrect)) opts[0].isCorrect = true;
                      setQForm({ ...qForm, options: opts });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Box>
                <Button size="small" disabled={qForm.options.length >= 10} onClick={() => setQForm({ ...qForm, options: [...qForm.options, { text: "", isCorrect: false }] })}>
                  {t("test.addOption")}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary">
                <Checkbox size="small" checked disabled sx={{ p: 0, mr: 0.5 }} /> {t("test.correct")}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQForm(null)}>{t("cancel")}</Button>
          <Button variant="contained" disabled={!qValid} onClick={saveQuestion}>{t("save")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
