// MessagesPage.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect, beforeAll } from "vitest";
import * as sessionService from "@/services/session-service/sessionService";
import * as tokenUtils from "@/utils/tokenUtils";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import MessagesPage from "../ChatListPage";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock components
vi.mock("@/components/loaders/PageLoadingSpinner", () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}));
vi.mock("@/components/loaders/OverlayLoader", () => ({
  default: ({ children, loading }: any) => (
    <div data-testid={loading ? "overlay-loading" : "overlay-done"}>
      {children}
    </div>
  ),
}));
vi.mock("@/components/loaders/LoadingSpinner", () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));
vi.mock("@/components/contacts/message", () => ({
  MessageBubble: ({ msg }: any) => <div>{msg.message}</div>,
}));
// Mock scrollIntoView
HTMLElement.prototype.scrollIntoView = vi.fn();

// let wsInstance: any;

class MockWebSocket {
  onmessage: any = null;
  send = vi.fn();
  close = vi.fn();
  readyState = 1; // OPEN
  constructor() {
    // wsInstance = this; // capture instance
  }
}
vi.stubGlobal("WebSocket", MockWebSocket);

describe("MessagesPage", () => {
  // Mock scrollIntoView for jsdom
  beforeAll(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  const mockMessages = [
    {
      id: 1,
      message: "Hello",
      role: 2,
      created_at: "2025-09-23T10:00:00Z",
      isFile: false,
    },
    {
      id: 2,
      message: "World",
      role: 2,
      created_at: "2025-09-23T11:00:00Z",
      isFile: false,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading initially", async () => {
    vi.spyOn(sessionService, "getAllMessages").mockResolvedValue({
      items: [],
      pager: { page: 1, page_count: 1 },
    });

    render(
      <MemoryRouter initialEntries={["/messages/1"]}>
        <Routes>
          <Route path="/messages/:sessionId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("fetches and displays messages", async () => {
    vi.spyOn(sessionService, "getAllMessages").mockResolvedValue({
      items: mockMessages,
      pager: { page: 1, page_count: 1 },
    });
    vi.spyOn(tokenUtils, "getAccessToken").mockReturnValue("mock-token");

    render(
      <MemoryRouter initialEntries={["/messages/1"]}>
        <Routes>
          <Route path="/messages/:sessionId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Hello")).toBeInTheDocument();
      expect(screen.getByText("World")).toBeInTheDocument();
    });
  });

  it("shows 'Start a conversation' when no messages", async () => {
    vi.spyOn(sessionService, "getAllMessages").mockResolvedValue({
      items: [],
      pager: { page: 1, page_count: 1 },
    });
    vi.spyOn(tokenUtils, "getAccessToken").mockReturnValue("mock-token");

    render(
      <MemoryRouter initialEntries={["/messages/1"]}>
        <Routes>
          <Route path="/messages/:sessionId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Start a conversation")).toBeInTheDocument();
    });
  });

  it("sends message via WebSocket", async () => {
    vi.spyOn(sessionService, "getAllMessages").mockResolvedValue({
      items: [],
      pager: { page: 1, page_count: 1 },
    });
    vi.spyOn(tokenUtils, "getAccessToken").mockReturnValue("mock-token");

    render(
      <MemoryRouter initialEntries={["/messages/1"]}>
        <Routes>
          <Route path="/messages/:sessionId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    const input = await screen.findByPlaceholderText("Type your message...");
    fireEvent.change(input, { target: { value: "Test message" } });

    const button = screen.getByTestId("sendButton");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });
  });
  it("sends message when pressing Enter", async () => {
    vi.spyOn(sessionService, "getAllMessages").mockResolvedValue({
      items: [],
      pager: { page: 1, page_count: 1 },
    });
    vi.spyOn(tokenUtils, "getAccessToken").mockReturnValue("mock-token");

    render(
      <MemoryRouter initialEntries={["/messages/1"]}>
        <Routes>
          <Route path="/messages/:sessionId" element={<MessagesPage />} />
        </Routes>
      </MemoryRouter>
    );

    const input = await screen.findByPlaceholderText("Type your message...");
    fireEvent.change(input, { target: { value: "Enter message" } });

    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(screen.getByText("Enter message")).toBeInTheDocument();
    });
  });
});
