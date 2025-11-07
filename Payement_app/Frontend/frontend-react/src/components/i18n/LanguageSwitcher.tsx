import i18n from "@/i18n";
import React, { useState } from "react";
import { Dropdown } from "react-bootstrap";
import { Globe } from "react-bootstrap-icons";

type LanguageOption = {
  label: string;
  value: string;
};

const languages: LanguageOption[] = [
  { label: "English", value: "en" },
  { label: "日本語", value: "jp" },
];

export default function LanguageSwitcher() {
  const [language, setLanguage] = useState(i18n.language);

  const handleChangeLanguage = (lang: LanguageOption) => {
    i18n.changeLanguage(lang.value);
    setLanguage(lang.value);
  };

  const currentLabel =
    languages.find((item) => item.value === language)?.label || "Language";

  return (
    <Dropdown>
      <Dropdown.Toggle
        id="dropdown-basic"
        className="d-flex align-items-center"
      >
        <Globe className="me-2" />
        <span>{currentLabel}</span>
      </Dropdown.Toggle>

      <Dropdown.Menu align="end">
        {languages.map((lang, index) => (
          <React.Fragment key={lang.value}>
            <Dropdown.Item
              key={lang.value}
              onClick={() => handleChangeLanguage(lang)}
            >
              {lang.label}
            </Dropdown.Item>
            {index < languages.length - 1 && <Dropdown.Divider />}
          </React.Fragment>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
