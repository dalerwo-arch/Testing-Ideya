import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";
import { I18nProvider } from "./i18n/I18nContext";
import { AuthProvider } from "./AuthContext";
import { UiProvider } from "./components/UiContext";
import "./index.css";

const theme = createTheme({
  palette: {
    primary: { main: "#2563eb", dark: "#1d4ed8", light: "#eff6ff" },
    secondary: { main: "#4f46e5" },
    success: { main: "#16a34a" },
    warning: { main: "#d97706" },
    error: { main: "#dc2626" },
    info: { main: "#0284c7" },
    background: { default: "#f8fafc", paper: "#ffffff" },
    text: { primary: "#0f172a", secondary: "#64748b" },
    divider: "#e2e8f0",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter","Segoe UI",system-ui,-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif',
    h5: { fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" },
    h6: { fontWeight: 700, letterSpacing: "-0.01em" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": {
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
        },
        body: {
          backgroundColor: "#f8fafc",
          color: "#0f172a",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        elevation1: {
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 14px rgba(15, 23, 42, 0.04)",
          border: "1px solid #e2e8f0",
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04), 0 6px 20px rgba(15, 23, 42, 0.03)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        containedPrimary: {
          backgroundColor: "#2563eb",
          "&:hover": { backgroundColor: "#1d4ed8" },
        },
        outlined: {
          borderColor: "#cbd5e1",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "#ffffff",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#cbd5e1",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#94a3b8",
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          width: "100%",
          maxWidth: "100%",
          overflowX: "hidden",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          width: "100%",
          tableLayout: "auto",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#f8fafc",
          "& .MuiTableCell-head": {
            color: "#475569",
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            borderBottom: "1px solid #e2e8f0",
            paddingTop: 12,
            paddingBottom: 12,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          overflowWrap: "anywhere",
        },
        body: {
          borderBottom: "1px solid #f1f5f9",
          paddingTop: 11,
          paddingBottom: 11,
          color: "#1e293b",
        },
        sizeSmall: {
          paddingLeft: 10,
          paddingRight: 10,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: 0 },
          "&.MuiTableRow-hover:hover": { backgroundColor: "#f8fafc" },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.14)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: "1.125rem", paddingBottom: 8 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <I18nProvider>
        <UiProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </UiProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// PWA: Service Worker танҳо дар HTTPS ё localhost кор мекунад.
if ("serviceWorker" in navigator && window.isSecureContext && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
