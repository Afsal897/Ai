import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicLayout from "../PublicLayout";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";

// Mock Header and Footer
vi.mock("@/components/layout/Header", () => ({
  default: ({ openSidebar }: { openSidebar: (() => void) | null }) => (
    <header data-testid="header">{openSidebar === null ? "Header without sidebar" : "Header with sidebar"}</header>
  ),
}));

vi.mock("@/components/layout/Footer", () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

describe("PublicLayout", () => {
  it("renders Header, Footer, and child content via Outlet", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<div data-testid="outlet-child">Public Page Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("header").textContent).toContain("Header without sidebar");
    expect(screen.getByTestId("footer").textContent).toBe("Footer");
    expect(screen.getByTestId("outlet-child").textContent).toBe("Public Page Content");
  });
});
