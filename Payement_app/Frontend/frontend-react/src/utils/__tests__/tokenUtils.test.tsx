import {
  setAccessTokenExpiry,
  getAccessTokenExpiry,
  removeAccessTokenExpiry,
  setAccessToken,
  getAccessToken,
  removeAccessToken,
  setRefreshToken,
  getRefreshToken,
  removeRefrehsToken,
  isAuthenticated,
} from "@/utils/tokenUtils"; // adjust path accordingly
import { beforeEach, describe, expect, it } from "vitest";

describe("token utils", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  // Access Token Expiry
  it("sets, gets, and removes accessTokenExpiry", () => {
    setAccessTokenExpiry("123456");
    expect(getAccessTokenExpiry()).toBe("123456");

    removeAccessTokenExpiry();
    expect(getAccessTokenExpiry()).toBeNull();
  });

  // Access Token
  it("sets, gets, and removes accessToken", () => {
    setAccessToken("token123");
    expect(getAccessToken()).toBe("token123");

    removeAccessToken();
    expect(getAccessToken()).toBeNull();
  });

  // Refresh Token
  it("sets, gets, and removes refreshToken", () => {
    setRefreshToken("refresh123");
    expect(getRefreshToken()).toBe("refresh123");

    removeRefrehsToken();
    expect(getRefreshToken()).toBeNull();
  });

  // isAuthenticated
  it("returns true if accessToken exists", () => {
    setAccessToken("valid-token");
    expect(isAuthenticated()).toBe(true);
  });

  it("returns false if accessToken does not exist", () => {
    removeAccessToken();
    expect(isAuthenticated()).toBe(false);
  });
});
