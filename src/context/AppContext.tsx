import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Language = 'ko' | 'ja';
type Currency = 'JPY' | 'KRW';
type Theme = 'dark' | 'light';

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: (ko: string, ja: string) => string;
  formatCurrency: (amountJPY: number) => string;
}

const JPY_TO_KRW = 9.2;

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('ko');
  const [currency, setCurrency] = useState<Currency>('JPY');
  const [theme, setTheme] = useState<Theme>('light');

  const t = (ko: string, ja: string) => (lang === 'ko' ? ko : ja);

  const formatCurrency = (amountJPY: number) => {
    if (currency === 'KRW') {
      const krw = amountJPY * JPY_TO_KRW;
      if (krw >= 100_000_000) return `\u20A9${(krw / 100_000_000).toFixed(2)}\uC5B5`;
      if (krw >= 10_000) return `\u20A9${(krw / 10_000).toFixed(1)}\uB9CC`;
      return `\u20A9${Math.round(krw).toLocaleString()}`;
    }
    if (amountJPY >= 100_000_000) return `\u00A5${(amountJPY / 100_000_000).toFixed(2)}\u5104`;
    if (amountJPY >= 10_000) return `\u00A5${(amountJPY / 10_000).toFixed(1)}\u4E07`;
    return `\u00A5${amountJPY.toLocaleString()}`;
  };

  return (
    <AppContext.Provider
      value={{ lang, setLang, currency, setCurrency, theme, setTheme, t, formatCurrency }}
    >
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
