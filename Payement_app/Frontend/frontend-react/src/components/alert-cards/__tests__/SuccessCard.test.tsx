import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { expect, it, vi, type Mock } from "vitest";
import { describe } from "node:test";
import SuccessCard from "../SuccessCard";
import { isAuthenticated } from "@/utils/tokenUtils";

// Mock isAuthenticated
vi.mock("@/utils/tokenUtils", () => ({
  isAuthenticated: vi.fn(),
}));

// Mock useTranslation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key, // return key as mock translation
  }),
}));

describe("SuccessCard", () => {
  it("renders success card with given cardText and redirect link when user not authenticated", () => {
    const message = "Successfully updated!";
    (isAuthenticated as Mock).mockReturnValue(false);
    render(
      <BrowserRouter>
        <SuccessCard cardText={message} />
      </BrowserRouter>
    );

    expect(screen.getByText("successCard.title")).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(
      screen.getByText("successCard.link.backToLogin")
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/login");
  });

  it("renders success card with given cardText and redirect link when user authenticated", () => {
    const message = "Successfully updated!";
    (isAuthenticated as Mock).mockReturnValue(true);
    render(
      <BrowserRouter>
        <SuccessCard cardText={message} />
      </BrowserRouter>
    );

    expect(screen.getByText("successCard.title")).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(
      screen.getByText("successCard.link.backToProfile")
    ).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/user-profile");
  });
});
