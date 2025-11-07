import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import { PlusCircle } from "react-bootstrap-icons";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { SubmitHandler, useForm } from "react-hook-form";
import LoadingSpinner from "../loaders/LoadingSpinner";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { NewUser } from "@/services/user-management-service/userManagementType";
import { createUser } from "@/services/user-management-service/userManagementService";
import UserForm from "../forms/UserForm";

// Define the props for the AddUser component
type AddUserProps = {
    handleGetUsers: () => void; // Function to refresh the user list after adding a new user
};

export default function AddUser({ handleGetUsers }: AddUserProps) {
  const { t, i18n } = useTranslation(); //i18n variable declaration

  // Initialize react-hook-form with default values for emails and phone numbers
  const form = useForm<NewUser>();

  // Modal state to show or hide the Add user dialog
  const [show, setShow] = useState(false);
  const handleShow = () => setShow(true);
  const handleClose = () => {
    setShow(false);
    form.reset(); // Reset form fields to default values
  };

  // Handle form submission
  const handleAddUser: SubmitHandler<NewUser> = async (data) => {

  // Cleaning up white spaces
    const trimmedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
    ) as NewUser;
    // Create a cleaned-up version of the data to submit
    const payload: NewUser = {
      ...trimmedData,
      role: Number(data.role), // <-- convert here
    };

    try {
      // Submit user data to the API
      await createUser(payload);
      handleGetUsers();
      handleClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        // const errorKey = Object.keys(err?.response?.data?.error || {})[0];
        let errorMessage = "errors.email.duplicateEmail";
        form.setError('email', { message: errorMessage });
      } else {
        form.setError("root", {
          type: "unknown",
          message: "errors.app.unexpected",
        });
      }
    }
  };

  useEffect(() => {
    form.reset();
  }, [form, i18n.language, t]); // re-run on language change

  return (
    <>
      {/* Add button to open the user modal */}
      <Button onClick={handleShow}>
        {t("buttons.add")} <PlusCircle />
      </Button>

      {/* user creation modal */}
      <Modal show={show} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t("users.addUser.title")}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={form.handleSubmit(handleAddUser)} noValidate>
          <Modal.Body>
            <UserForm form={form} userId={null} action="add" />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="success"
              size="sm"
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
        </Form>
      </Modal>
    </>
  );
}
