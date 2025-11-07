// SessionContext.tsx
import { createContext, useState, useContext, ReactNode } from "react";
import { getAllSessions, createSessions } from "@/services/session-service/sessionService";

interface Session {
  id: number;
  name: string;
}

interface SessionContextType {
  sessions: Session[];
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>;
  totalSessions: number;
  fetchSessions: (page?: number, limit?: number) => Promise<Session[]>;
  createNewSession: () => Promise<Session | null>;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch sessions with pagination
  const fetchSessions = async (page = 1, limit = 10): Promise<Session[]> => {
    setLoading(true);
    try {
      const res = await getAllSessions(page, limit);
      const items = res.items || [];

      if (page === 1) {
        setSessions(items);
      } else {
        setSessions((prev) => [...prev, ...items]);
      }

      setTotalSessions(res.pager.page_count);
      return items; 
    } catch (error) {
      console.error("Failed to fetch sessions", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create new session
  const createNewSession = async () => {
    try {
      const newSession = await createSessions();
      setSessions((prev) => [newSession, ...prev]); // prepend new session
      return newSession;
    } catch (error) {
      console.error("Failed to create session", error);
      return null;
    }
  };

  return (
    <SessionContext.Provider
      value={{
        sessions,
        setSessions,
        totalSessions,
        fetchSessions,
        createNewSession,
        loading,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

// Custom hook to use session context

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return context;
};
