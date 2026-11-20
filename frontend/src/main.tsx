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
  palette: { primary: { main: "#1565c0" }, background: { default: "#f5f7fb" } },
  shape: { borderRadius: 10 },
  typography: { fontFamily: '"Roboto","Segoe UI",Arial,sans-serif', button: { textTransform: "none" } },
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
