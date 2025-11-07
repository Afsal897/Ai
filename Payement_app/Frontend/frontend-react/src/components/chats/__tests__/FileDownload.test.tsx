// src/components/contacts/__tests__/FileDownload.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FileDownload from "../FileDownload";


describe("FileDownload component", () => {
  const mockOnDownload = vi.fn();

  const setup = () =>
    render(<FileDownload name="TestFile.pptx" id={42} onDownload={mockOnDownload} />);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders download button", () => {
    setup();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("opens modal when download button is clicked", async () => {
    setup();
    fireEvent.click(screen.getByRole("button"));

    expect(await screen.findByText(/contacts.downloadContact.title/i)).toBeInTheDocument();
    expect(screen.getByText(/contacts.downloadContact.text/i)).toBeInTheDocument();
    expect(screen.getByText(/TestFile.pptx/i)).toBeInTheDocument();
  });

  it("calls onDownload with id when confirm button is clicked", async () => {
    setup();
    fireEvent.click(screen.getByRole("button")); // open modal

    const confirmBtn = await screen.findByRole("button", { name: /buttons.download/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockOnDownload).toHaveBeenCalledWith(42);
    });
  });

  it("closes modal after clicking confirm", async () => {
    setup();
    fireEvent.click(screen.getByRole("button")); // open modal

    const confirmBtn = await screen.findByRole("button", { name: /buttons.download/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByText(/contacts.downloadContact.text/i)).not.toBeInTheDocument();
    });
  });

  it("closes modal when clicking close button", async () => {
    setup();
    fireEvent.click(screen.getByRole("button")); // open modal

    const closeBtn = await screen.findByLabelText(/close/i);
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/contacts.downloadContact.text/i)).not.toBeInTheDocument();
    });
  });
});
