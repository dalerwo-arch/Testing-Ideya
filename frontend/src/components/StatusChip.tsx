import { Chip } from "@mui/material";
import { useI18n } from "../i18n/I18nContext";

const colors: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  ACTIVE: "success",
  PENDING: "warning",
  REJECTED: "error",
  LOCKED: "error",
  SUBMITTED: "success",
  IN_PROGRESS: "info",
  EXITED: "warning",
  EXPIRED: "warning",
  TERMINATED: "error",
};

export default function StatusChip({ kind, value }: { kind: "status" | "attempt"; value: string }) {
  const { t } = useI18n();
  return <Chip size="small" label={t(`${kind}.${value}`)} color={colors[value] || "default"} />;
}
