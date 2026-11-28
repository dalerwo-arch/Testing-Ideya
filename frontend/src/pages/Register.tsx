import { FormEvent, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
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
                  {t("register")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("appName")}
                </Typography>
              </Box>
            </Stack>
            <LanguageSwitch />
          </Stack>

          {done ? (
            <Stack spacing={2.5}>
              <Alert severity="success">{t("registerDone")}</Alert>
              <Button component={RouterLink} to="/login" variant="contained" size="large" sx={{ py: 1.3 }}>
                {t("login")}
              </Button>
            </Stack>
          ) : (
            <form onSubmit={submit}>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  label={t("fullName")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  fullWidth
                  inputProps={{ minLength: 2 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label={t("email")}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
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
                  inputProps={{ minLength: 6 }}
                  autoComplete="new-password"
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
                <TextField
                  select
                  label={t("group")}
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <GroupsOutlinedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    },
                  }}
                >
                  <MenuItem value="">{t("noGroup")}</MenuItem>
                  {groups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ py: 1.35, fontSize: "0.95rem" }}>
                  {t("register")}
                </Button>
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ pt: 0.5 }}>
                  {t("haveAccount")}{" "}
                  <Link component={RouterLink} to="/login" fontWeight={600} underline="hover">
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
