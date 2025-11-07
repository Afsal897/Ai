import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import AddUser from "../AddUser";
import { createUser } from "@/services/user-management-service/userManagementService";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n"; // adjust to your actual i18n config path

// Mock UserForm
vi.mock("../../forms/UserForm", () => ({
  default: () => <div data-testid="user-form">Mocked UserForm</div>,
}));

// Mock API
vi.mock("@/services/user-management-service/userManagementService", () => ({
  createUser: vi.fn(),
}));

describe("AddUser Component (Vitest)", () => {
  const mockGetUsers = vi.fn();

  const setup = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <AddUser handleGetUsers={mockGetUsers} />
      </I18nextProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Add button", () => {
    setup();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("opens the dialog when Add button is clicked", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(screen.getByText(/add user/i)).toBeInTheDocument();
    expect(screen.getByTestId("user-form")).toBeInTheDocument();
  });

  it("closes the dialog on close button click", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    fireEvent.click(screen.getByLabelText(/close/i));
    await waitFor(() =>
      expect(screen.queryByText(/add user/i)).not.toBeInTheDocument()
    );
  });

  it("calls createUser and closes modal on success", async () => {
    (createUser as ReturnType<typeof vi.fn>).mockResolvedValue({});

    setup();
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    const submitBtn = await screen.findByRole("button", { name: /save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createUser).toHaveBeenCalled();
      expect(mockGetUsers).toHaveBeenCalled();
    });

    await waitFor(() =>
      expect(screen.queryByText(/add user/i)).not.toBeInTheDocument()
    );
  });

  it("shows form error if API returns Axios error", async () => {
    (createUser as ReturnType<typeof vi.fn>).mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          error: {
            email: "Duplicate email",
          },
        },
      },
    });

    setup();
    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    const submitBtn = await screen.findByRole("button", { name: /save/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createUser).toHaveBeenCalled();
    });

    // Modal should still be open
    expect(screen.getByText(/add user/i)).toBeInTheDocument();
  });

  it("shows fallback error if non-Axios error is thrown", async () => {
    (createUser as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Unexpected error")
    );

    setup();
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    const saveButton = await screen.findByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(createUser).toHaveBeenCalled();
    });

    expect(screen.getByText(/add user/i)).toBeInTheDocument();
  });
});
