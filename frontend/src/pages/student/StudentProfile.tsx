import { FormEvent, useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
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

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        {t("profile.title")}
      </Typography>
      <Card sx={{ maxWidth: 560 }}>
        <CardContent>
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
              <Button type="submit" variant="contained" disabled={busy}>
                {t("save")}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
