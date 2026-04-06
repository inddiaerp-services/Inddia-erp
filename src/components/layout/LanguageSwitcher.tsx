import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

type LanguageSwitcherProps = {
  dark?: boolean;
};

const GlobeIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15.3 15.3 0 0 1 0 18" />
    <path d="M12 3a15.3 15.3 0 0 0 0 18" />
  </svg>
);

export const LanguageSwitcher = ({ dark = false }: LanguageSwitcherProps) => {
  const { currentLanguage, currentLanguageMeta, languages, ready, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
    };
  }, []);

  const triggerClassName = dark
    ? "landing-language-trigger"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  const panelClassName = dark
    ? "landing-language-panel"
    : "border-slate-200 bg-white text-slate-900 shadow-2xl";
  const inactiveTextClassName = dark ? "landing-language-muted" : "text-slate-500";
  const activeClassName = dark
    ? "landing-language-option-active"
    : "border-blue-200 bg-blue-50 text-blue-700";
  const inactiveClassName = dark
    ? "landing-language-option"
    : "border-transparent hover:bg-slate-50";

  return (
    <div ref={rootRef} className={`relative ${dark ? "landing-language-root" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition ${triggerClassName}`}
        aria-label="Choose language"
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Language: ${currentLanguageMeta.label}`}
      >
        <GlobeIcon />
      </button>

      {open ? (
        <div
          className={`absolute right-0 top-14 z-40 w-[min(92vw,19rem)] rounded-[1.5rem] border p-3 ${panelClassName}`}
          role="menu"
          aria-label="Language options"
        >
          <div className="mb-3 px-1">
            <p className="text-sm font-semibold">Languages</p>
            <p className={`text-xs ${inactiveTextClassName}`}>
              {ready
                ? `Current: ${currentLanguageMeta.label}. Choose the language for the full website.`
                : "Loading translation options..."}
            </p>
          </div>

          <div className="max-h-[20rem] space-y-1 overflow-y-auto">
            {languages.map((language) => {
              const active = language.code === currentLanguage;

              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => {
                    if (!language.supported) {
                      return;
                    }
                    setLanguage(language.code);
                    setOpen(false);
                  }}
                  disabled={!language.supported}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition ${
                    active ? activeClassName : inactiveClassName
                  }`}
                  role="menuitemradio"
                  aria-checked={active}
                >
                  <span>
                    <span className="block text-sm font-semibold">{language.nativeLabel}</span>
                    <span className={`block text-xs ${active ? "" : inactiveTextClassName}`}>{language.label}</span>
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em]">
                    {active ? "Active" : language.supported ? "" : "Unavailable"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LanguageSwitcher;
