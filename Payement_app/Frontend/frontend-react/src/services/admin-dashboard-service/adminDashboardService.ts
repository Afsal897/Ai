import axiosInstance from "../axiosInstance";

// Get all details: Sends a GET request to fetch all details
export const getAllDeatils = async () => {
    const response = await axiosInstance.get(
      `/api/admin-dashboard`
    );
    return response.data;
  };
