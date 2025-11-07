import LoadingSpinner from "@/components/loaders/LoadingSpinner";
import { Button, Card, FloatingLabel, Form } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { ArrowBarLeft } from "react-bootstrap-icons";
import { userPasswordReset } from "@/services/user-service/userService";
import { useTranslation } from "react-i18next";
import axios from "axios";

// Form input type for resetting the user's password
type UserResetPasswordInput = {
  currentPassword: string;
};

export default function UserPasswordVerify() {
  const { t } = useTranslation(); //i18n variable declaration
  const navigate = useNavigate();

  // useForm setup with user password reset form
  const {
    register,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserResetPasswordInput>({});

  //Function for password reset
  const handleVerifyPassword: SubmitHandler<UserResetPasswordInput> = async (
    data
  ) => {
    const payload = {
      password: data.currentPassword,
    };

    try {
      const res = await userPasswordReset(payload);
      navigate(res.token); //Navigate to user password reset page
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error?.response?.status == 400) {
          setError("currentPassword", {
            type: "server",
            message: "errors.currentPassword.incorrect",
          });
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
    }
  };

  return (
    <Card className="container text-center mt-5 " style={{ maxWidth: 458 }}>
      <Card.Body>
        <Card.Title>{t("verifyPassword.title")}</Card.Title>
        <Card.Text>{t("verifyPassword.text")}</Card.Text>

        <Form onSubmit={handleSubmit(handleVerifyPassword)} noValidate>
          <Form.Group controlId="formCurrentPassword" className="mt-3">
            <FloatingLabel
              controlId="floatingInputCurrentPassword"
              label={t("labels.currentPassword")}
            >
              <Form.Control
                type="password"
                placeholder="Current Password"
                maxLength={100}
                isInvalid={!!errors.currentPassword} // Show error if validation fails
                {...register("currentPassword", {
                  required: "errors.currentPassword.required",
                })}
                disabled={isSubmitting} // Disable input while loading
              />
              <Form.Control.Feedback type="invalid" className="text-start">
                {t(errors.currentPassword?.message || "")}
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
          <Button type="submit" className="w-100 mt-3">
            {isSubmitting ? (
              <LoadingSpinner />
            ) : (
              <span>{t("buttons.verify")}</span>
            )}{" "}
          </Button>

          {/* Link to redirect back to the login page */}
          <div className="mt-3">
            <Link to={"/user-profile"} className="link">
              <ArrowBarLeft />
              {t("verifyPassword.link.back")}
            </Link>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
