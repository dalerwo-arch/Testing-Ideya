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
      sx={light ? { "& .MuiToggleButton-root": { color: "#fff", borderColor: "rgba(255,255,255,.5)", py: 0.2 }, "& .Mui-selected": { bgcolor: "rgba(255,255,255,.25) !important" } } : { "& .MuiToggleButton-root": { py: 0.2 } }}
    >
      <ToggleButton value="tg">TJ</ToggleButton>
      <ToggleButton value="ru">RU</ToggleButton>
    </ToggleButtonGroup>
  );
}
