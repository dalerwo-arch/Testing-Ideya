import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddIcon from "@mui/icons-material/Add";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
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

  if (!test) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
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
    <Box sx={{ maxWidth: 920 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => nav("/admin/tests")} color="inherit" sx={{ mb: 2, color: "text.secondary" }}>
        {t("back")}
      </Button>

      <Card sx={{ mb: 3.5 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack spacing={2.5}>
            <TextField label={t("test.title")} value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            <TextField
              label={t("test.description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label={t("test.duration")} type="number" value={duration} onChange={(e) => setDuration(e.target.value)} sx={{ width: { sm: 220 } }} />
              <Autocomplete
                multiple
                fullWidth
                options={groups}
                value={selGroups}
                getOptionLabel={(g) => g.name}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, v) => setSelGroups(v)}
                renderInput={(p) => <TextField {...p} label={t("test.assignGroups")} />}
              />
            </Stack>
            <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <FormControlLabel
                control={<Switch checked={published} onChange={(e) => setPublished(e.target.checked)} />}
                label={
                  <Typography variant="body2" fontWeight={600}>
                    {t("test.published")}
                  </Typography>
                }
              />
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6 }}>
                {t("test.publishHint")}
              </Typography>
            </Box>
            <Box>
              <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={saveMeta} disabled={!title.trim()} sx={{ px: 3 }}>
                {t("save")}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h6" fontWeight={700}>
            {t("questions")}
          </Typography>
          <Chip size="small" label={test.questions.length} sx={{ bgcolor: "#eff6ff", color: "#2563eb", fontWeight: 700 }} />
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} disabled={locked} onClick={() => setQForm(emptyQ())}>
          {t("test.addQuestion")}
        </Button>
      </Stack>

      {locked && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("test.lockedHint")}
        </Alert>
      )}
      {test.questions.length === 0 && <Alert severity="info">{t("test.noQuestions")}</Alert>}

      <Stack spacing={2}>
        {test.questions.map((q, i) => (
          <Card key={q.id}>
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <Chip
                    size="small"
                    label={i + 1}
                    sx={{ minWidth: 28, bgcolor: "#f1f5f9", color: "#0f172a", fontWeight: 700, mt: 0.25 }}
                  />
                  <Typography fontWeight={600} sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 }}>
                    {q.text}
                  </Typography>
                </Stack>
                <Box sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                  <IconButton size="small" disabled={locked} onClick={() => editQuestion(q)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
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

              <Stack spacing={0.75} mt={1.5} pl={{ sm: 4.5 }}>
                {q.options.map((o) => (
                  <Stack
                    key={o.id}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      borderRadius: "8px",
                      bgcolor: o.isCorrect ? "#f0fdf4" : "#f8fafc",
                      border: "1px solid",
                      borderColor: o.isCorrect ? "#bbf7d0" : "#f1f5f9",
                    }}
                  >
                    <CheckCircleIcon fontSize="small" color={o.isCorrect ? "success" : "disabled"} />
                    <Typography variant="body2" fontWeight={o.isCorrect ? 600 : 400} sx={{ wordBreak: "break-word" }}>
                      {o.text}
                    </Typography>
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
              <TextField
                label={t("test.questionText")}
                value={qForm.text}
                onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                multiline
                minRows={2}
                fullWidth
              />
              {qForm.options.map((o, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={0.75}>
                  <Radio
                    checked={o.isCorrect}
                    onChange={() => setQForm({ ...qForm, options: qForm.options.map((x, j) => ({ ...x, isCorrect: j === i })) })}
                    inputProps={{ "aria-label": t("test.correct") }}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label={`${t("test.option")} ${i + 1}`}
                    value={o.text}
                    onChange={(e) =>
                      setQForm({ ...qForm, options: qForm.options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })
                    }
                  />
                  <IconButton
                    size="small"
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
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  disabled={qForm.options.length >= 10}
                  onClick={() => setQForm({ ...qForm, options: [...qForm.options, { text: "", isCorrect: false }] })}
                >
                  {t("test.addOption")}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary">
                <Checkbox size="small" checked disabled sx={{ p: 0, mr: 0.5 }} /> {t("test.correct")}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setQForm(null)} color="inherit">
            {t("cancel")}
          </Button>
          <Button variant="contained" disabled={!qValid} onClick={saveQuestion}>
            {t("save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
