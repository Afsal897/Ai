import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PasswordResetTokenPage from "../PasswordResetTokenPage";

// Mock the component being rendered
vi.mock("@/components/user/UserPasswordReset", () => ({
  default: () => <div data-testid="user-password-reset">UserPasswordReset Component</div>,
}));

describe("PasswordResetTokenPage", () => {
  it("renders the UserPasswordReset component", () => {
    render(<PasswordResetTokenPage />);
    expect(screen.getByTestId("user-password-reset")).toBeInTheDocument();
  });
});
