import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

void i18n.use(initReactI18next).init({
  resources,
  lng: "vi",
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  if (language !== "vi") {
    void i18n.changeLanguage("vi");
    return;
  }
  window.localStorage.setItem("badguy_lang", "vi");
});

window.localStorage.setItem("badguy_lang", "vi");

export default i18n;
