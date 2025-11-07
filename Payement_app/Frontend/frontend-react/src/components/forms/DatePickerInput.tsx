import { DetailedHTMLProps, InputHTMLAttributes } from "react";
import { FloatingLabel, Form, FormControlProps } from "react-bootstrap";
import DatePicker from "react-datepicker";
import { ControllerRenderProps } from "react-hook-form";
import { useTranslation } from "react-i18next";
import "./DatePickerInput.css";
import { CalendarFill } from "react-bootstrap-icons";
import { convertToJapaneseDate } from "@/utils/dateUtils";

//Defining props type for DateInput (custion input)
type DateInputProps = FormControlProps &
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

//Defining props type for DatePicker
type DatePickerInputProps = {
  field: ControllerRenderProps<any, string>;
  isDisabled: boolean;
};

export default function DatePickerInput({
  field,
  isDisabled,
}: DatePickerInputProps) {
  const { t, i18n } = useTranslation(); //i18n variable declaration

  //custom input to pass to DatePicker componenet
  const DateInput = (props: DateInputProps) => (
    <FloatingLabel label={t("labels.dateOfBirth")}>
      <Form.Control
        {...props}
        value={
          props.value
            ? i18n.language === "jp"
              ? convertToJapaneseDate(props.value.toString())
              : props.value.toString()
            : ""
        }
        readOnly
        autoComplete="off"
        style={
          isDisabled
            ? { pointerEvents: "none", backgroundColor: "transparent" }
            : {}
        }
        className={isDisabled ? "read-only-input" : ""}
      />
      {(isDisabled || props.value == "") && (
        <CalendarFill
          className="custom-calendar-icon"
          data-testid="calendar-icon"
          onClick={(e) => props.onClick?.(e as any)}
        />
      )}
    </FloatingLabel>
  );

  return (
    <DatePicker
      id="datepickerInput"
      placeholderText={t("labels.dateOfBirth")}
      maxDate={new Date()}
      selected={field.value}
      onChange={field.onChange}
      locale={i18n.language}
      customInput={<DateInput />}
      wrapperClassName="date-picker-wrapper"
      isClearable={!isDisabled}
      clearButtonClassName="custom-clear-button"
      readOnly={isDisabled}
      dateFormat="yyyy-MM-dd"
      showMonthDropdown
      showYearDropdown
      scrollableYearDropdown
      yearDropdownItemNumber={100}
    />
  );
}
