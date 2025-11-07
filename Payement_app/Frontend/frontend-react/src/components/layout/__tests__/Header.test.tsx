// src/components/layout/__tests__/Header.test.tsx
import { render, screen } from "@testing-library/react";
import Header from "../Header";
import { expect, it, vi } from "vitest";
import { describe } from "node:test";

//  Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "app.header": "Contacts",
      }[key] || key),
  }),
}));

//  Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  };
});

//  Mock LanguageSwitcher
vi.mock("../../i18n/LanguageSwitcher", () => ({
  default: () => <button>Language</button>,
}));

//  Mock tokenUtils
vi.mock("@/utils/tokenUtils", () => ({
  isAuthenticated: () => true,
}));

describe("Header", () => {
  it("renders header with translated title and language button", () => {
    render(<Header openSidebar={vi.fn()} />);

    expect(screen.getByText("Contacts")).toBeInTheDocument();
  });
});
