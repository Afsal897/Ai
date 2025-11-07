// DatePickerInput.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DatePickerInput from "../DatePickerInput";
import { useForm, Controller, FormProvider } from "react-hook-form";

// Mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

// Mock convertToJapaneseDate
vi.mock("@/utils/dateUtils", () => ({
  convertToJapaneseDate: (date: string) => `JP-${date}`,
}));

function Wrapper({ isDisabled = false, defaultValue = null }) {
  const methods = useForm({ defaultValues: { dob: defaultValue } });
  return (
    <FormProvider {...methods}>
      <Controller
        name="dob"
        control={methods.control}
        render={({ field }) => (
          <DatePickerInput field={field} isDisabled={isDisabled} />
        )}
      />
    </FormProvider>
  );
}

describe("DatePickerInput", () => {
  it("renders with placeholder text", () => {
    render(<Wrapper />);
    expect(
      screen.getByPlaceholderText("labels.dateOfBirth")
    ).toBeInTheDocument();
  });

  it("renders a calendar icon when disabled", () => {
    render(<Wrapper isDisabled={true} />);
    expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
  });

  it("renders a calendar icon when value is empty", () => {
    render(<Wrapper defaultValue={null} />);
    expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
  });

  it("updates value when a date is selected", () => {
    render(<Wrapper />);
    const input = screen.getByPlaceholderText(
      "labels.dateOfBirth"
    ) as HTMLInputElement;

    // simulate user selecting a date
    fireEvent.change(input, { target: { value: "2024-01-01" } });

    expect(input.value).toBe("2024-01-01");
  });
});
