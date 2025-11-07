// MessageBubble.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect, beforeAll } from "vitest";
import * as fileService from "@/services/file-service/fileServices";
import { MessageBubble, type Message } from "../message";
import { AxiosResponse } from "axios";

describe("MessageBubble", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  beforeAll(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    Object.defineProperty(window.URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "mock-url"),
    });

    Object.defineProperty(window.URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    });
  });

  it("renders a user message correctly", () => {
    const msg: Message = {
      id: 1,
      message: "Hello",
      role: 1,
      created_at: "2025-09-25T12:00:00Z",
    };

    render(<MessageBubble msg={msg} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders a system message correctly", () => {
    const msg: Message = {
      id: 2,
      message: "System message",
      role: 2,
      created_at: "2025-09-25T12:05:00Z",
    };

    render(<MessageBubble msg={msg} />);
    expect(screen.getByText("System message")).toBeInTheDocument();
  });

  it("renders a file message and triggers download", async () => {
    const msg: Message = {
      id: 3,
      message: "File available",
      role: 2,
      created_at: "2025-09-25T12:10:00Z",
      isFile: true,
      filename: "testfile.txt",
    };

    const blob = new Blob(["file content"], { type: "text/plain" });
    // mock AxiosResponse
    vi.spyOn(fileService, "downloadFile").mockResolvedValue({
      data: blob,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as AxiosResponse<Blob>);

    const createObjectURLMock = vi
      .spyOn(window.URL, "createObjectURL")
      .mockReturnValue("mock-url");
    const revokeObjectURLMock = vi.spyOn(window.URL, "revokeObjectURL");

    const appendChildSpy = vi.spyOn(document.body, "appendChild");

    render(<MessageBubble msg={msg} />);

    const downloadElement = screen.getByText("testfile.txt");
    fireEvent.click(downloadElement);

    await waitFor(() => {
      expect(fileService.downloadFile).toHaveBeenCalledWith(3);
      expect(createObjectURLMock).toHaveBeenCalledWith(blob);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith("mock-url");
    });
  });

  it("does not trigger download for non-file messages", () => {
    const msg: Message = {
      id: 4,
      message: "Normal message",
      role: 1,
      created_at: "2025-09-25T12:15:00Z",
    };

    const downloadSpy = vi.spyOn(fileService, "downloadFile");

    render(<MessageBubble msg={msg} />);
    fireEvent.click(screen.getByText("Normal message"));

    expect(downloadSpy).not.toHaveBeenCalled();
  });
});
