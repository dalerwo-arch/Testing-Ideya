import { FormEvent, useEffect, useState } from "react";
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useAuth } from "../../AuthContext";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";
import { patch } from "../../api/client";
import type { User } from "../../api/types";

export default function StudentProfile() {
  const { user, setUser } = useAuth();
  const { t } = useI18n();
  const ui = useUi();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await patch<User>("/auth/profile", {
        fullName,
        email,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      setUser(updated);
      setCurrentPassword("");
      setNewPassword("");
      ui.success(t("profile.saved"));
    } catch (error) {
      ui.error(error);
    } finally {
      setBusy(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        {t("profile.title")}
      </Typography>
      <Card sx={{ maxWidth: 580 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2.5}>
            <Avatar
              sx={{
                width: 52,
                height: 52,
                bgcolor: "#2563eb",
                fontWeight: 700,
                fontSize: "1.1rem",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700} noWrap>
                {user?.fullName}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={0.5} flexWrap="wrap">
                <Chip size="small" label={user?.role === "ADMIN" ? t("role.ADMIN") : t("role.STUDENT")} sx={{ bgcolor: "#eff6ff", color: "#2563eb" }} />
                {user?.group?.name && <Chip size="small" variant="outlined" label={user.group.name} />}
              </Stack>
            </Box>
          </Stack>

          <Divider sx={{ mb: 2.5 }} />

          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField label={t("fullName")} value={fullName} onChange={(event) => setFullName(event.target.value)} required fullWidth />
              <TextField label={t("email")} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth />
              <Alert severity="info">{t("profile.passwordHint")}</Alert>
              <TextField
                label={t("profile.currentPassword")}
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                fullWidth
                autoComplete="current-password"
              />
              <TextField
                label={t("profile.newPassword")}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                fullWidth
                autoComplete="new-password"
              />
              <Box sx={{ pt: 0.5 }}>
                <Button type="submit" variant="contained" disabled={busy} startIcon={<SaveOutlinedIcon />} sx={{ px: 3, py: 1 }}>
                  {t("save")}
                </Button>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
