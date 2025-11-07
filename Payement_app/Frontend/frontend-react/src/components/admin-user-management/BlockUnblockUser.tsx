import { useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { Lock, Unlock, SlashCircle, Trash } from "react-bootstrap-icons"; // Added extra icon for inactive/deleted

type Props = {
  name: string;
  id: number;
  status: number; // 0 - inactive, 1 - active, 2 - deleted, 3 - blocked
  disabled:boolean;
  onToggle: (id: number, newStatus: number) => void;
};

export default function BlockUnblockUser({ name, id, status, onToggle ,disabled }: Props) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  const isActiveOrBlocked = status === 1 || status === 3;
  const isBlocked = status === 3;

  const handleToggle = () => {
    onToggle(id, status);
    setShow(false);
  };

  return (
    <>
      <Button
        variant="light"
        onClick={() => setShow(true)}
        disabled={status === 0 || status === 2 || disabled} // Disable if inactive or deleted
      >
    
        {status === 1 && <Lock color="red" />}
        {status === 3 && <Unlock color="green" />}
        {status === 0 && <SlashCircle color="orange" />}   
         {status === 2 && <Trash color="gray" />}   
      </Button>

      {isActiveOrBlocked && (
        <Modal show={show} onHide={() => setShow(false)}>
          <Modal.Header closeButton>
            <Modal.Title>
              {isBlocked ? t("users.unblockUser.title") : t("users.blockUser.title")}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: "200px", overflowY: "auto" }}>
            {isBlocked
              ? `${t("users.unblockUser.text")} ${name}?`
              : `${t("users.blockUser.text")} ${name}?`}
          </Modal.Body>
          <Modal.Footer>
            <Button size="sm" variant={isBlocked ? "success" : "danger"} onClick={handleToggle}>
              {isBlocked ? t("buttons.unblock") : t("buttons.block")}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}
