import { FloatingLabel, Form } from "react-bootstrap";
import { Row, Col } from "react-bootstrap";
import { UseFormReturn } from "react-hook-form";
import { useEffect } from "react";
import {
  emailValidationwithLength,
} from "@/validations/formValidations";
import { useTranslation } from "react-i18next";
import { NewUser } from "@/services/user-management-service/userManagementType";
import { getUserById } from "@/services/user-management-service/userManagementService";

// Defining the props type for the UserForm component
type UserFormProps = {
  form: UseFormReturn<NewUser>; // Form methods from react-hook-form
  userId: number | null;
  action: string;
};

export default function UserForm({ form, userId, action}: UserFormProps) {
  const { t } = useTranslation(); //i18n variable declaration

  // Destructuring necessary form methods and state
  const {
    register,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // If a User is passed, reset the form with its values
  useEffect(() => {
    if (userId != null) {
        getUserById(userId).then((res) => {
        reset(res);
      });
    }
  }, [userId, reset]);

  return (
    <>
      <Row>
        {/* Name Field */}
        <Col md={6}>
          <Form.Group className="mb-3" controlId="floatingInputFirstName">
            <FloatingLabel
              label={
                <>
                  {t("labels.name")}
                  <span style={{ color: "red" }}>*</span> {/* Required field */}
                </>
              }
            >
              <Form.Control
                type="text"
                placeholder="Name"
                maxLength={100}
                {...register("name", {
                  required: t("errors.signUp.name"),
                })}
                isInvalid={!!errors?.name} // Show error if validation fails
                disabled={isSubmitting}
              />
              <Form.Control.Feedback type="invalid">
                {t(errors?.name?.message || "")}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>
        </Col>

     {/*Email Field */}
     <Col md={6}>
          <Form.Group className="mb-3" controlId="floatingInputEmail">
            <FloatingLabel
              label={
                <>
                  {t("labels.email")}
                  <span style={{ color: "red" }}>*</span> {/* Required field */}
                </>
              }
            >
              <Form.Control
                type="text"
                placeholder="Email"
                maxLength={255}
                {...register?.("email", {
                  ...(action !== "edit" && {
                    required: t("errors.email.required"),
                    pattern: emailValidationwithLength.pattern,
                  }),
                })}
                isInvalid={!!errors?.email} // Show error if validation fails
                disabled={isSubmitting || action === "edit"}
              />
              <Form.Control.Feedback type="invalid">
                {t(errors?.email?.message || "")}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>
        </Col>
      </Row>
      <Row>
        {/* Role Field */}
        <Col md={6}>
          <Form.Group className="mb-3" controlId="floatingInputRole">
            <FloatingLabel
              label={
                <>
                  {t("labels.role")} <span style={{ color: "red" }}>*</span>
                </>
              }
            >
              <Form.Select
               {...register?.("role", {
                ...(action !== "edit" && {
                  required: t("errors.role.required"),
                }),
              })}
                isInvalid={!!errors?.role}
                disabled={isSubmitting || action === "edit"}
              >
                <option value='0'>{t("labels.admin")}</option>
                <option value='1'>{t("labels.user")}</option>
                <option value='2'>Project Manager</option>
                <option value='3'>Sales</option>
                <option value='4'>Engineer</option>
               
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {t(errors?.role?.message || "")}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>
        </Col>
      </Row>
    </>
  );
}
