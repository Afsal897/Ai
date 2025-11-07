// ProfilePage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ProfilePage from "../ProfilePage";

// ---- MOCKS ----

// react-i18next mock
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key, // just return key for testing
  }),
}));

// router-dom mock
vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

// context mock
vi.mock("@/context/ContactContext", () => ({
  useMyContext: () => ({
    user: {
      email: "test@example.com",
      name: "John Doe",
      name_kana: "ジョン",
      name_kanji: "山田太郎",
      dob: "1990-01-01",
      image_url: null,
      signup_type: 1,
      password_at: "2023-05-01T00:00:00Z",
      last_login: "2023-05-15T00:00:00Z",
    },
    setUser: vi.fn(),
  }),
}));

// user-service mock
vi.mock("@/services/user-service/userService", () => ({
  getUserProfile: vi.fn().mockResolvedValue({
    email: "test@example.com",
    name: "John Doe",
  }),
  userProfileUpdate: vi.fn().mockResolvedValue({ success: true }),
}));

// child components mocks
vi.mock("@/components/user/UserProfileImage", () => ({
  default: ({ previewUrl }: { previewUrl: string }) => (
    <div data-testid="mock-user-profile-image">{previewUrl}</div>
  ),
}));

vi.mock("@/components/forms/DatePickerInput", () => ({
  default: ({ field }: any) => (
    <input
      data-testid="mock-datepicker"
      type="date"
      value={field.value || ""}
      onChange={(e) => field.onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/components/loaders/LoadingSpinner", () => ({
  default: () => <div data-testid="mock-spinner">Loading...</div>,
}));

vi.mock("@/components/loaders/PageLoadingSpinner", () => ({
  default: () => <div data-testid="mock-page-spinner">PageLoading...</div>,
}));

// date utils
vi.mock("@/utils/dateUtils", () => ({
  formatUTCToLocalDate: (date: string) => `local(${date})`,
}));

// i18n
vi.mock("@/i18n", () => ({
  default: { language: "en" },
}));

// validations
vi.mock("@/validations/formValidations", () => ({
  KanaNameValidation: { withSpace: { pattern: /.+/ } },
  kanjiNameValidation: { withSpace: { pattern: /.+/ } },
}));

// ---- TESTS ----

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders profile page with user info", async () => {
    render(<ProfilePage />);

    // spinner first
    expect(screen.getByTestId("mock-page-spinner")).toBeInTheDocument();

    // wait for data load
    await waitFor(() => {
      expect(screen.getByText("labels.email")).toBeInTheDocument();
    });

    // email field should be visible
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
  });
});
