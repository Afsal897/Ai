import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18n from "@/i18n";
import { describe, expect, it, vi } from "vitest";
import LanguageSwitcher from "../LanguageSwitcher";

// Mock the i18n instance
vi.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    language: "en",
    changeLanguage: vi.fn(),
  },
}));

describe("LanguageSwitcher", () => {
  it("renders with current language label", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("shows dropdown items when clicked", async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByText("日本語")).toBeInTheDocument();
  });

  it("changes language when a language is selected", async () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button"));

    const japaneseOption = await screen.findByText("日本語");
    fireEvent.click(japaneseOption);

    await waitFor(() => {
      expect(i18n.changeLanguage).toHaveBeenCalledWith("jp");
    });
  });
});
