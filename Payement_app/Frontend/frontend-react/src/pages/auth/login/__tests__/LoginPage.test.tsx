import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";
import LoginPage from "@/pages/auth/login/LoginPage";
import * as authService from "@/services/auth-service/authService";
import * as tokenUtils from "@/utils/tokenUtils";
import * as stringUtils from "@/utils/stringUtils";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Ensure cleanup between tests
afterEach(() => {
  cleanup();
});

//Mock token and string utils
vi.mock("@/utils/tokenUtils", () => ({
  setAccessToken: vi.fn(),
  setAccessTokenExpiry: vi.fn(),
  setRefreshToken: vi.fn(),
}));
vi.mock("@/utils/stringUtils", () => ({
  setName: vi.fn(),
  setUserRole: vi.fn(),
}));

//Mock login API
vi.mock("@/services/auth-service/authService");

//Mock useMyContext (to inject setToken)
const mockSetToken = vi.fn();
vi.mock("@/context/ContactContext", () => ({
  useMyContext: () => ({
    setToken: mockSetToken,
  }),
}));

//Mock GoogleSSO to avoid loading Google scripts
vi.mock("@/pages/auth/login/GoogleSSO", () => ({
  default: () => <div data-testid="mock-google-sso" />,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Optional: return a mapping from a mock JSON if you want to mimic actual text
      const mockTranslations: Record<string, string> = {
        "auth.login.title": "Welcome Back!",
        "auth.login.text":
          "Enter your email and password to access your account",
        "labels.email": "Email address",
        "labels.password": "Password",
        "buttons.login": "Login",
        "errors.email.required": "Email is required",
        "errors.password.required": "Password is required",
        "errors.login.credentialsInvalid": "Invalid credentials.",
        "errors.app.unexpected": "An unexpected error occured,please try again",
        "errors.login.loginFailed": "Login failed. Please try again",
        "auth.login.link.signup": "signup",
        "auth.login.noAccountLabel": "Don't have an account?",
        "auth.login.orLabel": "or",
        "auth.login.link.forgotPassword": "Forgot Password",
      };

      return mockTranslations[key] || key;
    },
  }),
}));

// Cast mocks
const mockedLogin = authService.login as unknown as ReturnType<typeof vi.fn>;
const mockSetAccessToken = tokenUtils.setAccessToken as ReturnType<
  typeof vi.fn
>;
const mockSetAccessTokenExpiry = tokenUtils.setAccessTokenExpiry as ReturnType<
  typeof vi.fn
>;
const mockSetRefreshToken = tokenUtils.setRefreshToken as ReturnType<
  typeof vi.fn
>;
const mockSetUserRole = stringUtils.setUserRole as ReturnType<typeof vi.fn>;
// Wrap component in router to allow <Link> rendering
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form correctly", () => {
    renderWithRouter(<LoginPage />);

    expect(screen.getByText("Welcome Back!")).toBeInTheDocument();
    expect(
      screen.getByText("Enter your email and password to access your account")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("shows validation errors if fields are empty", async () => {
    renderWithRouter(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it("submits form and sets tokens on successful login", async () => {
    mockedLogin.mockResolvedValueOnce({
      access_token: { token: "access123", expiry: "9999-12-31" },
      refresh_token: { token: "refresh123" },
      user: { name: "Joice", role: "admin" },
    });

    renderWithRouter(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "Test1234@" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "Test1234@",
      });
      expect(mockSetAccessToken).toHaveBeenCalledWith("access123");
      expect(mockSetAccessTokenExpiry).toHaveBeenCalledWith("9999-12-31");
      expect(mockSetRefreshToken).toHaveBeenCalledWith("refresh123");
      expect(mockSetToken).toHaveBeenCalledWith("access123");
      expect(mockSetUserRole).toHaveBeenCalledWith("admin");
    });
  });

  it("shows invalid credentials error on 400/401", async () => {
    mockedLogin.mockRejectedValueOnce({
      response: { status: 401 },
      isAxiosError: true,
    });

    renderWithRouter(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "wrongpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
