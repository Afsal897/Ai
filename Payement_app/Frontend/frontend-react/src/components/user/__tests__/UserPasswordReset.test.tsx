import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import UserPasswordReset from "../UserPasswordReset";

// Mock translations
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "auth.resetPassword.link.back": "back",
        "buttons.resetPassword": "Reset Password",
        "labels.confirmPassword": "Confirm Password",
        "labels.password": "Password",
        "auth.resetPassword.text":
          "Enter a new password below to change your password.",
        "auth.resetPassword.title": "Reset Your Password",
        "toasts.passwordUpdated.title": "Password Updated",
        "toasts.passwordUpdated.text":
          "Your password has been successfully updated.",
        "errors.app.unexpected": "Unexpected error occurred",
      }[key] || key),
  }),
}));

// Mock components
vi.mock("@/components/loaders/PageLoadingSpinner", () => ({
  default: () => <div>Mock Page Loading Spinner</div>,
}));
vi.mock("@/components/alert-cards/ErrorCard", () => ({
  default: () => <div>Mock Error Card</div>,
}));
vi.mock("@/components/loaders/LoadingSpinner", () => ({
  default: () => <span>Mock Spinner</span>,
}));

// Mock services & utils
vi.mock("@/services/auth-service/authService", async () => {
  return {
    forgotPasswordverifyEmailToken: vi.fn(),
    forgotPassword: vi.fn(),
  };
});

import {
  forgotPassword,
  forgotPasswordverifyEmailToken,
} from "@/services/auth-service/authService";

vi.mock("@/utils/toastUtils", () => ({
  showConfirmDialog: vi.fn(),
}));

vi.mock("@/context/ContactContext", () => ({
  useMyContext: vi.fn(() => ({
    // Mock whatever values your component expects
    contactData: {},
    updateContact: vi.fn(),
    user: { id: 1, name: "Test User" },
    // ...other mocked values
  })),
}));

describe("UserPasswordReset", () => {
  it("renders the password reset form with invalid token", async () => {
    (
      forgotPasswordverifyEmailToken as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 403,
      },
    });

    render(
      <MemoryRouter initialEntries={["/reset-password/invalid-token"]}>
        <Routes>
          <Route
            path="/reset-password/:token"
            element={<UserPasswordReset />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Mock Error Card")).toBeInTheDocument();
  });

  it("renders the password reset form with unexpected error", async () => {
    (
      forgotPasswordverifyEmailToken as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 500,
      },
    });

    render(
      <MemoryRouter initialEntries={["/reset-password/invalid-token"]}>
        <Routes>
          <Route
            path="/reset-password/:token"
            element={<UserPasswordReset />}
          />
        </Routes>
      </MemoryRouter>
    );
    expect(
      await screen.findByText("Unexpected error occurred")
    ).toBeInTheDocument();
  });

  it("renders the password reset form", async () => {
    (
      forgotPasswordverifyEmailToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={["/reset-password/sample-token"]}>
        <Routes>
          <Route
            path="/reset-password/:token"
            element={<UserPasswordReset />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Reset Your Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset Password" })
    ).toBeInTheDocument();
  });

  it("calls forgotPassword API on valid form submit", async () => {
    (
      forgotPasswordverifyEmailToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={["/reset-password/sample-token"]}>
        <Routes>
          <Route
            path="/reset-password/:token"
            element={<UserPasswordReset />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Reset Your Password")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "NewPassword@123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "NewPassword@123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith(
        { password: "NewPassword@123" },
        "sample-token"
      );
    });
  });

  it("calls forgotPassword API and shows API error", async () => {
    (
      forgotPasswordverifyEmailToken as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (forgotPassword as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          error: {
            password: ["same password"],
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/reset-password/sample-token"]}>
        <Routes>
          <Route
            path="/reset-password/:token"
            element={<UserPasswordReset />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Reset Your Password")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "NewPassword@123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "NewPassword@123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith(
        { password: "NewPassword@123" },
        "sample-token"
      );
    });

    // Simulate second failure with another error code
    (forgotPassword as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 406,
        data: {
          error: {
            password: ["same password"],
          },
        },
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith(
        { password: "NewPassword@123" },
        "sample-token"
      );
    });
  });
});
