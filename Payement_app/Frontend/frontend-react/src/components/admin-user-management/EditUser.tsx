import { Button } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import { useState } from "react";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { SubmitHandler, useForm } from "react-hook-form";
import LoadingSpinner from "../loaders/LoadingSpinner";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { NewUser } from "@/services/user-management-service/userManagementType";
import UserForm from "../forms/UserForm";
import { updateUser } from "@/services/user-management-service/userManagementService";
// Props type for the EditUser component
type EditUserProps = {
  id: number; // User ID to fetch and edit
  handleGetUsers: () => void; // Function to refresh the user list after editing a  user
};

export default function EditUser({
  id,
  handleGetUsers,
}: EditUserProps) {
  const { t } = useTranslation(); //i18n variable declaration

  // Setup react-hook-form with default values
  const form = useForm<NewUser>();

  // Modal visibility control
  const [show, setShow] = useState(false);
  const handleShow = () => setShow(true);
  const handleClose = () => {
    setShow(false);
  };

  // Handles edit form submission
  const handleEditUser: SubmitHandler<NewUser> = async (data) => {
  // Cleaning up white spaces
  const trimmedData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ])
  ) as NewUser;
    const payload: NewUser = {
      ...trimmedData,
      role: Number(data.role), // <-- convert here
    };

    // Remove any undefined or null fields from the object
    (Object.keys(payload) as (keyof NewUser)[]).forEach(
      (k) => payload[k] == null && delete payload[k]
    );

    //get the api key from error response
    const getErrorType = (errorKey: string): "phone" | "email" | "other" => {
      const mainKey = errorKey.split(".")[0];

      if (mainKey === "phone_numbers") {
        return "phone";
      } else if (mainKey === "emails") {
        return "email";
      }
      return "other";
    };

    try {
      //calling update user API
      await updateUser(payload, id);
      handleGetUsers();
      handleClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const errorKey = Object.keys(err?.response?.data?.error || {})[0];
        let errorMessage = "";
        if (getErrorType(errorKey) == "email") {
          errorMessage = "errors.email.duplicateEmail";
        }
        if (getErrorType(errorKey) == "phone") {
          errorMessage = "errors.phone.duplicatePhone";
        }

        form.setError(errorKey as keyof NewUser, { message: errorMessage });
      }
    }
  };

  return (
    <>
      {/* Button to open the edit modal */}
      <Button variant="light" onClick={() => handleShow()}>
        <PencilSquare />
      </Button>

      {/* Modal for editing user */}
      <Modal show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t("users.editUser.title")}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={form.handleSubmit(handleEditUser)} noValidate>
          <Modal.Body>
            {/* Edit user form */}
            {/* Reusable user form component */}
            <UserForm form={form} userId={id} action="edit"  />

            <Modal.Footer>
              <Button  size="sm"
                variant="success"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <LoadingSpinner />
                ) : (
                  <span>{t("buttons.save")}</span>
                )}
              </Button>
            </Modal.Footer>
          </Modal.Body>
        </Form>
      </Modal>
    </>
  );
}
