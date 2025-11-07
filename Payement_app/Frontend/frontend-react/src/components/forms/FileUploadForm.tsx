import { Form, Row, Col, FloatingLabel, Button, InputGroup } from "react-bootstrap";
import { PlusCircle } from "react-bootstrap-icons";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { NewFile } from "@/services/file-service/fileType";
import {
  fileValidation,
  stringValidation,
  technologyNameValidation
} from "@/validations/formValidations";
import { FiMinusCircle } from "react-icons/fi";

type FileFormProps = {
  form: UseFormReturn<NewFile>;
};

export default function FileUploadForm({ form }: FileFormProps) {
  const { t } = useTranslation();
  const {
    register,
    control,
    formState: { errors, isSubmitting },
  } = form;

  // multiple technology inputs
  const { fields, append, remove } = useFieldArray({
    control,
    name: "technologies",
  });

  // at least one technology field exists
  if (fields.length === 0) {
    append({ name: "" }, { shouldFocus: false });
  }

  return (
    <Row>
      <Col md={12}>
        <Form.Group className="mb-3" controlId="fileUpload">
          <Form.Label className="fw-semibold">
            {t("labels.attachFile")}
          </Form.Label>

          <Form.Control
            type="file"
            accept=".pptx"
            data-testid="file-upload-input"
            {...register("attachment", fileValidation(t))}
            isInvalid={!!errors?.attachment}
            disabled={isSubmitting}
          />
          {errors?.attachment && (
            <Form.Control.Feedback type="invalid">
              {t(errors.attachment.message?.toString() || "")}
            </Form.Control.Feedback>
          )}

          {/* Domain */}
          <FloatingLabel className="mt-3" label={t("labels.domain")}>
            <Form.Control
              data-testid="domain-input"
              type="text"
              placeholder={t("labels.domain") || ""}
              {...register("domain", stringValidation)}
              isInvalid={!!errors?.domain}
            />
            {errors?.domain && (
              <Form.Control.Feedback type="invalid">
                {t(errors.domain.message?.toString() || "")}
              </Form.Control.Feedback>
            )}
          </FloatingLabel>

          {/* Client Name */}
          <FloatingLabel className="mt-3" label={t("labels.clientName")}>
            <Form.Control
              type="text"
              placeholder={t("labels.clientName") || ""}
              {...register("clientName", stringValidation)}
              isInvalid={!!errors?.clientName}
            />
            {errors?.clientName && (
              <Form.Control.Feedback type="invalid">
                {t(errors.clientName.message?.toString() || "")}
              </Form.Control.Feedback>
            )}
          </FloatingLabel>
          {/* Multiple Technologies */}
          <div className="mt-3">

            {fields.map((field, index) => (
              <InputGroup className="mb-2" key={field.id}>
                <FloatingLabel
                  controlId={`tech-${index}`}
                  label={`${t("labels.technology")} ${index + 1}`}
                >
                  <Form.Control
                    type="text"
                    placeholder={t("labels.technology") || ""}
                    {...register(`technologies.${index}.name`, technologyNameValidation)}
                    isInvalid={!!errors?.technologies?.[index]?.name}
                  />
                  {/* Validation message for each technology */}
                  {errors?.technologies?.[index]?.name && (
                    <Form.Control.Feedback type="invalid">
                      {t(errors.technologies[index]?.name?.message?.toString() || "")}
                    </Form.Control.Feedback>
                  )}
                </FloatingLabel>

                {/* remove button only if more than one field */}
                {fields.length > 1 && (
                  <Button
                    variant="outline-danger"
                    type="button"
                    onClick={() => remove(index)}
                    className="ms-2 d-flex align-items-center"
                    style={{maxHeight:"58px"}}
                  >
                    <FiMinusCircle size={18} />
                  </Button>
                )}

                {/* Show add button only for the last field */}
                {index === fields.length - 1 && (
                  <Button
                    variant="outline-primary"
                    type="button"
                    onClick={() => append({ name: "" })}
                    className="ms-2 d-flex align-items-center"
                    style={{maxHeight:"58px"}}
                  >
                    <PlusCircle size={18} />
                  </Button>
                )}
              </InputGroup>
            ))}
          </div>
          {/* File Type */}
          <FloatingLabel className="mt-3" label={t("labels.fileType")}>
            <Form.Select
              {...form.register("fileType", { required: t("validation.required") })}
              isInvalid={!!errors.fileType}
            >
              <option value="0">{t("labels.fileTypes.rfp")}</option>
              <option value="1">{t("labels.fileTypes.caseStudy")}</option>
            </Form.Select>
            {errors.fileType && (
              <Form.Control.Feedback type="invalid">
                {t(errors.fileType.message?.toString() || "")}
              </Form.Control.Feedback>
            )}
          </FloatingLabel>
        </Form.Group>
      </Col>
    </Row>
  );
}
