import { CameraFill, InfoCircle, X } from "react-bootstrap-icons";
import { SubmitHandler, useForm } from "react-hook-form";
import { CSSProperties, useState } from "react";
import { Card, Col, FloatingLabel, Form, Row } from "react-bootstrap";
import "./ProfilePage.css";
import UserProfileImage from "@/components/user/UserProfileImage";
import {
  getUserProfile,
  userProfileUpdate,
} from "@/services/user-service/userService";
import { useTranslation } from "react-i18next";
import { formatDate } from "date-fns";
import { useMyContext } from "@/context/ContactContext";
import PageLoadingSpinner from "@/components/loaders/PageLoadingSpinner";
import i18n from "@/i18n";
import { formatUTCToLocalDate } from "@/utils/dateUtils";

// Form input type for updating the user's profile
type UserProfileFormInput = {
  email: string;
  name: string;
  name_kana: string;
  name_kanji: string;
  dob?: Date | null;
  image_url: string | null;
  image: File;
  signup_type: number;
  password_at: string;
  last_login: string;
};


//user types
const signupTypeMap: Record<number, string> = {
  1: "profile.normalUser",
  2: "profile.ssoUser",
  3: "profile.ssoAndNormal",
};

export default function ProfilePage() {
  const { t } = useTranslation(); //i18n variable declaration
  const { user, setUser } = useMyContext(); // Get and managing setUser function from context

  // useForm setup with user profile form with default value,
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    getValues,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<UserProfileFormInput>({
    defaultValues: fetchUserData,
  });

  const [base64IMG, setBase64IMG] = useState<string | null>(null); // State to hold the Base64-encoded string of the uploaded image
  const [isReadOnly, setIsReadOnly] = useState<boolean>(true); // Manages read-only mode toggle
  const [isLoading, setIsLoading] = useState(true); //mana
  const [currentFileName, setCurrentFileName] = useState("");

  //Floating-label Readonly style
  const floatingLableReadOnlyStyle = {
    pointerEvents: "none",
    backgroundColor: "transparent",
  } as CSSProperties;

  //fetching user data
  async function fetchUserData() {
    const data = await getUserProfile();
    setUser({ ...user, ...data });
    setIsLoading(false);
    return data;
  }
 
  //convert file to base64
  const convertToBase64 = (selectedFile: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBase64IMG(reader.result);
      } else {
        setBase64IMG(null);
      }
    };
  };

  //validating image file
  const validateImageFile = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      setCurrentFileName(file.name);

      const MAX_SIZE_KB = 1024;
      const MAX_DIMENSION = 1024;
      const MIN_DIMENSION = 250;

      const sizeInKB = file.size / MAX_SIZE_KB;

      if (sizeInKB > MAX_SIZE_KB) {
        setError("image", { message: `errors.fileUpload.fileSizeExceeded` });
        return reject();
      }

      const img = new window.Image();
      const imageUrl = URL.createObjectURL(file);
      img.src = imageUrl;

      img.onload = () => {
        const { naturalWidth, naturalHeight } = img;
        console.log({ naturalHeight });

        URL.revokeObjectURL(imageUrl);
        if (naturalWidth > MAX_DIMENSION || naturalHeight > MAX_DIMENSION) {
          setError("image", { message: `errors.fileUpload.imageTooLarge` });
          return reject();
        }

        if (naturalWidth < MIN_DIMENSION || naturalHeight < MIN_DIMENSION) {
          setError("image", { message: `errors.fileUpload.imageTooSmall` });
          return reject();
        }
        resolve(true);
      };
    });
  };

  //Function to profile-image upload
  const handleProfileImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    clearErrors("image");
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await validateImageFile(file);
      convertToBase64(file); //converting to base64

      const imageUrl = URL.createObjectURL(file); //convert to usrl to show preview
      setValue("image_url", imageUrl, { shouldDirty: true });
    } catch (error) {
      console.error("Image upload validation failed:", error);
      setBase64IMG(null);
    }
    // Clear file input to allow re-uploading the same file if needed
    e.target.value = "";
  };

  //Function for profile upadte
  const handleProfileUpdate: SubmitHandler<UserProfileFormInput> = async (
    data
  ) => {
    // Build payload only with fields that were modified
    const payload: Record<string, unknown> = {};

    // Build payload only with changed fields (from dirtyFields)
    for (const key of Object.keys(
      dirtyFields
    ) as (keyof UserProfileFormInput)[]) {
      if (key === "name") {
        payload.name = data.name.trim(); // Trim whitespace from name before sending
      } else if (key === "dob") {
        payload.dob = data.dob ? formatDate(data.dob, "yyyy-MM-dd") : null; // Format date of birth to YYYY-MM-DD
      } else if (key === "image_url") {
        payload.image = base64IMG; // Convert uploaded image to base64
      } else {
        payload[key] = data[key];
      }
    }

    //Now payload will only contain changed fields
    if (Object.keys(payload).length === 0) {
      setIsReadOnly(true);
      return;
    }

    try {
      await userProfileUpdate(payload);
      await fetchUserData(); // fetch user data after updation
      setIsReadOnly(true); // Toggle read-only mode
      reset(data);
    } catch (error) {
      console.error("Failed to update user profile:", error);
    }
  };

  // Handles drag over event to highlight drop area if not readonly
  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    isReadOnly: boolean
  ) => {
    e.preventDefault();
    if (!isReadOnly) {
      e.currentTarget.classList.add("drag-over");
    }
  };

  // Handles drag leave event to remove highlight
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
  };

  // Handles drop event: removes highlight and triggers image upload if file is valid
  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    isReadOnly: boolean,
    handleProfileImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  ) => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");

    if (isReadOnly) return;

    const file = e.dataTransfer.files[0];

    // Proceed if dropped file is an image
    if (file && file.type.startsWith("image/")) {
      handleProfileImageUpload({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return isLoading ? (
    <PageLoadingSpinner />
  ) : (
    <Card className="container text-center mt-5" style={{ maxWidth: 458 }}>
      <Card.Body>
        <Card.Title style={{ float: "right", cursor: "pointer" }}>
          {/* Profile Edit icon */}
          {/* <EditIcon
            size={20}
            onClick={toggleEditMode}
            className={isReadOnly ? "text-primary" : "text-secondary"}
            data-testid={isReadOnly ? "pencil-icon" : "x-icon"}
          /> */}
        </Card.Title>

        {/* Profile Picture Control Block */}
        <div className="d-flex justify-content-center align-items-center">
          <div
            className={`position-relative d-flex justify-content-center mb-3 ${
              !isReadOnly ? "droppable-area" : ""
            }`}
            style={{ width: 150, height: 150 }}
            onDragOver={(e) => handleDragOver(e, isReadOnly)} // Highlight drop zone
            onDragLeave={handleDragLeave} // Remove highlight when dragging leaves
            onDrop={(e) => handleDrop(e, isReadOnly, handleProfileImageUpload)} // Handle image drop
          >
            <div data-testid="profile-image">
              <UserProfileImage previewUrl={getValues("image_url")} />
            </div>

            {/* Delete icon button */}
            {!isReadOnly && getValues("image_url") && (
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  clearErrors("image");
                  setValue("image_url", null, { shouldDirty: true });
                  setBase64IMG(null);
                }}
                data-testid="delete-button"
              >
                <X size={20} className="icon-button-danger" />
              </button>
            )}

            {/* Add icon button */}
            {!isReadOnly && getValues("image_url") == null && (
              <Form.Group controlId="formFile">
                <Form.Label>
                  <div className="icon-button icon-button-primary">
                    <CameraFill color="white" />
                  </div>
                </Form.Label>
                <Form.Control
                  accept=".jpg,.jpeg,.png"
                  type="file"
                  hidden
                  onChange={handleProfileImageUpload}
                  data-testid="image-upload"
                />
              </Form.Group>
            )}
          </div>
        </div>

        {/* Error message on image field */}
        {errors.image && (
          <div className="text-danger mb-3 small">
            {currentFileName}
            {t(errors.image.message || "")}
          </div>
        )}

        <Form onSubmit={handleSubmit(handleProfileUpdate)} noValidate>
          {/* Email address Field */}
          <Form.Group controlId="formInputEmail" className="mb-3">
            <FloatingLabel controlId="floatingInput" label={t("labels.email")}>
              <Form.Control
                type="email"
                placeholder="name@example.com"
                maxLength={255}
                {...register("email")}
                disabled
              />
            </FloatingLabel>
          </Form.Group>

          {/* Name Field */}
          <Form.Group controlId="formInputname" className="mb-3">
            <FloatingLabel controlId="formInputname" label={t("labels.name")}>
              <Form.Control
                type="text"
                placeholder={t("labels.name")}
                maxLength={100}
                {...register("name", {
                  validate: (value) =>
                    value.trim() !== "" || "errors.name.required",
                })}
                isInvalid={!!errors.name} // Show error if validation fails
                style={isReadOnly ? floatingLableReadOnlyStyle : {}}
                disabled={isSubmitting}
              />
              <Form.Control.Feedback type="invalid" className="text-start">
                {t(errors.name?.message || "")}
              </Form.Control.Feedback>
            </FloatingLabel>
          </Form.Group>

        </Form>

        <hr />

        {/* auth details */}
        <div className="text-start">
          <h5 className="text-secondary mb-3">
            <span className="d-flex align-items-center gap-1">
              <InfoCircle className="text-primary" />
              {t("profile.securityInfo")}
            </span>
          </h5>

          <Row className="mb-3">
            {/* Password updated */}
            <Col xs={12} className="text-start">
              <small className="text-muted">
                {t("profile.passwordLastUpdated")}:
              </small>
              <div>
                {formatUTCToLocalDate(user?.password_at, i18n.language)}
              </div>
            </Col>
          </Row>

          <Row className="mb-3">
            {/* Last login */}
            <Col xs={12} className="text-start">
              <small className="text-muted">{t("profile.lastLogin")}:</small>
              <div>{formatUTCToLocalDate(user?.last_login, i18n.language)}</div>
            </Col>
          </Row>

          <Row className="mb-3">
            {/* Account type */}
            <Col xs={12} className="text-start">
              <small className="text-muted">{t("profile.userType")}:</small>
              <div>{t(signupTypeMap[user?.signup_type ?? 0] || "NA")}</div>
            </Col>
          </Row>
        </div>  
        {/* Get Premium Button */}
        <div className="d-flex justify-content-center mt-4">
          {user?.is_subscribed ? (
            <button
              type="button"
              className="btn btn-success px-4 py-2"
              disabled
              data-testid="premium-active"
            >
              ✅ Premium Active
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary px-4 py-2"
              onClick={() => {
                window.location.href = "/payment"; 
              }}
              data-testid="get-premium-button"
            >
              {t("profile.getPremium") || "Get Premium"}
            </button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}