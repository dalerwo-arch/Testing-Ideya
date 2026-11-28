import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import GroupsIcon from "@mui/icons-material/Groups";
import QuizIcon from "@mui/icons-material/Quiz";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HistoryIcon from "@mui/icons-material/History";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonIcon from "@mui/icons-material/Person";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n/I18nContext";
import LanguageSwitch from "./LanguageSwitch";

const DRAWER = 240;

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0].slice(0, 2).toUpperCase();
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [open, setOpen] = useState(false);

  const admin = user?.role === "ADMIN";
  const items = admin
    ? [
        { to: "/admin", label: t("nav.dashboard"), icon: <DashboardIcon fontSize="small" />, end: true },
        { to: "/admin/users", label: t("nav.users"), icon: <PeopleIcon fontSize="small" /> },
        { to: "/admin/groups", label: t("nav.groups"), icon: <GroupsIcon fontSize="small" /> },
        { to: "/admin/tests", label: t("nav.tests"), icon: <QuizIcon fontSize="small" /> },
        { to: "/admin/results", label: t("nav.results"), icon: <AssessmentIcon fontSize="small" /> },
        { to: "/admin/logins", label: t("nav.logins"), icon: <HistoryIcon fontSize="small" /> },
        { to: "/profile", label: t("nav.profile"), icon: <PersonIcon fontSize="small" /> },
      ]
    : [
        { to: "/", label: t("nav.myTests"), icon: <AssignmentIcon fontSize="small" />, end: true },
        { to: "/results", label: t("nav.myResults"), icon: <AssessmentIcon fontSize="small" /> },
        { to: "/profile", label: t("nav.profile"), icon: <PersonIcon fontSize="small" /> },
      ];

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  const drawerContent = (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflowX: "hidden" }} role="navigation">
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2, minHeight: 64, py: 1 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "10px",
            background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
            display: "grid",
            placeItems: "center",
            color: "#fff",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
          }}
        >
          <SchoolRoundedIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} lineHeight={1.2} sx={{ fontSize: "0.875rem" }}>
            {t("appName")}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {admin ? t("role.ADMIN") : t("role.STUDENT")}
          </Typography>
        </Box>
      </Stack>

      <Divider />

      <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
        <List sx={{ px: 1.25, py: 1.5 }}>
          {items.map((it) => (
            <ListItemButton
              key={it.to}
              component={NavLink}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              sx={{
                borderRadius: "10px",
                px: 1.5,
                py: 0.85,
                mb: 0.5,
                color: "#475569",
                "& .MuiListItemIcon-root": { minWidth: 34, color: "#64748b" },
                "&:hover": { bgcolor: "#f1f5f9", color: "#0f172a" },
                "&.active": {
                  bgcolor: "#eff6ff",
                  color: "#2563eb",
                  "& .MuiListItemIcon-root": { color: "#2563eb" },
                  "& .MuiListItemText-primary": { fontWeight: 600 },
                },
              }}
            >
              <ListItemIcon>{it.icon}</ListItemIcon>
              <ListItemText primary={it.label} primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 500 }} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider />

      <Box sx={{ p: 1.25 }}>
        <Stack
          direction="row"
          spacing={1.25}
          alignItems="center"
          sx={{ p: 1, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: "#2563eb", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>
            {getInitials(user?.fullName)}
          </Avatar>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="body2" fontWeight={600} noWrap fontSize="0.825rem">
              {user?.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {user?.group?.name || (admin ? t("role.ADMIN") : t("noGroup"))}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", width: "100%", maxWidth: "100%", overflowX: "hidden", bgcolor: "#f8fafc" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: isDesktop ? `calc(100% - ${DRAWER}px)` : "100%",
          ml: isDesktop ? `${DRAWER}px` : 0,
          bgcolor: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(10px)",
          color: "text.primary",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Toolbar sx={{ gap: 1.5, minHeight: "64px !important" }}>
          {!isDesktop && (
            <IconButton color="inherit" edge="start" onClick={() => setOpen(true)} aria-label="menu">
              <MenuIcon />
            </IconButton>
          )}
          {!isDesktop && (
            <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ flexGrow: 1 }}>
              {t("appName")}
            </Typography>
          )}
          {isDesktop && <Box sx={{ flexGrow: 1 }} />}

          <LanguageSwitch />

          {isDesktop && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 1 }}>
              <Avatar sx={{ width: 30, height: 30, bgcolor: "#eff6ff", color: "#2563eb", fontSize: "0.75rem", fontWeight: 700 }}>
                {getInitials(user?.fullName)}
              </Avatar>
              <Typography variant="body2" fontWeight={600}>
                {user?.fullName}
              </Typography>
            </Stack>
          )}

          <Button
            color="inherit"
            variant="outlined"
            size="small"
            startIcon={<LogoutIcon fontSize="small" />}
            onClick={handleLogout}
            sx={{
              minWidth: 0,
              px: isDesktop ? 1.5 : 1,
              borderColor: "#e2e8f0",
              color: "#475569",
              "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc", color: "#dc2626" },
            }}
          >
            {isDesktop ? t("logout") : ""}
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? "permanent" : "temporary"}
        open={isDesktop ? true : open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isDesktop ? DRAWER : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER,
            boxSizing: "border-box",
            borderRight: "1px solid #e2e8f0",
            bgcolor: "#ffffff",
            overflowX: "hidden",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, width: "100%", p: { xs: 2, sm: 3 }, minWidth: 0, overflowX: "hidden" }}>
        <Toolbar sx={{ minHeight: "64px !important" }} />
        <Box sx={{ mx: "auto", width: "100%", maxWidth: 1200, minWidth: 0 }}>{children}</Box>
      </Box>
    </Box>
  );
}
