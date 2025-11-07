import { isAuthenticated } from "@/utils/tokenUtils";
import { Card } from "react-bootstrap";
import { ArrowBarLeft, CheckCircleFill } from "react-bootstrap-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

// Props definition for the SuccessCard component
type SuccessCardProps = {
  cardText: string; // The success message text to be displayed on the card
};

export default function SuccessCard({ cardText }: SuccessCardProps) {
  const { t } = useTranslation(); //defining the localization variable
  const isLoggedIn = isAuthenticated(); // checks Authenticayed user or not
  const redirectedPath = isLoggedIn ? "/user-profile" : "/login"; //Defining the redirected path

  return (
    <Card className="container mt-5" style={{ maxWidth: 458 }}>
      <Card.Body className="text-center">
        <Card.Title className="text-primary">
          <CheckCircleFill size={60} color="green" />
        </Card.Title>
        <Card.Subtitle className="mt-2">
          {t("successCard.title")}{" "}
        </Card.Subtitle>

        <Card.Text>{cardText}</Card.Text>

        {/* Link to redirect back to the login page */}
        <Link to={redirectedPath} className="link">
          <ArrowBarLeft />

          {isLoggedIn
            ? t("successCard.link.backToProfile")
            : t("successCard.link.backToLogin")}
        </Link>
      </Card.Body>
    </Card>
  );
}
