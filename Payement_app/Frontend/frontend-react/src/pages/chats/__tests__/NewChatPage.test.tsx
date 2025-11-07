// NewChatPage.test.tsx
import { describe, it, vi, beforeEach, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import NewChatPage from "../NewChatPage";

// mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// mock SessionContext
const mockCreateNewSession = vi.fn();
const mockFetchSessions = vi.fn();

vi.mock("@/context/SessionContext", () => ({
  useSessionContext: () => ({
    createNewSession: mockCreateNewSession,
    fetchSessions: mockFetchSessions,
  }),
}));

describe("NewChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    mockFetchSessions.mockResolvedValueOnce([]);
    render(<NewChatPage />);
    await waitFor(() => expect(mockFetchSessions).toHaveBeenCalled());
  });

  it("calls createNewSession and navigates when no sessions exist", async () => {
    mockFetchSessions.mockResolvedValueOnce([]);
    mockCreateNewSession.mockResolvedValueOnce({ id: "123" });

    render(<NewChatPage />);

    await waitFor(() => {
      expect(mockFetchSessions).toHaveBeenCalledTimes(1);
      expect(mockCreateNewSession).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/sessions/123");
    });
  });

  it("navigates to latest session if sessions exist", async () => {
    const sessions = [{ id: "999", name: "Old chat" }];
    mockFetchSessions.mockResolvedValueOnce(sessions);

    render(<NewChatPage />);

    await waitFor(() => {
      expect(mockFetchSessions).toHaveBeenCalled();
      expect(mockCreateNewSession).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/sessions/999");
    });
  });
});
