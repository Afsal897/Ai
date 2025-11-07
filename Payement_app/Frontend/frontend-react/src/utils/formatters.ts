// utils/formatters.ts
export const formatFileSize = (size: number): string => {
  if (size === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return parseFloat((size / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const userTypes = (type: number): string => {
  switch (type) {
    case 0:
      return "Admin";
    case 1:
      return "User";
    case 2:
      return "Project Manager";
    case 3:
      return "Sales";
    case 4:
      return "Engineer";
    default:
      return "Unknown";
  }
};