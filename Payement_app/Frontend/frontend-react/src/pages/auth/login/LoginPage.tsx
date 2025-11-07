import { useNavigate } from "react-router-dom";
import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import { Button, Card } from "react-bootstrap";
import { SubmitHandler, useForm } from "react-hook-form";
import { login } from "@/services/auth-service/authService";
import { useMyContext } from "@/context/ContactContext";
import LoadingSpinner from "@/components/loaders/LoadingSpinner";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  emailValidation,
  passwordValidation,
} from "@/validations/formValidations";
import {
  setAccessToken,
  setAccessTokenExpiry,
  setRefreshToken,
} from "@/utils/tokenUtils";
import { setCurentUser, setUserRole } from "@/utils/stringUtils";

//Declaring the type of login form inputs
type LoginFormInput = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { t } = useTranslation(); //i18n variable declaration
  const navigate = useNavigate(); // Used for navigation after successful login

  // useForm setup to manage form state and validations
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput>();

  const { setToken, setUser } = useMyContext(); // Context to manage the global token,user state

  // Handles login form submission and triggers the API call
  const handleLogin: SubmitHandler<LoginFormInput> = async (data) => {
    try {
      const res = await login(data); // Await the API call
      const { access_token, refresh_token, user } = res;

      setAccessToken(access_token.token);
      setAccessTokenExpiry(access_token.expiry);
      setRefreshToken(refresh_token.token);
      setToken(access_token.token);
      setUserRole(user.role);
      setCurentUser(user.email);
      //Saving user information in context
      if (user) {
        const { name, email, signup_type, image_url } = user;
        setUser({ name, email, signup_type, image_url });
      }

      reset(); // Reset form after successful login
      navigate(user.role == "0" ? "/admin-dashboard" : "/chat"); // Redirect to corresponding dashboard page
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err?.response?.status == 401 || err?.response?.status == 400) {
          setError("root", {
            type: "server",
            message: "errors.login.credentialsInvalid",
          });
        } else {
          setError("root", {
            type: "server",
            message: "errors.login.loginFailed",
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
    <Card className="container text-center mt-5" style={{ maxWidth: 458 }}>
      <Card.Body>
        <Card.Title>{t("auth.login.title")}</Card.Title>
        <Card.Text>{t("auth.login.text")}</Card.Text>

        {/* Email address Field */}
        <Form onSubmit={handleSubmit(handleLogin)} noValidate>
          <Form.Group controlId="formInputEmail">
            <FloatingLabel controlId="floatingInput" label={t("labels.email")}>
              <Form.Control
                type="email"
                placeholder="name@example.com"
                maxLength={255}
                {...register("email", {
                  ...emailValidation,
                  onChange: () => clearErrors("root"), // Reset error flag when input changes
                })}
                isInvalid={!!errors.email || !!errors.root} // Display error if email validation fails
                disabled={isSubmitting} // Disable input while loading
                autoComplete="off"
              />
              <Form.Control.Feedback type="invalid" className="text-start">
                {t(errors.email?.message || "")}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>

          {/* Password Field */}
          <Form.Group controlId="formInputPassword" className="mt-3">
            <FloatingLabel
              controlId="floatingPassword"
              label={t("labels.password")}
            >
              <Form.Control
                type="password"
                placeholder="Password"
                maxLength={100}
                {...register("password", {
                  required: passwordValidation.required, // Required
                  onChange: () => clearErrors("root"), // Reset error flag when input changes
                })}
                isInvalid={!!errors.password || !!errors.root} // Display error if password validation fails
                disabled={isSubmitting} // Disable input while loading
              />
              <Form.Control.Feedback type="invalid" className="text-start">
                {t(errors.password?.message || "")}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>

          {/* Display error message if login fails (other than invalid credentials) */}
          {errors.root?.message && (
            <div className="text-start ">
              <Form.Text className="text-danger">
                {t(errors.root?.message)}
              </Form.Text>
            </div>
          )}

          {/* Remember me checkbox and forgot password link */}
          {/* <div className="text-end  mt-3">
            <Link className="link " to={"/forgot-password"}>
              {t("auth.login.link.forgotPassword")}
            </Link>
          </div> */}

          {/* Submit Button */}
          <Button type="submit" className="w-100 mt-3" disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner /> : t("buttons.login")}
            {/* Show loading spinner while logging in */}
          </Button>
        </Form>

        {/* <div className="d-flex align-items-center mt-3">
          <hr className="flex-grow-1" />
          <span className="px-2 text-muted"> {t("auth.login.orLabel")}</span>
          <hr className="flex-grow-1" />
        </div> */}

        {/* SSO-Login */}
        {/* <div className="mt-3 d-flex justify-content-center">
          <GoogleSSO sourcePage="login" />
        </div> */}

        {/* Sign Up Link */}
        {/* <div className="mt-3">
          {t("auth.login.noAccountLabel")}
          <Link className="link" to={"/signup"}>
            <span> {t("auth.login.link.signup")}</span>
          </Link>
        </div> */}
      </Card.Body>
    </Card>
  );
}
