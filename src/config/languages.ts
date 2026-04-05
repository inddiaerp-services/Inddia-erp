export type SupportedLanguage = {
  code: string;
  label: string;
  nativeLabel: string;
  translateCode?: string;
  supported: boolean;
};

export const DEFAULT_LANGUAGE_CODE = "en";

export const INDIAN_LANGUAGE_OPTIONS: SupportedLanguage[] = [
  { code: "en", translateCode: "en", label: "English", nativeLabel: "English", supported: true },
  { code: "hi", translateCode: "hi", label: "Hindi", nativeLabel: "हिन्दी", supported: true },
  { code: "bn", translateCode: "bn", label: "Bengali", nativeLabel: "বাংলা", supported: true },
  { code: "te", translateCode: "te", label: "Telugu", nativeLabel: "తెలుగు", supported: true },
  { code: "mr", translateCode: "mr", label: "Marathi", nativeLabel: "मराठी", supported: true },
  { code: "ta", translateCode: "ta", label: "Tamil", nativeLabel: "தமிழ்", supported: true },
  { code: "ur", translateCode: "ur", label: "Urdu", nativeLabel: "اردو", supported: true },
  { code: "gu", translateCode: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી", supported: true },
  { code: "kn", translateCode: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", supported: true },
  { code: "ml", translateCode: "ml", label: "Malayalam", nativeLabel: "മലയാളം", supported: true },
  { code: "or", translateCode: "or", label: "Odia", nativeLabel: "ଓଡ଼ିଆ", supported: true },
  { code: "pa", translateCode: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ", supported: true },
  { code: "as", translateCode: "as", label: "Assamese", nativeLabel: "অসমীয়া", supported: true },
  { code: "mai", label: "Maithili", nativeLabel: "मैथिली", supported: false },
  { code: "sat", label: "Santali", nativeLabel: "ᱥᱟᱱᱛᱟᱲᱤ", supported: false },
  { code: "ks", label: "Kashmiri", nativeLabel: "कॉशुर / کٲشُر", supported: false },
  { code: "ne", translateCode: "ne", label: "Nepali", nativeLabel: "नेपाली", supported: true },
  { code: "gom", label: "Konkani", nativeLabel: "कोंकणी", supported: false },
  { code: "sd", label: "Sindhi", nativeLabel: "सिन्धी / سنڌي", supported: false },
  { code: "doi", label: "Dogri", nativeLabel: "डोगरी", supported: false },
  { code: "mni", label: "Manipuri", nativeLabel: "মৈতৈলোন্", supported: false },
  { code: "brx", label: "Bodo", nativeLabel: "बर'", supported: false },
  { code: "tcy", label: "Tulu", nativeLabel: "ತುಳು", supported: false },
  { code: "bho", label: "Bhojpuri", nativeLabel: "भोजपुरी", supported: false },
  { code: "raj", label: "Rajasthani", nativeLabel: "राजस्थानी", supported: false },
  { code: "gbm", label: "Garhwali", nativeLabel: "गढ़वळी", supported: false },
  { code: "kfy", label: "Kumaoni", nativeLabel: "कुमाऊँनी", supported: false },
  { code: "gon", label: "Gondi", nativeLabel: "गोंडी", supported: false },
  { code: "khr", label: "Kharia", nativeLabel: "खड़िया", supported: false },
  { code: "hoc", label: "Ho", nativeLabel: "हो", supported: false },
  { code: "kru", label: "Kurukh", nativeLabel: "कुड़ुख", supported: false },
  { code: "lus", label: "Mizo", nativeLabel: "Mizo tawng", supported: false },
  { code: "kha", label: "Khasi", nativeLabel: "Khasi", supported: false },
  { code: "nica", label: "Nicobarese", nativeLabel: "Nicobarese", supported: false },
];

export const LANGUAGE_STORAGE_KEY = "inddia-erp-language";
