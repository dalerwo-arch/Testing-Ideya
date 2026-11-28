import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, CardActionArea, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import { get } from "../../api/client";
import { useI18n } from "../../i18n/I18nContext";
import { useUi } from "../../components/UiContext";

interface Stats {
  students: number;
  pending: number;
  locked: number;
  tests: number;
  attempts: number;
  groups: number;
}

const meta: Record<keyof Stats, { icon: ReactNode; color: string; bg: string; to: string }> = {
  students: { icon: <PeopleOutlineIcon />, color: "#2563eb", bg: "#eff6ff", to: "/admin/users" },
  pending: { icon: <HourglassTopIcon />, color: "#d97706", bg: "#fef3c7", to: "/admin/users" },
  locked: { icon: <LockOutlinedIcon />, color: "#dc2626", bg: "#fee2e2", to: "/admin/users" },
  groups: { icon: <GroupsOutlinedIcon />, color: "#4f46e5", bg: "#eef2ff", to: "/admin/groups" },
  tests: { icon: <QuizOutlinedIcon />, color: "#0284c7", bg: "#e0f2fe", to: "/admin/tests" },
  attempts: { icon: <AssignmentTurnedInOutlinedIcon />, color: "#16a34a", bg: "#dcfce7", to: "/admin/results" },
};

export default function AdminDashboard() {
  const { t } = useI18n();
  const ui = useUi();
  const nav = useNavigate();
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    get<Stats>("/admin/stats").then(setS).catch(ui.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!s) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const keys: (keyof Stats)[] = ["students", "pending", "locked", "groups", "tests", "attempts"];
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        {t("nav.dashboard")}
      </Typography>
      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(3, 1fr)" } }}>
        {keys.map((k) => {
          const m = meta[k];
          const highlight = (k === "pending" || k === "locked") && s[k] > 0;
          return (
            <Card
              key={k}
              sx={{
                borderColor: highlight ? m.color : undefined,
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
                },
              }}
            >
              <CardActionArea onClick={() => nav(m.to)} sx={{ height: "100%" }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" fontWeight={600} mb={1}>
                        {t(`admin.stats.${k}`)}
                      </Typography>
                      <Typography
                        variant="h3"
                        fontWeight={800}
                        sx={{
                          fontVariantNumeric: "tabular-nums",
                          color: highlight ? m.color : "text.primary",
                          fontSize: { xs: "1.85rem", sm: "2.25rem" },
                        }}
                      >
                        {s[k]}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        bgcolor: m.bg,
                        color: m.color,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {m.icon}
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
