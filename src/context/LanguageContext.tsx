import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  DEFAULT_LANGUAGE_CODE,
  INDIAN_LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage,
} from "../config/languages";

type LanguageContextValue = {
  currentLanguage: string;
  currentLanguageMeta: SupportedLanguage;
  languages: SupportedLanguage[];
  ready: boolean;
  setLanguage: (languageCode: string) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const GOOGLE_TRANSLATE_SCRIPT_ID = "google-translate-script";
const GOOGLE_TRANSLATE_HOST_ID = "google_translate_element";

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: new (
          options: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay?: boolean;
            layout?: unknown;
          },
          elementId: string,
        ) => unknown;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

const getLanguageMeta = (languageCode: string) =>
  INDIAN_LANGUAGE_OPTIONS.find((language) => language.code === languageCode) ??
  INDIAN_LANGUAGE_OPTIONS[0];

const getTranslateCode = (languageCode: string) => {
  const language = getLanguageMeta(languageCode);
  return language.translateCode ?? DEFAULT_LANGUAGE_CODE;
};

const buildTranslateCookie = (languageCode: string) => `/en/${getTranslateCode(languageCode)}`;

const setTranslateCookie = (languageCode: string) => {
  const cookieValue = buildTranslateCookie(languageCode);
  const hostname = window.location.hostname;
  const cookieBase = `${cookieValue};path=/;max-age=31536000`;

  document.cookie = `googtrans=${cookieBase}`;

  if (hostname.includes(".")) {
    document.cookie = `googtrans=${cookieBase};domain=.${hostname}`;
  }
};

const syncTranslateSelect = (languageCode: string) => {
  const translateSelect = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  const translateCode = getTranslateCode(languageCode);

  if (!translateSelect) {
    return false;
  }

  if (translateSelect.value !== translateCode) {
    translateSelect.value = translateCode;
    translateSelect.dispatchEvent(new Event("change"));
  }

  return true;
};

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const [currentLanguage, setCurrentLanguage] = useState(DEFAULT_LANGUAGE_CODE);
  const [ready, setReady] = useState(false);
  const pendingLanguageRef = useRef(DEFAULT_LANGUAGE_CODE);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? DEFAULT_LANGUAGE_CODE;
    const nextLanguage = getLanguageMeta(storedLanguage).code;

    pendingLanguageRef.current = nextLanguage;
    setCurrentLanguage(nextLanguage);
    setTranslateCookie(nextLanguage);
    document.documentElement.lang = nextLanguage;
  }, []);

  useEffect(() => {
    if (window.google?.translate?.TranslateElement) {
      setReady(true);
      return;
    }

    const initializeGoogleTranslate = () => {
      if (!window.google?.translate?.TranslateElement) {
        return;
      }

      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: INDIAN_LANGUAGE_OPTIONS.filter((language) => language.supported)
            .map((language) => language.translateCode ?? language.code)
            .join(","),
          autoDisplay: false,
        },
        GOOGLE_TRANSLATE_HOST_ID,
      );

      setReady(true);
    };

    window.googleTranslateElementInit = initializeGoogleTranslate;

    if (!document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      delete window.googleTranslateElementInit;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const targetLanguage = pendingLanguageRef.current;
    let attempts = 0;

    const applySelection = () => {
      attempts += 1;
      const applied = syncTranslateSelect(targetLanguage);

      if (applied || attempts >= 25) {
        return;
      }

      window.setTimeout(applySelection, 250);
    };

    applySelection();
  }, [ready, currentLanguage]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      currentLanguage,
      currentLanguageMeta: getLanguageMeta(currentLanguage),
      languages: INDIAN_LANGUAGE_OPTIONS,
      ready,
      setLanguage: (languageCode: string) => {
        const nextLanguage = getLanguageMeta(languageCode).code;
        const nextLanguageMeta = getLanguageMeta(nextLanguage);

        pendingLanguageRef.current = nextLanguage;
        setCurrentLanguage(nextLanguage);
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        setTranslateCookie(nextLanguage);
        document.documentElement.lang = nextLanguageMeta.translateCode ?? DEFAULT_LANGUAGE_CODE;

        if (ready && nextLanguageMeta.supported) {
          syncTranslateSelect(nextLanguage);
        }
      },
    }),
    [currentLanguage, ready],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <div id={GOOGLE_TRANSLATE_HOST_ID} className="sr-only" aria-hidden="true" />
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
};
