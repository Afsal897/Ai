import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi, type Mock } from "vitest";
import ErrorCard from "../ErrorCard";
import { isAuthenticated } from "@/utils/tokenUtils";

// Mock tokenUtils (will override in tests)
vi.mock("@/utils/tokenUtils", () => ({
  isAuthenticated: vi.fn(),
}));

// Mock useTranslation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key, // Simple translation mock
  }),
}));

describe("ErrorCard", () => {
  it("renders error card with given cardText and redirect link when user not authenticated", () => {
    (isAuthenticated as Mock).mockReturnValue(false);
    render(
      <BrowserRouter>
        <ErrorCard />
      </BrowserRouter>
    );

    // Assert presence of key texts
    expect(screen.getByText("errorCard.title")).toBeInTheDocument();
    expect(screen.getByText("errorCard.text")).toBeInTheDocument();
    expect(screen.getByText("errorCard.link.backToLogin")).toBeInTheDocument();

    // Optionally assert icon is rendered
    expect(screen.getByRole("link")).toHaveAttribute("href", "/login"); // Based on mocked isAuthenticated: false
  });

  it("renders error card with given cardText and redirect link when user  authenticated", () => {
    (isAuthenticated as Mock).mockReturnValue(true);
    render(
      <BrowserRouter>
        <ErrorCard />
      </BrowserRouter>
    );

    // Assert presence of key texts
    expect(screen.getByText("errorCard.title")).toBeInTheDocument();
    expect(screen.getByText("errorCard.text")).toBeInTheDocument();
    expect(
      screen.getByText("errorCard.link.backToProfile")
    ).toBeInTheDocument();

    // Optionally assert icon is rendered
    expect(screen.getByRole("link")).toHaveAttribute("href", "/user-profile"); // Based on mocked isAuthenticated: false
  });
});
