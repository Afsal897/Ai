// FileListPage.test.tsx
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import FileListPage from "../FileListPage";
import * as contactService from "@/services/file-service/fileServices";


// Mock components that are used inside FileListPage
vi.mock("@/components/chats/FileDownload", () => ({
  default: ({ onDownload, id }: any) => (
    <button onClick={() => onDownload(id)} data-testid="download">Download</button>
  ),
}));
vi.mock("@/components/chats/AddFile", () => ({
  default: ({ handleGetFiles }: any) => (
    <button onClick={() => handleGetFiles()}>Add File</button>
  ),
}));
vi.mock("@/components/loaders/PageLoadingSpinner", () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}));
vi.mock("@/components/loaders/OverlayLoader", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/contacts/CustomPagination", () => ({
  default: ({ onPageChange }: any) => (
    <button onClick={() => onPageChange(2)}>Next Page</button>
  ),
}));
vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(),
  },
}));


describe("FileListPage", () => {
  const mockFiles = [
    {
      id: 1,
      name: "File1.txt",
      size: 1000,
      created_at: "2025-09-23T10:00:00Z",
    },
    {
      id: 2,
      name: "File2.txt",
      size: 2000,
      created_at: "2025-09-23T11:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading spinner initially", async () => {
    vi.spyOn(contactService, "getAllFiles").mockResolvedValueOnce({
      items: [],
      pager: { page: 1, page_count: 1 },
    });

    render(
      // <I18nextProvider>
      <FileListPage />
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("fetches and displays files", async () => {
    vi.spyOn(contactService, "getAllFiles").mockResolvedValueOnce({
      items: mockFiles,
      pager: { page: 1, page_count: 1 },
    });

    render(<FileListPage />);

    await waitFor(() => {
      expect(screen.getByText("File1.txt")).toBeInTheDocument();
      expect(screen.getByText("File2.txt")).toBeInTheDocument();
    });
  });

  it("handles pagination click", async () => {
    const getAllFilesMock = vi
      .spyOn(contactService, "getAllFiles")
      .mockResolvedValue({
        items: mockFiles,
        pager: { page: 1, page_count: 2 },
      });

    render(<FileListPage />);

    await waitFor(() => screen.getByText("File1.txt"));

    fireEvent.click(screen.getByText("Next"));

    await waitFor(() => {
      expect(getAllFilesMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        2,
        expect.any(Number)
      );
    });
  });
});
