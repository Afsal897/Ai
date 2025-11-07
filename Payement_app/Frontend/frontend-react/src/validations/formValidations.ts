// First name validation rules
export const firstNameValidation = {
  required: "errors.firstName.required",
  pattern: {
    value: /^(?!.*[ 　])[\p{L}\p{N}\p{P}\p{S}]+$/u,
    message: "errors.firstName.invalid",
  },
};

// Web URL validation rules
export const webUrlValidation = {
  pattern: {
    value:
      /^(https?:\/\/)(?:(?:\d{1,3}\.){3}\d{1,3}|(?:[\p{L}\p{N}-]+\.)+[\p{L}]{2,})(\/[^\s<>]*[^\s<>\/?#-])?$/u,
    message: "errors.webUrl.invalid",
  },
};

// ZIP code validation rules
export const zipCodeValidation = {
  pattern: {
    value: /^(?!0+$)[\d-]{5,15}$/,
    message: "errors.zipcode.invalid",
  },
};

// Email validation rules
export const emailValidation = {
  required: "errors.email.required",
  pattern: {
    value:
      /^(?!.*\.\.)[a-zA-Z0-9](?!.*\.\.)[a-zA-Z0-9._%+-]{0,63}@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/,
    message: "errors.email.invalid",
  },
};

// Phone number validation rules
export const phoneValidation = {
  required: "errors.phone.required",
  pattern: {
    value: /^\+?[0-9-]{9,15}$/,
    message: "errors.phone.invalid",
  },
};

// Password validation rules with added regex pattern for strong passwords
export const passwordValidation = {
  required: "errors.password.required",
  pattern: {
    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,100}$/,
    message: "errors.password.invalid",
  }
};

// Confirm password validation rules
export const confirmPasswordValidation = (getPassword: () => string) => ({
  required: "errors.confirmPassword.required",
  validate: (value: string) =>
    value === getPassword() || "errors.confirmPassword.mismatch",
});

// File validation rules
export const fileValidation = (t: (key: string) => string) => ({
  required: t("errors.file.required"),
  validate: {
    isPptOrPptx: (fileList: FileList) => {
      const file = fileList?.[0];
      if (!file) return true;

      const validTypes = [
        "application/vnd.ms-powerpoint", // .ppt
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      ];
      const isValidType =
        validTypes.includes(file.type) ||
        file.name.toLowerCase().endsWith(".ppt") ||
        file.name.toLowerCase().endsWith(".pptx");

      return isValidType || t("errors.file.invalidType");
    },
  },
});


// Hiragana or Katakana Name Validation (with space allowed)
export const KanaNameValidation = {
  withSpace: {
    pattern: {
      value:
        /^[\u{3000}\u{3041}-\u{3096}\u{3099}-\u{30FF}\u{FF65}-\u{FF9F}]+$/u,
      message: "errors.katakanaOrhiragana.invalid",
    },
  },
  withoutSpace: {
    pattern: {
      value: /^[\u{3041}-\u{3096}\u{3099}-\u{30FF}\u{FF65}-\u{FF9F}]+$/u,
      message: "errors.katakanaOrhiragana.invalid",
    },
  },
};

// Kanji Name Validation (with space allowed)
export const kanjiNameValidation = {
  withSpace: {
    pattern: {
      value:
        /^[\u{2E80}-\u{2FD5}\u{3000}\u{3400}-\u{4DB5}\u{4E00}-\u{9FCB}\u{F900}-\u{FA6A}]+$/u,
      message: "errors.kanji.invalid",
    },
  },
  withoutSpace: {
    pattern: {
      value:
        /^[\u{2E80}-\u{2FD5}\u{3400}-\u{4DB5}\u{4E00}-\u{9FCB}\u{F900}-\u{FA6A}]+$/u,
      message: "errors.kanji.invalid",
    },
  },
};

// English name validation rules
export const nameValidation = {
  required: "errors.name.required",
  pattern: {
    value: /^(?!\s*$)(?!\s).*?(?<!\s)$/u,
    message: "errors.name.invalid",
  },
};

// City validation rules
export const cityValidation = {
  pattern: {
    value: /^(?! )[A-Za-z'-]+(?: [A-Za-z'-]+)*(?<! )$/,
    message: "errors.name.invalid",
  },
};

// locality or state validation rules
export const localityOrStateValidation = {
  pattern: {
    value: /^(?! )[A-Za-z'-]+(?: [A-Za-z'-]+)*(?<! )$/,
    message: "errors.name.invalid",
  },
};
// Email length validation rules
export const emailValidationwithLength = {
  required: "errors.email.required",
  pattern: {
    value:
      /^(?!.*\.\.)[a-zA-Z0-9](?!.*\.\.)[a-zA-Z0-9._%+-]{0,}@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/,
    message: "errors.email.invalid",
  },
};
export const stringValidation = {
  pattern: {
    value: /^[a-zA-Z\s]+$/,
    message: "errors.string"
  }
};

export const technologyNameValidation = {
  pattern: {
    value: /^[a-zA-Z0-9\s.+#\-_]+$/,
    message: "Technology name can only contain letters, numbers, spaces, and . + # - _ characters.",
  },
};
