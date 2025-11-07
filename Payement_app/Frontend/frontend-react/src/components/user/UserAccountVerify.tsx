import { SubmitHandler, useForm } from "react-hook-form";
import { Button, Card, FloatingLabel, Form } from "react-bootstrap";
import { emailValidation } from "@/validations/formValidations";
import { Link } from "react-router-dom";
import LoadingSpinner from "@/components/loaders/LoadingSpinner";
import { ArrowBarLeft } from "react-bootstrap-icons";
import { useEffect, useState } from "react";
import SuccessCard from "@/components/alert-cards/SuccessCard";
import { PageType, UserTypes } from "@/constants/enum";
import axios from "axios";
import { userPasswordReset } from "@/services/user-service/userService";
import { useTranslation } from "react-i18next";
import { isAuthenticated } from "@/utils/tokenUtils";
import { useMyContext } from "@/context/ContactContext";

// Declaring the type for the form input (Email address)
type EmailVerifyFormInput = {
  email: string;
};

export default function UserAccountVerify() {
  const { t } = useTranslation(); // i18n translations
  const { user } = useMyContext();
  const redirectpath = isAuthenticated() ? "/user-profile" : "/login"; // Redirect path based on authentication

  // useForm hook setup with validation
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailVerifyFormInput>();

  const [pageType, setPageType] = useState(PageType.INPUT); // Current view mode
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(""); // Logged-in user's email

  // Handles the form submission and triggers the API call to verify the email
  const handleVerifyEmail: SubmitHandler<EmailVerifyFormInput> = async (
    data
  ) => {
    try {
      await userPasswordReset(data);
      reset(); // Reset form fields
      setPageType(PageType.SUCCESS); //view mode change to success (will show the success card)
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

  useEffect(() => {
    const userEmail = user?.email;
    const signUpType = user?.signup_type;
    if (userEmail && signUpType == UserTypes.SSO_ONLY) {
      setCurrentUserEmail(userEmail);
      setValue("email", userEmail, { shouldDirty: false });
    }
  }, [setValue, user?.email, user?.signup_type]);

  // Render success message depending on pageType after sending reset email
  if (pageType === PageType.SUCCESS) {
    return (
      <SuccessCard cardText={t("successCard.forgotPasswordSuccessMessage")} />
    );
  }

  return (
    <Card className="container mt-5 text-center" style={{ maxWidth: 458 }}>
      <Card.Body>
        <Card.Title>{t("accountVerification.title")}</Card.Title>
        <Card.Text>{t("accountVerification.text")}</Card.Text>

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
                })}
                isInvalid={!!errors.email} // Show error if the email field has validation errors
                disabled={isSubmitting || !!currentUserEmail} // Disable input when loading
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
            {isSubmitting ? (
              <LoadingSpinner />
            ) : (
              <span> {t("buttons.send")}</span>
            )}{" "}
            {/* Show spinner while loading */}
          </Button>
        </Form>

        {/* Link to redirect back to the login page */}
        <div className="mt-3">
          <Link to={redirectpath} className="link">
            <ArrowBarLeft /> {t("accountVerification.link.back")}
          </Link>
        </div>
        
      </Card.Body>
    </Card>
  );
}
