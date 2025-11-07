import { Row, Col, FloatingLabel, Form } from "react-bootstrap";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { passwordValidation } from "@/validations/formValidations";

export type PasswordFormValues = {
  password: string;
};

type Props = {
  form: UseFormReturn<PasswordFormValues>;
};

export default function PasswordChangeForm({ form }: Props) {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors, isSubmitting },
    watch,
    clearErrors,
  } = form;

  // watching password if needed for future confirm password validation
  watch("password");

  return (
    <Row>
      <Col md={12}>
        <Form.Group className="mb-3" controlId="floatingInputNewPassword">
          <FloatingLabel
            label={
              <>
                {t("users.changePassword.newPassword")}
                <span style={{ color: "red" }}>*</span>
              </>
            }
          >
            <Form.Control
              type="password"
              placeholder={t("users.changePassword.newPassword")}
              maxLength={100}
              {...register("password", {
                ...passwordValidation,
                onChange: () => clearErrors("password"),
              })}
              isInvalid={Boolean(errors?.password)}
              disabled={isSubmitting}
            />
            <Form.Control.Feedback type="invalid" className="text-start">
              {errors?.password?.message && t(errors.password.message)}
            </Form.Control.Feedback>
          </FloatingLabel>
        </Form.Group>
      </Col>
    </Row>
  );
}
