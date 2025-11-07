import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import ResetPasswordUser from "@/components/admin-user-management/ResetPasswordUser";

// Mock translation hook
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, any>) =>
      opts?.name ? `${key} ${opts.name}` : key, // handle {name} placeholder
  }),
}));

// Mock PasswordChangeForm to simplify
vi.mock("../forms/PasswordChangeForm", () => ({
  default: ({ form }: any) => (
    <div data-testid="password-form">
      <input
        type="password"
        placeholder="Password"
        {...form.register("password")}
      />
    </div>
  ),
}));

describe("ResetPasswordUser Component", () => {
  const mockOnChangePassword = vi.fn();

  const setup = () =>
    render(<ResetPasswordUser name="John" id={1} onChangePassword={mockOnChangePassword} />);

  it("renders icon button", () => {
    setup();
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });



  it("closes modal when cancel button is clicked", async () => {
    setup();

    fireEvent.click(screen.getByRole("button")); // open modal
    const modal = await screen.findByRole("dialog");

    const cancelButton = within(modal).getByRole("button", { name: "buttons.cancel" });
    fireEvent.click(cancelButton);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});
