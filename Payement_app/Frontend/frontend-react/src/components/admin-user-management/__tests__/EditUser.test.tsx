import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import EditUser from "../EditUser";
import * as userService from "@/services/user-management-service/userManagementService";

// Mock translation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock updateUser API
vi.mock("@/services/user-management-service/userManagementService", () => ({
  updateUser: vi.fn(),
}));

// Mock UserForm
vi.mock("@/components/forms/UserForm", () => ({
  default: ({ form }: { form: any }) => (
    <div data-testid="user-form">
      <input
        type="text"
        placeholder="Name"
        {...form.register("name")}
        defaultValue="Edited Name"
      />
      <input
        type="email"
        placeholder="Email"
        {...form.register("email")}
        defaultValue="edit@example.com"
      />
      <select {...form.register("role")} defaultValue="0">
        <option value="0">Admin</option>
        <option value="1">User</option>
      </select>
    </div>
  ),
}));

describe("EditUser Component", () => {
  const handleGetUsersMock = vi.fn();
  const userId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the edit button", () => {
    render(<EditUser id={userId} handleGetUsers={handleGetUsersMock} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("opens modal on edit button click", async () => {
    render(<EditUser id={userId} handleGetUsers={handleGetUsersMock} />);
    fireEvent.click(screen.getByRole("button")); // Edit button
    await waitFor(() => {
      expect(screen.getByText("users.editUser.title")).toBeInTheDocument();
    });
  });

  it("submits the form and calls updateUser", async () => {
    (userService.updateUser as any).mockResolvedValueOnce({});

    render(<EditUser id={userId} handleGetUsers={handleGetUsersMock} />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(screen.getByText("users.editUser.title")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("buttons.save"));

    await waitFor(() => {
      expect(userService.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Edited Name",
          email: "edit@example.com",
          role: 0,
        }),
        userId
      );
      expect(handleGetUsersMock).toHaveBeenCalled();
    });
  });

  it("handles API error for duplicate email", async () => {
    (userService.updateUser as any).mockRejectedValueOnce({
      response: { data: { error: { "emails.0": "Duplicate email" } } },
      isAxiosError: true,
    });

    render(<EditUser id={userId} handleGetUsers={handleGetUsersMock} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("buttons.save"));

    await waitFor(() => {
      expect(userService.updateUser).toHaveBeenCalled();
    });
  });

  it("handles API error for duplicate phone", async () => {
    (userService.updateUser as any).mockRejectedValueOnce({
      response: { data: { error: { "phone_numbers.0": "Duplicate phone" } } },
      isAxiosError: true,
    });

    render(<EditUser id={userId} handleGetUsers={handleGetUsersMock} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("buttons.save"));

    await waitFor(() => {
      expect(userService.updateUser).toHaveBeenCalled();
    });
  });
});
