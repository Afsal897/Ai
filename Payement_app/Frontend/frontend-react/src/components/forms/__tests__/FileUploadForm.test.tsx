// FileUploadForm.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import type { NewFile } from "@/services/file-service/fileType";
import FileUploadForm from "../FileUploadForm";

// Mock translation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Wrapper to provide react-hook-form
function renderWithForm(defaultValues: Partial<NewFile> = {}) {
  const Wrapper = () => {
    const form = useForm<NewFile>({
      defaultValues: {
        attachment: undefined,
        domain: "",
        clientName: "",
        technologies: [], // multiple technologies
        fileType: "",
        ...defaultValues,
      },
    });
    return <FileUploadForm form={form} />;
  };

  return render(<Wrapper />);
}

describe("FileUploadForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all input fields", () => {
    renderWithForm();

    expect(screen.getByLabelText("labels.attachFile")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("labels.domain")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("labels.clientName")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("labels.technology")).toBeInTheDocument();
  });

  it("accepts a file upload", async () => {
    renderWithForm();

    const file = new File(["dummy content"], "test.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    const fileInput = screen.getByLabelText("labels.attachFile") as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(fileInput.files?.[0]).toBe(file);
    expect(fileInput.files).toHaveLength(1);
  });
});
