import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { describe } from "vitest";
import ForgotPasswordTokenPage from "../ForgotPasswordTokenPage";

// Mock the UserPasswordReset component
vi.mock("@/components/user/UserPasswordReset", () => ({
  default: () => <div>Mocked UserPasswordReset</div>,
}));

describe("ForgotPasswordTokenPage", () => {
  it("renders the UserPasswordReset component", () => {
    render(<ForgotPasswordTokenPage />);
    expect(screen.getByText("Mocked UserPasswordReset")).toBeInTheDocument();
  });
});
