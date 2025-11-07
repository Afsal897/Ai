import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFoundPage from "@/pages/not-found/NotFoundPage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "pageNotFound.title": "Page not found",
        "pageNotFound.text": "We can't find the page you were looking for.",
        "pageNotFound.link.back": "go back",
        "errors.confirmPassword.required": "Confirm password is required",
      }[key] || key),
  }),
}));

describe("NotFoundPage", () => {
  it("renders 404 message and go back link", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(
      screen.getByText("We can't find the page you were looking for.")
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /go back/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute("href")).toBe("/");
  });
});
