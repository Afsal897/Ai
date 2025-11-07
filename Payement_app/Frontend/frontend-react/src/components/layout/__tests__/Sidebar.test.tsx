import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "../Sidebar";
import { BrowserRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeAll } from "vitest";
import { SessionProvider } from "@/context/SessionContext";
//  Mock matchMedia for jsdom
beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    function () {
      return {
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(), 
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    };
});

//  Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "app.header": "Contacts",
      }[key] || key),
  }),
}));

//  Mock ContactContext
const handleLogoutMock = vi.fn();
vi.mock("@/context/ContactContext", () => ({
  useMyContext: () => ({
    handleLogout: handleLogoutMock,
  }),
}));

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <BrowserRouter>
      <SessionProvider>{ui}</SessionProvider>
    </BrowserRouter>
  );
describe("Sidebar Component", () => {
  it("renders all nav links and logout button", () => {
    renderWithProviders(<Sidebar show={true} closeSidebar={() => {}} />);

    expect(screen.getAllByText("sidebar.myProfile")[0]).toBeInTheDocument();
  });

  it("calls handleLogout on logout button click", () => {
    renderWithProviders(<Sidebar show={true} closeSidebar={() => {}} />);
    const logoutBtn = screen.getAllByRole("button", {
      name: /account.logout/i,
    })[0];
    fireEvent.click(logoutBtn);
    expect(handleLogoutMock).toHaveBeenCalledTimes(1);
  });

  it("renders Offcanvas when show is true", () => {
    renderWithProviders(<Sidebar show={true} closeSidebar={() => {}} />);
    expect(screen.getByText("Contacts")).toBeInTheDocument();
  });
});
