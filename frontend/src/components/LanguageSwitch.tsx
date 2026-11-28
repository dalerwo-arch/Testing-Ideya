import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useI18n } from "../i18n/I18nContext";

export default function LanguageSwitch({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={lang}
      onChange={(_, v) => v && setLang(v)}
      sx={
        light
          ? {
              bgcolor: "rgba(255,255,255,0.12)",
              borderRadius: "10px",
              p: "2px",
              "& .MuiToggleButton-root": {
                color: "rgba(255,255,255,0.85)",
                border: 0,
                borderRadius: "8px !important",
                px: 1.25,
                py: 0.35,
                fontSize: "0.75rem",
                fontWeight: 600,
              },
              "& .Mui-selected": {
                bgcolor: "#ffffff !important",
                color: "#1d4ed8 !important",
              },
            }
          : {
              bgcolor: "#f1f5f9",
              borderRadius: "10px",
              p: "3px",
              "& .MuiToggleButton-root": {
                color: "#475569",
                border: 0,
                borderRadius: "8px !important",
                px: 1.25,
                py: 0.35,
                fontSize: "0.75rem",
                fontWeight: 600,
              },
              "& .Mui-selected": {
                bgcolor: "#ffffff !important",
                color: "#2563eb !important",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
              },
            }
      }
    >
      <ToggleButton value="tg">TJ</ToggleButton>
      <ToggleButton value="ru">RU</ToggleButton>
    </ToggleButtonGroup>
  );
}
