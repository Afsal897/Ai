import { Card } from "react-bootstrap";
import { ExclamationCircle } from "react-bootstrap-icons";
import { useTranslation } from "react-i18next";

export default function ErrorFallback() {
  const { t } = useTranslation(); //i18n variable declaration

  return (
    <Card className="container mt-5" style={{ maxWidth: 458 }}>
      <Card.Body className="text-center">
        <Card.Title className="mt-2 text-primary">
          <ExclamationCircle color="red" size={25} />
        </Card.Title>
        <Card.Subtitle>{t("errorBoundary.title")}</Card.Subtitle>
        <Card.Text>{t("errorBoundary.text")}</Card.Text>
      </Card.Body>
    </Card>
  );
}
