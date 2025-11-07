// tests/layouts/PrivateLayout.test.tsx
import { describe, it, vi, beforeEach, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PrivateLayout from "@/layouts/PrivateLayout";
import { MemoryRouter } from "react-router-dom";

// Mock components
vi.mock("@/components/layout/Header", () => ({
  default: ({ openSidebar }: { openSidebar: () => void }) => (
    <button onClick={openSidebar}>Mock Header</button>
  ),
}));

vi.mock("@/components/layout/Sidebar", () => ({
  default: ({
    show,
    closeSidebar,
  }: {
    show: boolean;
    closeSidebar: () => void;
  }) => (
    <div>
      <div data-testid="mock-sidebar">{show ? "Sidebar Open" : "Sidebar Closed"}</div>
      <button onClick={closeSidebar}>Close Sidebar</button>
    </div>
  ),
}));

vi.mock("@/components/layout/Footer", () => ({
  default: () => <div>Mock Footer</div>,
}));

// Mock react-router-dom's Outlet
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    Outlet: () => <div data-testid="mock-outlet">Mock Outlet</div>,
  };
});

describe("PrivateLayout", () => {
  beforeEach(() => {
    // Clear mocks or side effects if needed
  });

  it("renders Header, Sidebar, Footer, and Outlet correctly", () => {
    render(
      <MemoryRouter>
        <PrivateLayout />
      </MemoryRouter>
    );

    expect(screen.getByText("Mock Header")).toBeInTheDocument();
    expect(screen.getByText("Mock Footer")).toBeInTheDocument();
    expect(screen.getByTestId("mock-sidebar")).toHaveTextContent("Sidebar Closed");
    expect(screen.getByTestId("mock-outlet")).toBeInTheDocument();
  });

  it("opens sidebar when Header button is clicked", () => {
    render(
      <MemoryRouter>
        <PrivateLayout />
      </MemoryRouter>
    );

    const openButton = screen.getByText("Mock Header");
    fireEvent.click(openButton);

    expect(screen.getByTestId("mock-sidebar")).toHaveTextContent("Sidebar Open");
  });

  it("closes sidebar when Sidebar close button is clicked", () => {
    render(
      <MemoryRouter>
        <PrivateLayout />
      </MemoryRouter>
    );

    const openButton = screen.getByText("Mock Header");
    fireEvent.click(openButton); // open sidebar

    expect(screen.getByTestId("mock-sidebar")).toHaveTextContent("Sidebar Open");

    const closeButton = screen.getByText("Close Sidebar");
    fireEvent.click(closeButton);

    expect(screen.getByTestId("mock-sidebar")).toHaveTextContent("Sidebar Closed");
  });

  it("contains required layout CSS classes", () => {
    const { container } = render(
      <MemoryRouter>
        <PrivateLayout />
      </MemoryRouter>
    );

    expect(container.querySelector(".layout-container")).toBeInTheDocument();
    expect(container.querySelector(".main-layout-body")).toBeInTheDocument();
    expect(container.querySelector(".main-content.with-sidebar")).toBeInTheDocument();
  });
});
