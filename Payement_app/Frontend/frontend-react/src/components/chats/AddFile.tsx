import { useState } from "react";
import { Form } from "react-bootstrap";
import { PlusCircle } from "react-bootstrap-icons";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { SubmitHandler, useForm } from "react-hook-form";
import FileUploadForm from "../forms/FileUploadForm";
import { uploadFile } from "@/services/file-service/fileServices";
import LoadingSpinner from "../loaders/LoadingSpinner";
import { useTranslation } from "react-i18next";
import { NewFile } from "@/services/file-service/fileType";
import { showConfirmDialog } from "@/utils/toastUtils";

type AddFileProps = {
  handleGetFiles: (page?: number) => void;
  setIsUploading: (value: boolean) => void; // uploading state setter
};

export default function AddFile({ handleGetFiles, setIsUploading }: AddFileProps) {
  const { t } = useTranslation();
  const form = useForm<NewFile>();

  const [show, setShow] = useState(false);

  const handleShow = () => setShow(true);
  const handleClose = () => {
    setShow(false);
    form.reset();
  };

  const handleAddFile: SubmitHandler<NewFile> = async (data) => {
    setIsUploading(true);
    const file = data.attachment?.[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    // Append the fields to FormData
    formData.append("domain", data.domain || "");
    formData.append("client_name", data.clientName || "");

    if (data.technologies && data.technologies.length > 0) {
      // Get array of technology names
      const techList = data.technologies.map((t) => t.name).filter(Boolean);
      // Append each technology as a separate FormData entry
      techList.forEach((tech) => {
        formData.append("technology", tech);
      });
    } else {
      formData.append("technology", "");
    }

    formData.append("type", data.fileType?.toString() || "");

    try {
      await uploadFile(formData);
      handleGetFiles(1);
      handleClose();
      showConfirmDialog({
        text: "File uploaded successfully",
        icon: "success",
        toast: true,
        showCancelButton: false,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        position: "top-end",
      });
    } catch (err) {
      console.error(err);
      form.setError("root", {
        type: "server",
        message: "File upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {/* Add button */}
      <Button onClick={handleShow}>
        <span className="d-flex align-items-center gap-1">
          <PlusCircle />
          {t("buttons.add")}
        </span>
      </Button>

      {/* Modal */}
      <Modal show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t("contacts.addFile.title")}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={form.handleSubmit(handleAddFile)} noValidate>
          <Modal.Body>
            <FileUploadForm form={form} />
            {form.formState.errors.root && (
              <div className="text-danger mt-2 text-center">
                {form.formState.errors.root.message}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="success"
              type="submit"
              disabled={form.formState.isSubmitting}
              className="d-flex align-items-center gap-2"
            >
              {form.formState.isSubmitting ? <LoadingSpinner /> : t("buttons.save")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
