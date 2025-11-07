// src/components/contacts/__tests__/AddFile.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AddFile from "../AddFile";
import { uploadFile } from "@/services/file-service/fileServices";
import { showConfirmDialog } from "@/utils/toastUtils";
import userEvent from "@testing-library/user-event";

// Mock modules
vi.mock("@/services/file-service/fileServices", () => ({
  uploadFile: vi.fn(),
}));

vi.mock("@/utils/toastUtils", () => ({
  showConfirmDialog: vi.fn(),
}));

describe("AddFile component", () => {
  const handleGetFiles = vi.fn();
  const setIsUploading = vi.fn();

  const renderComponent = () =>
    render(<AddFile handleGetFiles={handleGetFiles} setIsUploading={setIsUploading} />);

  it("renders add button", () => {
    renderComponent();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("submits successfully when file upload works", async () => {
    vi.mocked(uploadFile).mockResolvedValueOnce({});
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    // Upload file
    const fileInput = await screen.findByTestId("file-upload-input");
    const file = new File(["dummy"], "test.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
    await userEvent.upload(fileInput, file);

    // Fill other inputs
    await userEvent.type(screen.getByPlaceholderText(/domain/i), "Test Domain");
    await userEvent.type(screen.getByPlaceholderText(/client/i), "Test Client");
    await userEvent.type(screen.getByPlaceholderText(/technology/i), "React");

    // Select file type
    await userEvent.selectOptions(screen.getByRole("combobox"), "1");

    // Submit form
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledTimes(1);
      expect(handleGetFiles).toHaveBeenCalledWith(1);
      expect(showConfirmDialog).toHaveBeenCalledWith(expect.objectContaining({ text: "File uploaded successfully" }));
      expect(setIsUploading).toHaveBeenCalledWith(true);
      expect(setIsUploading).toHaveBeenCalledWith(false);
    });
  });

  it("shows error when upload fails", async () => {
    vi.mocked(uploadFile).mockRejectedValueOnce(new Error("Upload failed"));
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    const fileInput = await screen.findByTestId("file-upload-input");
    const file = new File(["dummy"], "test.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
    await userEvent.upload(fileInput, file);

    // Required fields
    await userEvent.type(screen.getByPlaceholderText(/domain/i), "Domain");
    await userEvent.selectOptions(screen.getByRole("combobox"), "1");

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText(/file upload failed/i)).toBeInTheDocument();
    expect(uploadFile).toHaveBeenCalled();
    expect(setIsUploading).toHaveBeenCalledWith(true);
    expect(setIsUploading).toHaveBeenCalledWith(false);
  });
});
