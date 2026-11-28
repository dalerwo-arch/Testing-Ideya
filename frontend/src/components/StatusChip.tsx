import { Box, Chip } from "@mui/material";
import { useI18n } from "../i18n/I18nContext";

interface StyleToken {
  bg: string;
  color: string;
  dot: string;
}

const styles: Record<string, StyleToken> = {
  ACTIVE: { bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
  PENDING: { bg: "#fef3c7", color: "#b45309", dot: "#d97706" },
  REJECTED: { bg: "#fee2e2", color: "#b91c1c", dot: "#dc2626" },
  LOCKED: { bg: "#fee2e2", color: "#b91c1c", dot: "#dc2626" },
  SUBMITTED: { bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
  IN_PROGRESS: { bg: "#e0f2fe", color: "#0369a1", dot: "#0284c7" },
  EXITED: { bg: "#fef3c7", color: "#b45309", dot: "#d97706" },
  EXPIRED: { bg: "#fef3c7", color: "#b45309", dot: "#d97706" },
  TERMINATED: { bg: "#fee2e2", color: "#b91c1c", dot: "#dc2626" },
};

const fallback: StyleToken = { bg: "#f1f5f9", color: "#475569", dot: "#64748b" };

export default function StatusChip({ kind, value }: { kind: "status" | "attempt"; value: string }) {
  const { t } = useI18n();
  const s = styles[value] || fallback;
  return (
    <Chip
      size="small"
      icon={
        <Box
          component="span"
          sx={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            bgcolor: s.dot,
            ml: "8px !important",
          }}
        />
      }
      label={t(`${kind}.${value}`)}
      sx={{
        bgcolor: s.bg,
        color: s.color,
        fontWeight: 600,
        fontSize: "0.75rem",
        height: 26,
        borderRadius: "999px",
        "& .MuiChip-label": { px: 1.25, pl: 0.75 },
      }}
    />
  );
}
