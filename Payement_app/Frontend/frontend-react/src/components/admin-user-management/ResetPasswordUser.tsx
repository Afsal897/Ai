import { useState, useEffect } from "react";
import { Button, Modal, Form } from "react-bootstrap";
import { KeyFill } from "react-bootstrap-icons";
import { useTranslation } from "react-i18next";
import { useForm, SubmitHandler } from "react-hook-form";
import PasswordChangeForm, { PasswordFormValues } from "../forms/PasswordChangeForm";

type Props = {
  name: string;
  id: number;
  onChangePassword: (id: number, newPassword: string) => void;
};

export default function ResetPasswordUser({ name, id, onChangePassword }: Props) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const form = useForm<PasswordFormValues>();

  const handleSubmit: SubmitHandler<PasswordFormValues> = (data) => {
    onChangePassword(id, data.password);
    form.reset();              // Clear after save
    setShow(false);
  };

  //  Reset form whenever modal is opened
  useEffect(() => {
    if (show) {
      form.reset({ password: "" });
    }
  }, [show, form]);

  return (
    <>
      <Button variant="light" onClick={() => setShow(true)}>
        <KeyFill size={18} color="blue" />
        </Button>

      <Modal show={show} onHide={() => setShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{t("users.changePassword.title", { name })}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <Modal.Body>
            <PasswordChangeForm form={form} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>
              {t("buttons.cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
              {t("buttons.save")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
