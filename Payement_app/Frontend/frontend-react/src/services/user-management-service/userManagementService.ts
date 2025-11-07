import axiosInstance from "../axiosInstance";

// Get all users: Sends a GET request to fetch all users with search, sort, and pagination parameters
export const getAllUsers = async (
  searchValue: string,
  sortKey: string,
  sortType: string,
  page: number,
  limit: number,
  role: number | string,
  status: number | string
) => {
  const response = await axiosInstance.get(
    `/api/users?search=${searchValue}&sort_key=${sortKey}&sort_order=${sortType}&page=${page}&limit=${limit}&role=${role}&status=${status}`
  );
  return response.data;
};

// Block or Unblock user by ID: Sends a api request to change the status of a user by its ID
export const blockUnblockUserById = async (
  userId: number,
  requestBody: object
) => {
  const response = await axiosInstance.patch(
    `/api/users/${userId}`,
    requestBody
  );
  return response.data;
};

// Create user: Sends a POST request to create a new user
export const createUser = async (requestBody: object) => {
  const response = await axiosInstance.post(`/api/users/`, requestBody);
  return response.data;
};
// Get user by ID: Sends a GET request to fetch a specific user by its ID
export const getUserById = async (userId: number) => {
  const response = await axiosInstance.get(`/api/users/${userId}`);
  return response.data;
};
// Update user: Sends a PUT request to update an existing user by its ID
export const updateUser = async (requestBody: object, userId: number) => {
  const response = await axiosInstance.put(`/api/users/${userId}`, requestBody);
  return response.data;
};
// Reset user password by ID: Sends a api request to change the password of a user by its ID
export const resetPasswordById = async (
  userId: number,
  requestBody: object
) => {
  const response = await axiosInstance.patch(
    `/api/users/${userId}`,
    requestBody
  );
  return response.data;
};
