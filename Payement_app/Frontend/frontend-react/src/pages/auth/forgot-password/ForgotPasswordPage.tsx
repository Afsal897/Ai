import { SubmitHandler, useForm } from "react-hook-form";
import { Button, Card, FloatingLabel, Form } from "react-bootstrap";
import { emailValidation } from "@/validations/formValidations";
import { Link } from "react-router-dom";
import { forgotPasswordVerifyEmail } from "@/services/auth-service/authService";
import LoadingSpinner from "@/components/loaders/LoadingSpinner";
import { ArrowBarLeft } from "react-bootstrap-icons";
import { useState } from "react";
import SuccessCard from "@/components/alert-cards/SuccessCard";
import { PageType } from "@/constants/enum";
import axios from "axios";
import { useTranslation } from "react-i18next";

// Declaring the type for the form input (Email address)
type ForgotPasswordPageFormInput = {
  email: string;
};

export default function ForgotPasswordPage() {
  const { t } = useTranslation(); //i18n variable declaration

  // useForm hook setup with validation
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordPageFormInput>();

  const [pageType, setPageType] = useState(PageType.INPUT); // managing the current view mode

  // Handles the form submission and triggers the API call to verify the email
  const handleVerifyEmail: SubmitHandler<ForgotPasswordPageFormInput> = async (
    data
  ) => {
    try {
      await forgotPasswordVerifyEmail(data);
      reset(); // Reset form fields
      setPageType(PageType.SUCCESS);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err?.response?.status == 404) {
          setError("email", {
            type: "server",
            message: "errors.forgotPassword.emailNotFound",
          });
        } else {
          setError("root", {
            type: "server",
            message: "errors.forgotPassword.emailSendFailed",
          });
        }
      } else {
        setError("root", {
          type: "unknown",
          message: "errors.app.unexpected",
        });
      }
    }
  };

  return pageType === PageType.SUCCESS ? (
    <SuccessCard cardText={t("successCard.forgotPasswordSuccessMessage")} />
  ) : (
    <Card className="container mt-5 text-center" style={{ maxWidth: 458 }}>
      <Card.Body>
        <Card.Title>{t("auth.verifyEmail.title")}</Card.Title>
        <Card.Text>{t("auth.verifyEmail.forgotPassword.text")}</Card.Text>

        {/* Email Verification Form */}
        <Form onSubmit={handleSubmit(handleVerifyEmail)} noValidate>
          <Form.Group controlId="formInputEmail" className="mt-3">
            <FloatingLabel controlId="floatingInput" label={t("labels.email")}>
              <Form.Control
                type="email"
                placeholder="name@example.com"
                maxLength={255}
                {...register("email", {
                  ...emailValidation, // Apply validation rules
                  onChange: () => clearErrors("root"), // Reset error flag when input changes
                })}
                isInvalid={!!errors.email} // Show error if the email field has validation errors
                disabled={isSubmitting} // Disable input when loading
              />
              {/* Display validation error message */}
              <Form.Control.Feedback type="invalid" className="text-start">
                {t(errors.email?.message || "")}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>

          {/* Display error message if any unexpected error occure */}
          {errors.root?.message && (
            <div className="text-start">
              <Form.Text className="text-danger">
                {t(errors.root?.message || "")}
              </Form.Text>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-100 mt-3" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner /> : t("buttons.verify")}
            {/* Show spinner while loading */}
          </Button>
        </Form>

        {/* Link to redirect back to the login page */}
        <div className="mt-3">
          <Link to={"/login"} className="link">
            <ArrowBarLeft /> {t("auth.verifyEmail.link.back")}
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}
