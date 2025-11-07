import { Spinner } from "react-bootstrap";

type LoadingSpinnerProps = {
  variant?: string;
};

export default function LoadingSpinner({ variant }: LoadingSpinnerProps) {
  return <Spinner animation="border" size="sm" variant={variant} />;
}
