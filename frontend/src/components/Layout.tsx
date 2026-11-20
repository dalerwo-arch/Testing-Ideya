import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
import { useAuth } from "../AuthContext";
import { useI18n } from "../i18n/I18nContext";
import LanguageSwitch from "./LanguageSwitch";

const DRAWER = 240;

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
        { to: "/admin", label: t("nav.dashboard"), icon: <DashboardIcon />, end: true },
        { to: "/admin/users", label: t("nav.users"), icon: <PeopleIcon /> },
        { to: "/admin/groups", label: t("nav.groups"), icon: <GroupsIcon /> },
        { to: "/admin/tests", label: t("nav.tests"), icon: <QuizIcon /> },
        { to: "/admin/results", label: t("nav.results"), icon: <AssessmentIcon /> },
        { to: "/admin/logins", label: t("nav.logins"), icon: <HistoryIcon /> },
      ]
    : [
        { to: "/", label: t("nav.myTests"), icon: <AssignmentIcon />, end: true },
        { to: "/results", label: t("nav.myResults"), icon: <AssessmentIcon /> },
      ];

  const drawerContent = (
    <Box sx={{ width: DRAWER }} role="navigation">
      <Toolbar />
      <List>
        {items.map((it) => (
          <ListItemButton
            key={it.to}
            component={NavLink}
            to={it.to}
            end={it.end}
            onClick={() => setOpen(false)}
            sx={{ "&.active": { bgcolor: "action.selected", fontWeight: 600 } }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{it.icon}</ListItemIcon>
            <ListItemText primary={it.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: (th) => th.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop && (
            <IconButton color="inherit" edge="start" onClick={() => setOpen(true)} aria-label="menu">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontSize: { xs: 16, sm: 20 } }}>
            {t("appName")}
          </Typography>
          <LanguageSwitch light />
          {isDesktop && (
            <Typography variant="body2" sx={{ ml: 1 }}>
              {user?.fullName}
            </Typography>
          )}
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={() => {
              logout();
              nav("/login");
            }}
            sx={{ minWidth: 0 }}
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
        sx={{ width: isDesktop ? DRAWER : 0, flexShrink: 0, "& .MuiDrawer-paper": { width: DRAWER, boxSizing: "border-box" } }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
        <Toolbar />
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </Box>
    </Box>
  );
}
