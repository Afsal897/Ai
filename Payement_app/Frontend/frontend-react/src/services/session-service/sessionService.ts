import axiosInstance from "../axiosInstance";

// fetch all sessions
export const getAllSessions = async (
  page: number,
  limit: number=10
) => {
  const response = await axiosInstance.get(
    `/api/sessions?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const createSessions = async () => {
  const response = await axiosInstance.post(
    `/api/sessions`
  );
  return response.data;
};

export const handleEditName = async (sessionId:number, newname:string) => {
  const response = await axiosInstance.put(
    `/api/sessions/${sessionId}`,
    { name: newname } 
  );
  return response.data;
};
//chat messages
export const getAllMessages = async (sessionId: string, page:number) => {
  const response = await axiosInstance.get(`/api/sessions/${sessionId}/messages?page=${page}&limit=10`);
  return response.data;
};
 