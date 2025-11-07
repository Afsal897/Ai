import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ForgotPasswordPage from "../ForgotPasswordPage";
import * as authService from "@/services/auth-service/authService";
import { BrowserRouter } from "react-router-dom";

//  Inline mock for translations
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "auth.verifyEmail.title": "Verify Your Email",
        "auth.verifyEmail.forgotPassword.text":
          "Enter your email address and we'll send you a link to reset password.",
        "labels.email": "Email address",
        "errors.email.required": "Email is required",
        "errors.email.invalid": "Invalid email format",
        "errors.forgotPassword.emailNotFound": "Email not found",
        "buttons.verify": "Verify",
        "auth.verifyEmail.link.back": "Back to Login",
        "successCard.forgotPasswordSuccessMessage":
          "A password reset link has been sent to your email address. Please follow the instructions in the email to reset your password.",
        "errors.app.unexpected": "An unexpected error occured,please try again",
        "errors.forgotPassword.emailSendFailed":
          "Failed to send reset email. Please try again",
      }[key] || key),
  }),
}));

// Mock forgotPasswordVerifyEmail
vi.mock("@/services/auth-service/authService", () => ({
  forgotPasswordVerifyEmail: vi.fn(),
}));

// Wrap component in router to allow <Link> rendering
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input form and submits successfully", async () => {
    (
      authService.forgotPasswordVerifyEmail as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({});

    renderWithRouter(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText("name@example.com");
    fireEvent.change(emailInput, { target: { value: "john@example.com" } });

    const button = screen.getByRole("button", { name: /verify/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(authService.forgotPasswordVerifyEmail).toHaveBeenCalledWith({
        email: "john@example.com",
      });
    });

    expect(
      screen.getByText(/A password reset link has been sent/i)
    ).toBeInTheDocument();
  });

  it("shows error for email not found (404)", async () => {
    (
      authService.forgotPasswordVerifyEmail as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce({
      response: { status: 404 },
      isAxiosError: true,
    });

    renderWithRouter(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText("name@example.com");
    fireEvent.change(emailInput, { target: { value: "notfound@example.com" } });

    const button = screen.getByRole("button", { name: /verify/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Email not found/i)).toBeInTheDocument();
    });
  });

  it("shows validation error on empty submit", async () => {
    renderWithRouter(<ForgotPasswordPage />);

    const button = screen.getByRole("button", { name: /verify/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
    });
  });

  it("shows generic error on unexpected server error", async () => {
    (
      authService.forgotPasswordVerifyEmail as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce({
      response: { status: 500 },
      isAxiosError: true,
    });

    renderWithRouter(<ForgotPasswordPage />);

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to send reset email. Please try again/i)
      ).toBeInTheDocument();
    });
  });
});
