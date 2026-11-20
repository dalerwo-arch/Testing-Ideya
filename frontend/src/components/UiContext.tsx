import { createContext, ReactNode, useCallback, useContext, useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, Snackbar } from "@mui/material";
import { useI18n } from "../i18n/I18nContext";
import { ApiError } from "../api/client";

interface UiValue {
  success: (msg: string) => void;
  error: (e: unknown) => void;
  confirm: (message: string) => Promise<boolean>;
}

const Ctx = createContext<UiValue>(null as unknown as UiValue);

export function UiProvider({ children }: { children: ReactNode }) {
  const { t, errorText } = useI18n();
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);
  const [dialog, setDialog] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const success = useCallback((msg: string) => setToast({ msg, severity: "success" }), []);
  const error = useCallback(
    (e: unknown) => setToast({ msg: errorText(e instanceof ApiError ? e.code : undefined), severity: "error" }),
    [errorText]
  );
  const confirm = useCallback(
    (message: string) => new Promise<boolean>((resolve) => setDialog({ message, resolve })),
    []
  );

  const answer = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ success, error, confirm }}>
      {children}
      <Snackbar
        open={!!toast}
        autoHideDuration={4500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: "100%" }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
      <Dialog open={!!dialog} onClose={() => answer(false)} fullWidth maxWidth="xs">
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: "pre-line", pt: 2 }}>{dialog?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => answer(false)}>{t("cancel")}</Button>
          <Button onClick={() => answer(true)} variant="contained" autoFocus>
            {t("yes")}
          </Button>
        </DialogActions>
      </Dialog>
    </Ctx.Provider>
  );
}

export const useUi = () => useContext(Ctx);
