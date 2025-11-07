import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserPasswordVerify from "@/components/user/UserPasswordVerify";
import { BrowserRouter } from "react-router-dom";

// Mocks
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "verifyPassword.title": "Verify Password",
        "verifyPassword.text":
          "Enter your current password to confirm it’s you and proceed.",
        "verifyPassword.link.back": "Back to Profile",
        "labels.currentPassword": "Current password",
        "buttons.verify": "Verify",
        "errors.currentPassword.required": "Current password is required",
        "errors.currentPassword.incorrect": "Incorrect Password",
      }[key] || key),
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

//  Move mockUserPasswordReset inside vi.mock
vi.mock("@/services/user-service/userService", () => {
  return {
    userPasswordReset: vi.fn(), // <-- important
  };
});

//  Import after mocks
import { userPasswordReset } from "@/services/user-service/userService";

// Wrapper with router context
const renderComponent = () =>
  render(
    <BrowserRouter>
      <UserPasswordVerify />
    </BrowserRouter>
  );

describe("UserPasswordVerify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form correctly", () => {
    renderComponent();
    expect(screen.getByText("Verify Password")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enter your current password to confirm it’s you and proceed."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
  });

  it("shows required validation error when submitted empty", async () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() =>
      expect(
        screen.getByText("Current password is required")
      ).toBeInTheDocument()
    );
  });

  it("calls API and navigates on valid submission", async () => {
    (userPasswordReset as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      token: "/next-step",
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "validpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(userPasswordReset).toHaveBeenCalledWith({
        password: "validpassword",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/next-step");
    });
  });
});
