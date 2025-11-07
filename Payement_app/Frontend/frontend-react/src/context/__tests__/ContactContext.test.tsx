// src/context/__tests__/ContactContext.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ContactProvider, useMyContext } from "../ContactContext";

// Mocks for token utility and token service
vi.mock("@/services/token-service/tokenService", () => ({
  refreshToken: vi.fn().mockResolvedValue({
    access_token: {
      token: "newAccessToken",
      expiry: new Date(Date.now() + 10000).toISOString(),
    },
    refresh_token: { token: "newRefreshToken" },
  }),
}));

vi.mock("@/utils/tokenUtils", () => ({
  getAccessTokenExpiry: vi.fn(() => null),
  getRefreshToken: vi.fn(() => "mockRefreshToken"),
  removeRefrehsToken: vi.fn(),
  setAccessToken: vi.fn(),
  setAccessTokenExpiry: vi.fn(),
  setRefreshToken: vi.fn(),
}));

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe("ContactContext", () => {
  it("provides default values", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ContactProvider>{children}</ContactProvider>
    );

    const { result } = renderHook(() => useMyContext(), { wrapper });

    expect(result.current.token).toBe(null);
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it("allows setting token and user", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ContactProvider>{children}</ContactProvider>
    );

    const { result } = renderHook(() => useMyContext(), { wrapper });

    act(() => {
      result.current.setToken("mockToken");
      result.current.setUser({
        name: "Joice",
        email: "joice@example.com",
        password_at: "",
        last_login: "",
      });
    });

    expect(result.current.token).toBe("mockToken");
    expect(result.current.user).toEqual({
      email: "joice@example.com",
      last_login: "",
      name: "Joice",
      password_at: "",
    });
  });

  it("resets token and user on logout", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ContactProvider>{children}</ContactProvider>
    );

    const { result } = renderHook(() => useMyContext(), { wrapper });

    act(() => {
      result.current.setToken("mockToken");
      result.current.setUser({
        name: "Joice",
        email: "joice@example.com",
        password_at: "",
        last_login: "",
      });
      result.current.handleLogout();
    });

    expect(result.current.token).toBe(null);
    expect(result.current.user).toBe(null);
    expect(sessionStorage.getItem("accessToken")).toBeNull();
  });

  it("throws error when used outside provider", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => renderHook(() => useMyContext())).toThrow(
      "useMyContext must be used within a ContactProvider"
    );
    consoleError.mockRestore();
  });
});
