import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect ,Mock} from "vitest";
import { useForm } from "react-hook-form";
import * as userService from "@/services/user-management-service/userManagementService";
import { NewUser } from "@/services/user-management-service/userManagementType";
import UserForm from "../UserForm";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock getUserById
vi.mock("@/services/user-management-service/userManagementService", () => ({
  getUserById: vi.fn(),
}));

describe("UserForm Component", () => {
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Wrapper component to provide `useForm`
  const Wrapper = (props?: Partial<React.ComponentProps<typeof UserForm>>) => {
    const form = useForm<NewUser>({
      defaultValues: { name: "", email: "", role: 0 },
    });
    form.reset = mockReset; // Mock reset so we can assert calls

    return (
      <UserForm
        form={form}
        userId={props?.userId ?? null}
        action={props?.action ?? "add"}
      />
    );
  };

  const renderComponent = (props?: Partial<React.ComponentProps<typeof UserForm>>) =>
    render(<Wrapper {...props} />);

  it("renders form fields", () => {
    renderComponent();
    expect(screen.getByPlaceholderText("Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("disables email and role fields when action is edit", () => {
    renderComponent({ action: "edit" });
    expect(screen.getByPlaceholderText("Email")).toBeDisabled();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("fetches user data and resets form when userId is provided", async () => {
    (userService.getUserById as Mock).mockResolvedValueOnce({
      name: "John Doe",
      email: "john@example.com",
      role: "1",
    });
  
    renderComponent({ userId: 1 });
  
    await waitFor(() => {
      expect(userService.getUserById).toHaveBeenCalledWith(1);
      expect(mockReset).toHaveBeenCalledWith({
        name: "John Doe",
        email: "john@example.com",
        role: "1",
      });
    });
  });

  it("does not call getUserById when userId is null", async () => {
    renderComponent({ userId: null });
    await waitFor(() => {
      expect(userService.getUserById).not.toHaveBeenCalled();
    });
  });
});
