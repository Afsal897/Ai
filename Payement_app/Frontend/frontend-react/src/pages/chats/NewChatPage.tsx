import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionContext } from "@/context/SessionContext";

function NewChatPage() {
  const navigate = useNavigate();
  const { fetchSessions, createNewSession } = useSessionContext();

  useEffect(() => {
    const init = async () => {
      const items = await fetchSessions(); // fetch and wait
      
      if (items.length === 0) {
        const newSession = await createNewSession();
        if (newSession) navigate(`/sessions/${newSession.id}`);
      } else {
        const latest = items[0];
        navigate(`/sessions/${latest.id}`);
      }
    };

    init();
  }, []);

  return null;
}

export default NewChatPage;
