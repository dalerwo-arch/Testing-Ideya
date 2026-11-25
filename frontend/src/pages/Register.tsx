import { FormEvent, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, IconButton, InputAdornment, Link, MenuItem, Stack, TextField, Typography } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { ApiError, get, post } from "../api/client";
import type { Group } from "../api/types";
import { useI18n } from "../i18n/I18nContext";
import LanguageSwitch from "../components/LanguageSwitch";

export default function Register() {
  const { t, errorText } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get<Group[]>("/auth/groups").then(setGroups).catch(() => undefined);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await post("/auth/register", { fullName, email, password, groupId: groupId || null });
      setDone(true);
    } catch (err) {
      setError(errorText(err instanceof ApiError ? err.code : undefined));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>
              {t("register")}
            </Typography>
            <LanguageSwitch />
          </Stack>
          {done ? (
            <Stack spacing={2}>
              <Alert severity="success">{t("registerDone")}</Alert>
              <Button component={RouterLink} to="/login" variant="contained">
                {t("login")}
              </Button>
            </Stack>
          ) : (
            <form onSubmit={submit}>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField label={t("fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} required fullWidth inputProps={{ minLength: 2 }} />
                <TextField label={t("email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
                <TextField
                  label={t("password")}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  inputProps={{ minLength: 6 }}
                  autoComplete="new-password"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField select label={t("group")} value={groupId} onChange={(e) => setGroupId(e.target.value)} fullWidth>
                  <MenuItem value="">{t("noGroup")}</MenuItem>
                  {groups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Button type="submit" variant="contained" size="large" disabled={busy}>
                  {t("register")}
                </Button>
                <Typography variant="body2" textAlign="center">
                  {t("haveAccount")}{" "}
                  <Link component={RouterLink} to="/login">
                    {t("login")}
                  </Link>
                </Typography>
              </Stack>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
