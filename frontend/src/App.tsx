import { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentTests from "./pages/student/StudentTests";
import StudentResults from "./pages/student/StudentResults";
import ExamPage from "./pages/student/ExamPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminGroups from "./pages/admin/AdminGroups";
import AdminTests from "./pages/admin/AdminTests";
import AdminTestEditor from "./pages/admin/AdminTestEditor";
import AdminResults from "./pages/admin/AdminResults";
import AdminLogins from "./pages/admin/AdminLogins";

function Guard({ role, children, bare = false }: { role: "STUDENT" | "ADMIN"; children: ReactNode; bare?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/"} replace />;
  return bare ? <>{children}</> : <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<Guard role="STUDENT"><StudentTests /></Guard>} />
      <Route path="/results" element={<Guard role="STUDENT"><StudentResults /></Guard>} />
      <Route path="/exam/:testId" element={<Guard role="STUDENT" bare><ExamPage /></Guard>} />

      <Route path="/admin" element={<Guard role="ADMIN"><AdminDashboard /></Guard>} />
      <Route path="/admin/users" element={<Guard role="ADMIN"><AdminUsers /></Guard>} />
      <Route path="/admin/groups" element={<Guard role="ADMIN"><AdminGroups /></Guard>} />
      <Route path="/admin/tests" element={<Guard role="ADMIN"><AdminTests /></Guard>} />
      <Route path="/admin/tests/:id" element={<Guard role="ADMIN"><AdminTestEditor /></Guard>} />
      <Route path="/admin/results" element={<Guard role="ADMIN"><AdminResults /></Guard>} />
      <Route path="/admin/logins" element={<Guard role="ADMIN"><AdminLogins /></Guard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
