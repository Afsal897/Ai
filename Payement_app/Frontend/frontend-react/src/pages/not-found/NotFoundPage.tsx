import { Container } from "react-bootstrap";
import { ArrowBarLeft } from "react-bootstrap-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  const { t } = useTranslation(); //i18n variable declaration

  return (
    <Container className="vh-100 d-flex flex-column justify-content-center align-items-center text-center">
      <h1 className="display-1 fw-bold">404</h1>
      <h2 className="fw-semibold mb-3">{t("pageNotFound.title")}</h2>
      <p className="text-muted mb-4">{t("pageNotFound.text")}</p>
      <Link to={"/"} className="link">
        <ArrowBarLeft className="me-2" />
        {t("pageNotFound.link.back")}
      </Link>
    </Container>
  );
}
