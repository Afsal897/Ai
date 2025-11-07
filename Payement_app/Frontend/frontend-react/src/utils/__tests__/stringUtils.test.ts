// utils.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  extractNameFromEmail,
  setUserRole,
  getUserRole,
  removeUserRole,
  trimValue,
  trimObjectValues,
  setCurentUser,
  getCurentUser,
  removeCurentUser,
} from "../stringUtils"; // <-- adjust path

// Mock localStorage
beforeEach(() => {
  const store: Record<string, string> = {};

  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const key in store) delete store[key];
    }),
  });
});

describe("extractNameFromEmail", () => {
  it("should extract name part from email", () => {
    expect(extractNameFromEmail("john.doe@example.com")).toBe("john.doe");
    expect(extractNameFromEmail("alice@company.org")).toBe("alice");
  });
});

describe("UserRole localStorage utils", () => {
  it("should set and get userRole", () => {
    setUserRole("admin");
    expect(getUserRole()).toBe("admin");
  });

  it("should remove userRole", () => {
    setUserRole("editor");
    removeUserRole();
    expect(getUserRole()).toBeNull();
  });
});

describe("CurentUser localStorage utils", () => {
  it("should set and get curentUser", () => {
    setCurentUser("joice");
    expect(getCurentUser()).toBe("joice");
  });

  it("should remove curentUser", () => {
    setCurentUser("saju");
    removeCurentUser();
    expect(getCurentUser()).toBeNull();
  });
});

describe("trimValue", () => {
  it("should trim spaces from a string", () => {
    expect(trimValue("  hello  ")).toBe("hello");
    expect(trimValue("world")).toBe("world");
  });
});

describe("trimObjectValues", () => {
  it("should trim string values in an object", () => {
    const input = { name: "  John  ", age: 25, email: "  test@example.com " };
    const result = trimObjectValues(input);
    expect(result).toEqual({
      name: "John",
      age: 25,
      email: "test@example.com",
    });
  });

  it("should leave non-string values unchanged", () => {
    const input = { count: 10, active: true, nested: { x: 1 } };
    expect(trimObjectValues(input)).toEqual(input);
  });
});
