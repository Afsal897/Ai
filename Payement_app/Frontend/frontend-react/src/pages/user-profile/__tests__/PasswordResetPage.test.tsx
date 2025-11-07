import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserTypes } from "@/constants/enum";
import PasswordResetPage from "../PasswordResetPage";

// Mock components
vi.mock("@/components/user/UserPasswordVerify", () => ({
  default: () => <div>UserPasswordVerify Component</div>,
}));

vi.mock("@/components/user/UserAccountVerify", () => ({
  default: () => <div>UserAccountVerify Component</div>,
}));

// Mock context
import * as ContactContextModule from "@/context/ContactContext";
vi.mock("@/context/ContactContext", async () => {
  const actual = await vi.importActual<typeof ContactContextModule>(
    "@/context/ContactContext"
  );
  return {
    ...actual,
    useMyContext: vi.fn(),
  };
});

describe("PasswordResetPage", () => {
  const mockedUseMyContext = ContactContextModule.useMyContext as ReturnType<
    typeof vi.fn
  >;

  it("renders UserPasswordVerify when signup_type is PASSWORD_ONLY", () => {
    mockedUseMyContext.mockReturnValue({
      user: { signup_type: UserTypes.PASSWORD_ONLY },
    });

    render(<PasswordResetPage />);
    expect(screen.getByText("UserPasswordVerify Component")).toBeInTheDocument();
  });

  it("renders UserPasswordVerify when signup_type is SSO_AND_PASSWORD", () => {
    mockedUseMyContext.mockReturnValue({
      user: { signup_type: UserTypes.SSO_AND_PASSWORD },
    });

    render(<PasswordResetPage />);
    expect(screen.getByText("UserPasswordVerify Component")).toBeInTheDocument();
  });

  it("renders UserAccountVerify for any other signup_type", () => {
    mockedUseMyContext.mockReturnValue({
      user: { signup_type: UserTypes.SSO_ONLY },
    });

    render(<PasswordResetPage />);
    expect(screen.getByText("UserAccountVerify Component")).toBeInTheDocument();
  });

  it("renders UserAccountVerify when user is undefined", () => {
    mockedUseMyContext.mockReturnValue({ user: undefined });

    render(<PasswordResetPage />);
    expect(screen.getByText("UserAccountVerify Component")).toBeInTheDocument();
  });
});
