import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import UserManagementPage from "../UserManagementListPage";
import * as userService from "@/services/user-management-service/userManagementService";
// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock current user util
vi.mock("@/utils/stringUtils", () => ({
  getCurentUser: vi.fn(),
}));

// API mocks
vi.mock("@/services/user-management-service/userManagementService", () => ({
  getAllUsers: vi.fn().mockResolvedValue({
    items: [
      { id: 1, name: "John", email: "john@example.com", role: 0, status: 1 },
      { id: 2, name: "Jane", email: "jane@example.com", role: 1, status: 0 },
    ],
    pager: { page: 2, page_count: 3 },
  }),
  blockUnblockUserById: vi
    .fn()
    .mockResolvedValue("User status changed successfully"),
  resetPasswordById: vi.fn().mockResolvedValue("Password reset successfully"),
}));

// Component mocks
vi.mock("@/components/admin-user-management/AddUser", () => ({
  default: ({ handleGetUsers }: { handleGetUsers: () => void }) => (
    <button onClick={handleGetUsers} data-testid="add-user">
      Add User
    </button>
  ),
}));

vi.mock("@/components/admin-user-management/EditUser", () => ({
  default: ({
    id,
    handleGetUsers,
  }: {
    id: number;
    handleGetUsers: () => void;
  }) => (
    <button onClick={handleGetUsers} data-testid={`edit-${id}`}>
      Edit {id}
    </button>
  ),
}));

vi.mock("@/components/admin-user-management/BlockUnblockUser", () => ({
  default: ({
    id,
    onToggle,
    isBlocked,
  }: {
    id: number;
    onToggle: (id: number, isBlocked: boolean) => void;
    isBlocked: boolean;
  }) => (
    <button
      onClick={() => onToggle(id, isBlocked)}
      data-testid={`toggle-${id}`}
    >
      {isBlocked ? "Unblock" : "Block"}
    </button>
  ),
}));

vi.mock("@/components/admin-user-management/ResetPasswordUser", () => ({
  default: ({
    id,
    onChangePassword,
  }: {
    id: number;
    onChangePassword: (id: number, password: string) => void;
  }) => (
    <button
      onClick={() => onChangePassword(id, "newPass")}
      data-testid={`reset-${id}`}
    >
      ResetPassword
    </button>
  ),
}));

describe("UserManagementPage", () => {
  it("renders users from API", async () => {
    render(<UserManagementPage />);
    expect(await screen.findByText("John")).toBeInTheDocument();
    expect(await screen.findByText("Jane")).toBeInTheDocument();
    expect(userService.getAllUsers).toHaveBeenCalled();
  });

  it("blocks or unblocks a user", async () => {
    render(<UserManagementPage />);
    const toggleBtn = await screen.findByTestId("toggle-1");
    fireEvent.click(toggleBtn);
  });

  it("handles pagination buttons", async () => {
    render(<UserManagementPage />);
    const nextBtn = await screen.findByRole("button", { name: /Next/i });
    const prevBtn = await screen.findByRole("button", { name: /Prev/i });
    const firstBtn = await screen.findByRole("button", { name: /First/i });
    const lastBtn = await screen.findByRole("button", { name: /Last/i });
    const nameColumn = screen.getByText(/users.table.columnName/i);

    fireEvent.click(nameColumn);
    fireEvent.click(nextBtn);
    fireEvent.click(prevBtn);
    fireEvent.click(firstBtn);
    fireEvent.click(lastBtn);

    await waitFor(() => {
      expect(userService.getAllUsers).toHaveBeenCalled();
    });
  });
});
