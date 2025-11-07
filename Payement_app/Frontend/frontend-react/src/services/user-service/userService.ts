import axiosInstance from "../axiosInstance";

//user Password reset by current password and new password
export const userPasswordReset = async (requestBody: object) => {
  const response = await axiosInstance.post(`/api/password-reset`, requestBody);
  return response.data;
};

//user Profile update (name and dob)
export const userProfileUpdate = async (requestBody: object) => {
  const response = await axiosInstance.patch(`/api/users/me`, requestBody);
  return response.data;
};

//get user Profile
export const getUserProfile = async () => {
  const response = await axiosInstance.get(`/api/users/me`);
  return response.data;
};
