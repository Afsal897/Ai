import { Container } from "react-bootstrap";
import LoadingSpinner from "./LoadingSpinner";

export default function PageLoadingSpinner() {
  return (
    <Container className="vh-100 d-flex flex-column justify-content-center align-items-center text-center">
      <LoadingSpinner variant="primary" />
    </Container>
  );
}
