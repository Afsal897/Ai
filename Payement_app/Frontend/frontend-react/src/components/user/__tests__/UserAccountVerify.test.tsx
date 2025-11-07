import { describe, it, vi, beforeEach, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { userPasswordReset } from "@/services/user-service/userService";
import UserAccountVerify from "../UserAccountVerify";

// Mocks
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "accountVerification.title": "Account Verification",
        "accountVerification.text": "Please verify your email",
        "labels.email": "Email Address",
        "buttons.send": "Send",
        "accountVerification.link.back": "Back",
        "successCard.forgotPasswordSuccessMessage": "Password reset email sent",
        "errors.forgotPassword.emailNotFound": "Email not found",
        "errors.app.unexpected": "Unexpected error occurred",
        "errors.forgotPassword.emailSendFailed":"Failed to send reset email. Please try again"
      }[key] || key),
  }),
}));

vi.mock("@/context/ContactContext", () => ({
  useMyContext: vi.fn().mockReturnValue({
    user: { email: "test@example.com", signup_type: 2 },
  }),
}));

vi.mock("@/services/user-service/userService", () => ({
  userPasswordReset: vi.fn(),
}));

const renderWithRouter = () =>
  render(
    <BrowserRouter>
      <UserAccountVerify />
    </BrowserRouter>
  );

describe("UserAccountVerify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    renderWithRouter();
  });

  it("renders email input and send button", () => {
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send/i })).toBeInTheDocument();
  });

  it("displays success message on successful submission", async () => {
    (userPasswordReset as any).mockResolvedValue({});

    fireEvent.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Password reset email sent")
      ).toBeInTheDocument()
    );
  });

  it("shows email not found error on 404", async () => {
    (userPasswordReset as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: {
        status: 404,
        data: {
          error: {
            message: "Email not found",
          },
        },
      },
      isAxiosError: true,
    });

    fireEvent.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() =>
      expect(screen.getByText("Email not found")).toBeInTheDocument()
    );
  });

  it("shows unexpected error on non-404 Axios error", async () => {
    (userPasswordReset as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: {
        status: 405,
        data: {
          error: {
            message: "Unexpected error occured",
          },
        },
      },
      isAxiosError: true,
    });

    fireEvent.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Failed to send reset email. Please try again")
      ).toBeInTheDocument()
    );
  });

  it("shows fallback error on non-Axios error", async () => {
    (userPasswordReset as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: {
        data: {
          error: {
            message: "Unexpected error occured",
          },
        },
      },
      isAxiosError: false,
    });

    fireEvent.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Unexpected error occurred")
      ).toBeInTheDocument()
    );
  });
});
