import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Footer from "@/components/layout/Footer";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "app.footer": "All rights reserved.",
      }[key] || key),
  }),
}));

describe("Footer", () => {
  it("renders the translated footer text", () => {
    render(<Footer />);
    expect(screen.getByText(/2025 All rights reserved/i)).toBeInTheDocument();
  });
});