import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

const savedLanguage = window.localStorage.getItem("badguy_lang");
const browserLanguage = navigator.language?.toLowerCase().startsWith("en")
  ? "en"
  : "vi";

void i18n.use(initReactI18next).init({
  resources,
  lng:
    savedLanguage === "en" || savedLanguage === "vi"
      ? savedLanguage
      : browserLanguage,
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  window.localStorage.setItem("badguy_lang", language);
});

export default i18n;
