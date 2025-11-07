import { getRefreshToken } from "@/utils/tokenUtils";
import axiosInstance from "../axiosInstance";

// Function to refresh the access token using the stored refresh token
export const refreshToken = async () => {
  const refreshToken = getRefreshToken(); // Get the refresh token from storage or wherever it's kept
  const response = await axiosInstance.put("/api/login", {
    refresh_token: refreshToken,
  });

  return response.data;
};
