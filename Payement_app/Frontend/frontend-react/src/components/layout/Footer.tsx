import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation(); //i18n variable declaration

  return (
    <footer className="text-center py-3 text-primary bg-light">
      2025 {t("app.footer")}
    </footer>
  );
}
