import { useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { Download } from "react-bootstrap-icons";
import { useTranslation } from "react-i18next";

// Props type for file download component
type DownloadFileProps = {
  name: string; // file's name to display in confirmation
  id: number; // ID of the file to download
  onDownload: (id: number) => void; // Function to call when file is confirmed for deletion
};

// Component to handle file deletion with confirmation modal
export default function FileDownload({
  name,
  id,
  onDownload,
}: DownloadFileProps) {
  const { t } = useTranslation(); //i18n variable declaration
  const [show, setShow] = useState(false); // State to control whether the modal (or component) is visible

  const handleClose = () => setShow(false); // Function to clode the modal
  const handleShow = () => setShow(true); // Function to open/show the modal

  // Calls the passed onDownload function with file ID and closes modal
  const handleDownload = () => {
    onDownload(id);
    handleClose();
  };

  return (
    <>
      {/* Trash icon button to trigger download modal */}
      <Button variant="light" className="me-2" onClick={handleShow}>
        <Download color="blue" />
      </Button>

      {/* Modal for download confirmation */}
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>{t("contacts.downloadContact.title")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {t("contacts.downloadContact.text")}
          <strong> {name}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="danger"
            id="file-download-btn"
            onClick={handleDownload}
          >
            {t("buttons.download")}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
