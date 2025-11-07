import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { getAccessToken } from "@/utils/tokenUtils";
import PageLoadingSpinner from "@/components/loaders/PageLoadingSpinner";
import OverlayLoader from "@/components/loaders/OverlayLoader";
import { MessageBubble } from "@/components/chats/message";
import type { Message } from "@/components/chats/message";
import LoadingSpinner from "@/components/loaders/LoadingSpinner";
import InfiniteScroll from "react-infinite-scroll-component";
import { IoSend } from "react-icons/io5";
import AlwaysScrollIntoView from "@/components/layout/AlwaysScrollIntoView";
import { getAllMessages } from "@/services/session-service/sessionService";
import { showConfirmDialog } from "@/utils/toastUtils";

interface Session {
  id: number;
  name: string;
  created_at: string;
  messages: Message[];
}

const ChatInput = ({
  value,
  onChange,
  onSend,
  placeholder,
  isLoading,
  isSocketError,
}: {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  placeholder: string;
  isLoading: boolean;
  isSocketError: boolean;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = () => {
    onSend();
    // Reset textarea height after send
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // reset height
      textareaRef.current.rows = 1; // ensure minimum rows back
    }
  };

  return (
  <div className="chat-input-container" title="Type your message">
    <textarea
      ref={textareaRef}
      className="chat-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);

        // auto-resize height
        e.target.style.height = "auto"; // reset
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; // cap at 160px (~8 lines)
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();

          // Prevent sending when socket error or still loading
          if (isSocketError || isLoading || value.trim().length < 1) return;

          handleSend();
        }
      }}
      rows={1}
    />
    {isLoading ? (
      <div style={{marginBottom:"8px"}}>
        <LoadingSpinner />
      </div>
    ) : (
      <button className="btn btn-primary chat-send-btn" disabled={value.length<1 || isSocketError} onClick={handleSend}>
        <IoSend size={26} data-testid="sendButton" />
      </button>
    )}
  </div>
  );
};

// --- Main Page ---
export default function MessagesPage() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isResponsePending, setIsResponsePending] = useState(false);
  const [apiCall, setApiCall] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [scrollToBottom, setScrollToBottom] = useState(true);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isManualLoading, setIsManualLoading] = useState(true);
  
  const activeSessionIdRef = useRef<string | null>(null);

  const socketUrl = import.meta.env.VITE_WEB_SOCKET_URL;
  const [socketErrors, setSocketErrors] = useState<Record<string, boolean>>({});

  // Fetch messages

  const handleGetMessages = useCallback(
    async (pageNum: number = 1, append = false, manual = true) => {
      if (!sessionId) return;

      if (manual) setIsManualLoading(true);
      setIsMessagesLoading(true);

      try {
        const res = await getAllMessages(sessionId, pageNum);

        const newMessages: Message[] = res.items.map((message: any) => ({
          id: message.id,
          message: message.message,
          role: message.direction, // 1 = user, 2 = assistant
          created_at: message.created_at,
          isFile: message.has_file,
          filename: message.file_name || undefined,
        }));

        setSession((prev) => {
          const updated = append
            ? [...(prev?.messages || []), ...newMessages]
            : newMessages;

          //  Update pending state based on last message of current session only
          if (updated.length > 0) {
            const lastMsg = updated[0];
            setIsResponsePending(lastMsg.role === 1);
          }

          return {
            id: Number(sessionId),
            name: `Session ${sessionId}`,
            created_at: new Date().toISOString(),
            messages: updated,
          };
        });

        setPage(res.pager.page);
        setHasMore(res.pager.page < res.pager.page_count);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        setIsMessagesLoading(false);
        if (manual) setIsManualLoading(false);
        setApiCall(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    handleGetMessages();
    setScrollToBottom(true);
  }, [handleGetMessages]);

  useEffect(() => {
    setScrollToBottom(false);
  }, [scrollToBottom]);
  // Add polling interval to recheck assistant response
  useEffect(() => {
    if (!sessionId) return;

    // clear existing interval first
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!session) return;
      const lastMsg = session.messages?.[0];
      if (lastMsg && lastMsg?.role === 1) {
        console.log("Checking for assistant response...");
        await handleGetMessages(1, false, false); // refresh first page
      }
    }, 5000); // poll every 5 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId, session, handleGetMessages]);


  // WebSocket setup (persists across sessions)
  useEffect(() => {
    if (wsRef.current) return;

    const token = getAccessToken();
    const ws = new WebSocket(`${socketUrl}/ws/chat/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      // join current session with small delay to avoid race
      if (activeSessionIdRef.current) {
          ws.send(
            JSON.stringify({
              action: "join",
              session_id: activeSessionIdRef.current,
            })
          );
      }
    };
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const currentSession = activeSessionIdRef.current;

         if (data.error) {
          setIsResponsePending(false);
          const sid = data.session_id?.toString() || currentSession;
          if (sid) {
            setSocketErrors((prev) => ({
              ...prev,
              [sid]: true, // Mark the specific session as errored
            }));
          }
          if (intervalRef.current) clearInterval(intervalRef.current); // stop polling
          showConfirmDialog({
            text: data.error,
            icon: "error",
            toast: true,
            showCancelButton: false,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            position: "top-right",
            width: "800px",
          });
          return;
        }
        if (!data.session_id || data.session_id.toString() !== currentSession)
          return;

        if (data.message) {
          const incoming: Message = {
            id: data.id ?? Date.now(),
            message: data.message,
            isFile: data.has_file ?? false,
            filename: data.has_file ? data.file_name : undefined,
            role: data.direction ?? 2,
            created_at: data.created_at ?? new Date().toISOString(),
          };

          //  Only update if still in the same session
          setSession((prev) => {
            if (!prev || prev.id.toString() !== currentSession) return prev;
            return { ...prev, messages: [incoming, ...prev.messages] };
          });

          if (incoming.role === 2) setIsResponsePending(false);
          setScrollToBottom(true);
        }
      } catch (err) {
        console.error("Parse error:", err);
      }
    };

    ws.onclose = () => console.log("WebSocket disconnected ");

    return () => {
      console.info("Global WebSocket remains open");
    };
  }, [socketUrl]);
  
  const isCurrentSocketError = !!socketErrors[sessionId || ""];


  // Handle session switching — leave old and join new
  useEffect(() => {
    const ws = wsRef.current;
    const previousSession = activeSessionIdRef.current;
    const newSession = sessionId || null;

    // Send leave if previous exists
    if (ws && previousSession && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "leave", session_id: previousSession }));
    }

    // Update active session
    activeSessionIdRef.current = newSession;

    // Join new session after short delay
    if (ws && newSession && ws.readyState === WebSocket.OPEN) {
      setTimeout(() => {
        ws.send(JSON.stringify({ action: "join", session_id: newSession }));
      }, 300);
    }
  // Reset socket error for this session
    if (newSession) {
      setSocketErrors((prev) => ({ ...prev, [newSession]: false }));
    }
    // Reset data for new session
    setSession(null);
    setNewMessage("");
    setIsResponsePending(false);
    setPage(1);
    setHasMore(true);
    setIsLoading(true);
    handleGetMessages();
  }, [sessionId, handleGetMessages]);

  // Send message handler
  const handleSendMessage = () => {
    if (isResponsePending || !newMessage.trim()) return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected yet");
      return;
    }

    const currentSession = activeSessionIdRef.current;
    if (!currentSession || currentSession !== sessionId) return;

    const outgoing: Message = {
      id: Date.now(), // temporary unique id
      message: newMessage,
      role: 1, // user
      created_at: new Date().toISOString(),
    };

    //  Add message only if still in same session
    setSession((prev) => {
      if (!prev || prev.id.toString() !== currentSession) return prev;
      return { ...prev, messages: [outgoing, ...prev.messages] };
    });

    setIsResponsePending(true);
    setScrollToBottom(true);

    const payload = {
      action: "send_message",
      session_id: currentSession,
      message: newMessage,
      role: 1,
    };

    ws.send(JSON.stringify(payload));
    setNewMessage("");
  };

  if (isLoading) return <PageLoadingSpinner />;

  return (
    <OverlayLoader loading={isMessagesLoading && isManualLoading}>
      <div
        className="d-flex flex-column"
      >
        {/* Messages Container */}
        
        {session?.messages?.length ? (
          <InfiniteScroll
            className="chat-scroll"
            dataLength={session.messages.length}
            next={() => {
              if (apiCall) return;
              setApiCall(true);
              handleGetMessages(page + 1, true);
            }}
            hasMore={hasMore}
            loader={<LoadingSpinner />}
            inverse={true} // so it loads on scroll up
            scrollThreshold={0.9}
            scrollableTarget="scrollableDiv"
            height="calc(100dvh - 170px)"
            style={{
              display: "flex",
              flexDirection: "column-reverse",
              padding: "10px",
            }}
          >
            <div id="scrollableDiv"></div>
            {scrollToBottom && <AlwaysScrollIntoView />}

            {session.messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </InfiniteScroll>
        ) : (
          <div className="text-center text-muted mt-5">
            {t("Start a conversation")}
          </div>
        )}
        
        {/* Input */}
        <ChatInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSendMessage}
          placeholder={t("Type your message...")}
          isLoading={isResponsePending}
          isSocketError={isCurrentSocketError}
        />
      </div>
    </OverlayLoader>
  );
}
