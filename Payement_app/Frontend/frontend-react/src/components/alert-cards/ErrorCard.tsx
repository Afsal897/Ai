import { isAuthenticated } from "@/utils/tokenUtils";
import { Card } from "react-bootstrap";
import { ArrowBarLeft, ExclamationCircleFill } from "react-bootstrap-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function ErrorCard() {
  const { t } = useTranslation(); //defining the localization variable
  const isLoggedIn = isAuthenticated(); // checks Authenticayed user or not
  const redirectedPath = isLoggedIn ? "/user-profile" : "/login"; //Defining the redirected path

  return (
    <Card className="container mt-5" style={{ maxWidth: 458 }}>
      <Card.Body className="text-center">
        <Card.Title className="text-primary">
          <ExclamationCircleFill size={60} color="red" />
        </Card.Title>
        <Card.Subtitle className="text-center">
          {t("errorCard.title")}
        </Card.Subtitle>

        <Card.Text>{t("errorCard.text")}</Card.Text>

        <Link to={redirectedPath} className="link">
          <ArrowBarLeft />{" "}
          {isLoggedIn
            ? t("errorCard.link.backToProfile")
            : t("errorCard.link.backToLogin")}
        </Link>
      </Card.Body>
    </Card>
  );
}
