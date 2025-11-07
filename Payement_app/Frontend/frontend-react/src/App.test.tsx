import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

// Mock environment variable
vi.stubEnv("VITE_SSO_CLIENT_ID", "test-client-id");

// Optionally mock router if needed
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    RouterProvider: () => <div>Mocked Router</div>,
  };
});

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText("Mocked Router")).toBeInTheDocument();
  });
});
