import { Button } from "react-bootstrap";
import Navbar from "react-bootstrap/Navbar";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { List } from "react-bootstrap-icons";
import { isAuthenticated } from "@/utils/tokenUtils";

interface HeaderProps {
  openSidebar: (() => void) | null;
}

export default function Header({ openSidebar }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <Navbar
      bg="primary"
      className="ps-4 pe-4 "
      style={{ position: "sticky", top: 0, zIndex: 1030 }}
    >
      {/* Collapse button visible only on small screens */}
      {isAuthenticated() && openSidebar && (
        <div className="d-md-none me-3">
          <Button variant="outline-light" onClick={openSidebar}>
            <List size={24} />
          </Button>
        </div>
      )}


      <Navbar.Brand as={Link} to="/" className="text-light ">
        {t("app.header")}
      </Navbar.Brand>

      {/* <Navbar.Collapse className="justify-content-end">
        <div className="d-flex align-items-center ms-auto">
          <LanguageSwitcher />
        </div>
      </Navbar.Collapse> */}
    </Navbar>
  );
}
