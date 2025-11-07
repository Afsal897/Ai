import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./resources/en.json";
import jp from "./resources/jp.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      jp: { translation: jp },
    },
    fallbackLng: "en", //default lang
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
