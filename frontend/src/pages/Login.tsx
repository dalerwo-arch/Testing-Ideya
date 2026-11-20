import { FormEvent, useEffect, useRef, useState } from "react";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardContent, Divider, Link, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { get } from "../api/client";
import { ApiError } from "../api/client";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n/I18nContext";
import LanguageSwitch from "../components/LanguageSwitch";

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login() {
  const { user, login, loginGoogle } = useAuth();
  const { t, errorText } = useI18n();
  const nav = useNavigate();
  const [tab, setTab] = useState<"student" | "admin">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleId, setGoogleId] = useState<string | null>(null);
  const googleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    get<{ googleClientId: string | null }>("/auth/config")
      .then((c) => setGoogleId(c.googleClientId))
      .catch(() => undefined);
  }, []);

  // Google танҳо ҳангоми дастрас будани интернет бор мешавад
  useEffect(() => {
    if (!googleId || tab !== "student" || !navigator.onLine) return;
    const init = () => {
      if (!window.google || !googleRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleId,
        callback: async (resp: { credential: string }) => {
          try {
            setError(null);
            const u = await loginGoogle(resp.credential);
            nav(u.role === "ADMIN" ? "/admin" : "/", { replace: true });
          } catch (e) {
            setError(errorText(e instanceof ApiError ? e.code : undefined));
          }
        },
      });
      googleRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleRef.current, { theme: "outline", size: "large", width: 280 });
    };
    if (window.google) {
      init();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = init;
    s.onerror = () => undefined;
    document.head.appendChild(s);
  }, [googleId, tab, loginGoogle, nav, errorText]);

  if (user) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/"} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email, password, tab);
      nav(u.role === "ADMIN" ? "/admin" : "/", { replace: true });
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
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" fontWeight={700}>
              {t("appName")}
            </Typography>
            <LanguageSwitch />
          </Stack>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
            <Tab value="student" label={t("loginAsStudent")} />
            <Tab value="admin" label={t("loginAsAdmin")} />
          </Tabs>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField label={t("email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth autoComplete="username" />
              <TextField label={t("password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth autoComplete="current-password" />
              <Button type="submit" variant="contained" size="large" disabled={busy}>
                {t("login")}
              </Button>
            </Stack>
          </form>
          {tab === "student" && (
            <>
              {googleId && navigator.onLine && (
                <>
                  <Divider sx={{ my: 2 }}>{t("or")}</Divider>
                  <Box sx={{ display: "flex", justifyContent: "center" }} ref={googleRef} />
                </>
              )}
              <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
                {t("noAccount")}{" "}
                <Link component={RouterLink} to="/register">
                  {t("register")}
                </Link>
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
