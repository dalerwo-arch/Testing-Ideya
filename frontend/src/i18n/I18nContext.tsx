import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Lang, ru, tg } from "./dict";

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  errorText: (code?: string) => string;
}

const Ctx = createContext<I18nValue>(null as unknown as I18nValue);
const STORAGE_KEY = "exam.lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "tg" || saved === "ru") return saved;
  } catch {
    /* ignore */
  }
  return "tg";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === "tg" ? "tg" : "ru";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const dict = lang === "tg" ? tg : ru;
    const t = (key: string, vars?: Record<string, string | number>) => {
      let s = dict[key] ?? tg[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    };
    const errorText = (code?: string) => (code && dict[`err.${code}`]) || dict["err.UNKNOWN"];
    return { lang, setLang, t, errorText };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
