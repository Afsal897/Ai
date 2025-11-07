// SessionContext.test.tsx
import { describe, it, vi, beforeEach, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SessionProvider, useSessionContext } from "../SessionContext";
import * as sessionService from "@/services/session-service/sessionService";
import userEvent from "@testing-library/user-event";

// Mock services
vi.mock("@/services/session-service/sessionService", () => ({
  getAllSessions: vi.fn(),
  createSessions: vi.fn(),
}));

// Test component that consumes context
const TestComponent = () => {
  const { sessions, fetchSessions, createNewSession, totalSessions } =
    useSessionContext();

  return (
    <div>
      <button onClick={() => fetchSessions(1, 2)}>Fetch</button>
      <button onClick={() => createNewSession()}>Create</button>
      <div data-testid="sessions">
        {sessions.map((s) => (
          <p key={s.id}>{s.name}</p>
        ))}
      </div>
      <span data-testid="total">{totalSessions}</span>
    </div>
  );
};

describe("SessionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides default empty state", () => {
    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    expect(screen.getByTestId("sessions")).toBeEmptyDOMElement();
    expect(screen.getByTestId("total").textContent).toBe("0");
  });

  it("fetches and sets sessions", async () => {
    vi.mocked(sessionService.getAllSessions)
    .mockResolvedValueOnce({
      items: [
        { id: 1, name: "Session A" },
        { id: 2, name: "Session B" },
      ],
      pager: { page: 1, page_count: 5 },
    });

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    await userEvent.click(screen.getByText("Fetch"));

    await waitFor(() => {
      expect(screen.getByText("Session A")).toBeInTheDocument();
      expect(screen.getByText("Session B")).toBeInTheDocument();
      expect(screen.getByTestId("total").textContent).toBe("5");
    });
  });

  it("creates a new session and prepends to state", async () => {
    vi.mocked(sessionService.createSessions)
    .mockResolvedValueOnce({
      id: 99,
      name: "New Session",
    });

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    await userEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(screen.getByText("New Session")).toBeInTheDocument();
    });
  });

  it("handles errors gracefully", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sessionService.getAllSessions)
    .mockRejectedValueOnce(
      new Error("Fetch failed")
    );

    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    await userEvent.click(screen.getByText("Fetch"));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to fetch sessions",
        expect.any(Error)
      );
    });

    errorSpy.mockRestore();
  });
});
