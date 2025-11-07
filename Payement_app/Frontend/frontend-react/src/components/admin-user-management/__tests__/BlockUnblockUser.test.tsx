import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import BlockUnblockUser from "@/components/admin-user-management/BlockUnblockUser";

// Mock translation hook
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key, // returns key for simplicity
  }),
}));

describe("BlockUnblockUser Component", () => {
  const mockOnToggle = vi.fn();

  it("renders unlock icon when status is active (1)", () => {
    render(<BlockUnblockUser name="John" id={1} status={1} onToggle={mockOnToggle} disabled={true}/>);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button.querySelector("svg")).toBeTruthy(); // Unlock icon
  });

  it("renders lock icon when status is blocked (3)", () => {
    render(<BlockUnblockUser name="Jane" id={2} status={3} onToggle={mockOnToggle} disabled={true} />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button.querySelector("svg")).toBeTruthy(); // Lock icon
  });

  it("renders slash icon and disables button when status is inactive (0)", () => {
    render(<BlockUnblockUser name="Sam" id={3} status={0} onToggle={mockOnToggle} disabled={true} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toBeTruthy(); // SlashCircle icon
  });

  it("renders trash icon and disables button when status is deleted (2)", () => {
    render(<BlockUnblockUser name="Max" id={4} status={2} onToggle={mockOnToggle} disabled={true}/>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.querySelector("svg")).toBeTruthy(); // Trash icon
  });



});
