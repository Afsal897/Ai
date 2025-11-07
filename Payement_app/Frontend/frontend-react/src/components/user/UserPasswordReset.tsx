import { Button, Card, FloatingLabel, Form } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  forgotPassword,
  forgotPasswordverifyEmailToken,
} from "@/services/auth-service/authService";
import LoadingSpinner from "@/components/loaders/LoadingSpinner";
import { ArrowBarLeft } from "react-bootstrap-icons";
import { useEffect, useState } from "react";
import {
  confirmPasswordValidation,
  passwordValidation,
} from "@/validations/formValidations";
import ErrorCard from "@/components/alert-cards/ErrorCard";
import { PageType } from "@/constants/enum";
import axios from "axios";
import PageLoadingSpinner from "../loaders/PageLoadingSpinner";
import { showConfirmDialog } from "@/utils/toastUtils";
import { useTranslation } from "react-i18next";
import { isAuthenticated } from "@/utils/tokenUtils";
import { useMyContext } from "@/context/ContactContext";

// Declaring the type of Password reset form inputs
type PasswordResetFormInputs = {
  password: string;
  confirmPassword: string;
};

export default function UserPasswordReset() {
  const { t } = useTranslation(); // i18n translations
  const { handleLogout } = useMyContext();
  const navigate = useNavigate();
  const { token } = useParams(); // Token from URL for password reset
  const redirectedPath = isAuthenticated() ? "/user-profile" : "/login";

  // UseForm setup to manage form state and validations
  const {
    register,
    handleSubmit,
    reset,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetFormInputs>();

  const [pageType, setPageType] = useState<PageType | undefined>(undefined); // Current view mode
  const [isLoading, setIsLoading] = useState(true); // Loading state

  // Handles password reset form submission and triggers API call
  const handlePasswordReset: SubmitHandler<PasswordResetFormInputs> = async (
    data
  ) => {
    const requestBody = {
      password: data.password.trim(), // New password to set
    };

    try {
      await forgotPassword(requestBody, token);
      reset(); // Reset form fields after successful submission
      navigate("/login");
      handleLogout(); //logout after successfull password reset

      await showConfirmDialog({
        title: t("toasts.passwordUpdated.title"),
        text: t("toasts.passwordUpdated.text"),
        timer: 5000,
        icon: "success",
        showConfirmButton: false,
        showCancelButton: false,
        showCloseButton: true,
        toast: true,
        position: "top-end",
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const apiErrors = err?.response?.data?.error;
        if (err?.response?.status == 400 || err?.response?.status == 403) {
          if (apiErrors?.password) {
            setError("password", {
              type: "server",
              message: "errors.password.sameAsCurrent",
            });
          } else {
            setPageType(PageType.INVALID);
          }
        } else {
          setError("root", {
            type: "unknown",
            message: "errors.app.unexpected",
          });
        }
      }
    }
  };

  useEffect(() => {
    const handleVerifyToken = async () => {
      try {
        await forgotPasswordverifyEmailToken(token);
        setPageType(PageType.INPUT);
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          if (err?.response?.status === 403) {
            setPageType(PageType.INVALID);
          } else {
            setError("root", {
              type: "server",
              message: "errors.app.unexpected",
            });
          }
        } else {
          setError("root", {
            type: "unknown",
            message: "errors.app.unexpected",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    handleVerifyToken();
  }, [setError, token]);

  return isLoading ? (
    <PageLoadingSpinner />
  ) : pageType === PageType.INVALID ? (
    <ErrorCard />
  ) : (
    <Card className="container mt-5 text-center" style={{ maxWidth: 458 }}>
      <Card.Body>
        <Card.Title>{t("auth.resetPassword.title")}</Card.Title>
        <Card.Text>{t("auth.resetPassword.text")}</Card.Text>

        <Form onSubmit={handleSubmit(handlePasswordReset)} noValidate>
          {/* Password Field */}
          <Form.Group controlId="formPassword" className="mt-3">
            <FloatingLabel
              controlId="floatingInputPassword"
              label={t("labels.password")}
            >
              <Form.Control
                type="password"
                placeholder="Password"
                maxLength={100}
                {...register("password", passwordValidation)} // Apply password validation
                isInvalid={!!errors.password} // Show error if validation fails
                disabled={isSubmitting} // Disable input while loading
                autoComplete="off"
              />
              <Form.Control.Feedback type="invalid" className="text-start">
                {t(errors.password?.message || "")}
                {/* Display error message */}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>

          {/* Confirm Password Field */}
          <Form.Group controlId="formConfirmPassword" className="mt-3">
            <FloatingLabel
              controlId="floatingInputConfirmPassword"
              label={t("labels.confirmPassword")}
            >
              <Form.Control
                type="password"
                placeholder="Confirm Password"
                maxLength={100}
                {...register(
                  "confirmPassword",
                  confirmPasswordValidation(() => getValues("password"))
                )} // Validate confirm password against password field
                isInvalid={!!errors.confirmPassword} // Show error if validation fails
                disabled={isSubmitting} // Disable input while loading
              />
              <Form.Control.Feedback type="invalid" className="text-start">
                {t(errors.confirmPassword?.message || "")}
                {/* Display error message */}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>

          {/* Submit Button */}
          <Button type="submit" className="w-100 mt-3" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoadingSpinner />
            ) : (
              <span> {t("buttons.resetPassword")}</span>
            )}{" "}
            {/* Show loading spinner if request is in progress */}
          </Button>

          {/* Display error message if any unexpected error occure */}
          {errors.root?.message && (
            <div className="d-flex justify-content-center">
              <Form.Text className="text-danger">
                {t(errors.root?.message)}
              </Form.Text>
            </div>
          )}

          {/* Link back to the login page */}
          <div className="mt-3">
            <Link to={redirectedPath} className="link">
              <ArrowBarLeft /> {t("auth.resetPassword.link.back")}
            </Link>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
