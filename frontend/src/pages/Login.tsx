import { FormEvent, useEffect, useRef, useState } from "react";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { ApiError, get } from "../api/client";
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
  const [showPassword, setShowPassword] = useState(false);
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
    <Box className="auth-backdrop" sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Card
        sx={{
          width: "100%",
          maxWidth: 440,
          borderRadius: 4,
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  boxShadow: "0 6px 16px rgba(37, 99, 235, 0.28)",
                }}
              >
                <SchoolRoundedIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                  {t("appName")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("login")}
                </Typography>
              </Box>
            </Stack>
            <LanguageSwitch />
          </Stack>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              mb: 3,
              bgcolor: "#f1f5f9",
              borderRadius: "12px",
              p: "4px",
              minHeight: 42,
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": {
                minHeight: 36,
                borderRadius: "9px",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.875rem",
                color: "#64748b",
              },
              "& .Mui-selected": {
                bgcolor: "#ffffff",
                color: "#0f172a !important",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.1)",
              },
            }}
          >
            <Tab value="student" label={t("loginAsStudent")} />
            <Tab value="admin" label={t("loginAsAdmin")} />
          </Tabs>

          <form onSubmit={submit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label={t("email")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoComplete="username"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label={t("password")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                autoComplete="current-password"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
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
              <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ py: 1.35, fontSize: "0.95rem" }}>
                {t("login")}
              </Button>
            </Stack>
          </form>

          {tab === "student" && (
            <>
              {googleId && navigator.onLine && (
                <>
                  <Divider sx={{ my: 2.5 }}>{t("or")}</Divider>
                  <Box sx={{ display: "flex", justifyContent: "center" }} ref={googleRef} />
                </>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2.5, textAlign: "center" }}>
                {t("noAccount")}{" "}
                <Link component={RouterLink} to="/register" fontWeight={600} underline="hover">
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
