import { downloadFile } from "@/services/file-service/fileServices";
import { showConfirmDialog } from "@/utils/toastUtils";
import { FaRegFolderOpen } from "react-icons/fa6";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

// --- Types ---
export interface Message {
  id: number;
  message: string;
  role: number; // 1 = user, 2 = system
  created_at: string;
  isFile?: boolean;
  filename?: string;
}

// --- UI Components ---
export const MessageBubble = ({ msg }: { msg: Message }) => {
  const isUser = msg.role === 1;

  //dowload the file content
  const handleDownload = async () => {
    try {
      const response = await downloadFile(msg.id);

      // response.data is a Blob
      const url = window.URL.createObjectURL(response.data);

      const link = document.createElement("a");
      link.href = url;
      link.download = msg.filename || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      showConfirmDialog({
        text: "File download failed",
        icon: "error",
        toast: true,
        showCancelButton: false,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        position: "top-end",
      });
      console.error("File download failed:", err);
    }
  };

  const renderMessageContent = () => {
    if (msg.message === "" && !msg.isFile) {
      return <p>Sorry, we couldn't retrieve a response at the moment. Please try again shortly.</p>;
    }

    if (msg.isFile) {
      return (
        <div>
          <p
            style={{
              color: "black",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#007bff")} // hover color
            onMouseLeave={(e) => (e.currentTarget.style.color = "black")}
            onClick={msg.isFile ? handleDownload : undefined}
          >
            <FaRegFolderOpen /> {msg.filename ?? "Download"}
          </p>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {msg.message?.replace(/\\n/g, "\n")}
            </ReactMarkdown>
        </div>
      );
    }

    return (
      <div 
        style={{
          overflowWrap: "break-word",
          wordBreak: "break-word",
          marginBottom: "-16px",
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
          {msg.message?.replace(/\\n/g, "\n")}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div
      className={`d-flex mb-2 ${
        isUser ? "justify-content-end" : "justify-content-start"
      }`}
    >
      <div
        style={{
          backgroundColor: isUser ? "#007bff" : "#e5e5ea",
          color: isUser ? "#fff" : "#000",
          padding: "10px 15px",
          borderRadius: "20px",
          maxWidth: "75%",
          maxHeight: "500px",
          wordBreak: "break-word",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          overflowY: "auto",
        }}
      >
        {renderMessageContent()}
        
        <div
          style={{
            fontSize: "10px",
            textAlign: "right",
            marginTop: "5px",
            opacity: 0.6,
          }}
        >
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
};