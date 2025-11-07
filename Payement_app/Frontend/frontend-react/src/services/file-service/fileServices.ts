import axiosInstance from "../axiosInstance";

// Get all files: Sends a GET request to fetch all files with search, sort, and pagination parameters
export const getAllFiles = async (
  searchValue: string | null = null,
  sortKey: string | null = null,
  sortType: string | null = null,
  page: number = 1,
  limit: number = 10
) => {
  const response = await axiosInstance.get(
    `/api/files?search=${searchValue}&page=${page}&limit=${limit}&sort_key=${sortKey}&sort_order=${sortType}`
  );
  return response.data;
};


// Download file by ID: Sends a GET request to download a contact by its ID
export const downloadFileById = async (fileId: number) => {
  try {
    const response = await axiosInstance.get(`/api/files/${fileId}/download`, {
      responseType: "blob",
    });

    // Get Content-Disposition header
    const contentDisposition = response.headers["content-disposition"];

    // Extract filename using regex
    let filename = "downloaded_file";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    // Create Blob URL and trigger download
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.remove();
    window.URL.revokeObjectURL(blobUrl);

    return response;
  } catch (error) {
    console.error("File download failed:", error);
    throw error; 
  }
};


// Create contact: Sends a POST request to create a new contact
export const uploadFile = async (formData: FormData) => {
  const response = await axiosInstance.post(`/api/files`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Get contact by ID: Sends a GET request to fetch a specific contact by its ID
export const getCountryList = async () => {
  const response = await axiosInstance.get(`/api/countries`);
  return response.data;
};

//file download api
export const downloadFile = (messageId:number)=>{
  return axiosInstance.get(`api/sessions/messages/${messageId}/download`,{
    responseType:'blob'
  });
}