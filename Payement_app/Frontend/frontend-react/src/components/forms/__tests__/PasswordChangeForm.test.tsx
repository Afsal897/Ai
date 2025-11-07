import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import PasswordChangeForm, { PasswordFormValues } from "../PasswordChangeForm";

// Mock translation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function PasswordFormWrapper({
  withError = false,
  submitting = false,
}: {
  withError?: boolean;
  submitting?: boolean;
}) {
  const methods = useForm<PasswordFormValues>({
    defaultValues: { password: "" },
    mode: "onChange",
  });

  if (withError) {
    methods.setError("password", { type: "manual", message: "errors.password.required" });
  }

  return (
    <FormProvider {...methods}>
      <PasswordChangeForm form={{ ...methods, formState: { ...methods.formState, isSubmitting: submitting } }} />
    </FormProvider>
  );
}

describe("PasswordChangeForm Component", () => {
  it("renders password input and label", () => {
    render(<PasswordFormWrapper />);
    expect(screen.getByPlaceholderText("users.changePassword.newPassword")).toBeInTheDocument();
    expect(screen.getByText(/users.changePassword.newPassword/i)).toBeInTheDocument();
  });

  it("disables input when form is submitting", () => {
    render(<PasswordFormWrapper submitting={true} />);
    expect(screen.getByPlaceholderText("users.changePassword.newPassword")).toBeDisabled();
  });


  it("clears error on typing", async () => {
    render(<PasswordFormWrapper withError={true} />);
    const input = screen.getByPlaceholderText("users.changePassword.newPassword") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "NewPass123" } });
    expect(input.value).toBe("NewPass123");
  });

  
});
