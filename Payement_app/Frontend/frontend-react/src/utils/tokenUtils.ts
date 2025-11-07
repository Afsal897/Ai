// Function to set the access token expiry time in sessionStorage
export const setAccessTokenExpiry = (accessTokenExpiry: string) => {
  sessionStorage.setItem("accessTokenExpiry", accessTokenExpiry);
};

// Function to get the access token expiry time from sessionStorage
export const getAccessTokenExpiry = () => {
  const expiry = sessionStorage.getItem("accessTokenExpiry");
  return expiry;
};

// Function to remove the access token expiry from sessionStorage
export const removeAccessTokenExpiry = () => {
  sessionStorage.removeItem("accessTokenExpiry");
};

// Function to set the access token in sessionStorage
export const setAccessToken = (accessToken: string) => {
  return sessionStorage.setItem("accessToken", accessToken);
};

// Function to get the access token from sessionStorage
export const getAccessToken = () => {
  return sessionStorage.getItem("accessToken");
};

// Function to remove the access token from sessionStorage
export const removeAccessToken = () => {
  sessionStorage.removeItem("accessToken");
};

// Function to set the refresh token in localStorage
export const setRefreshToken = (refreshToken: string) => {
  return localStorage.setItem("refreshToken", refreshToken);
};

// Function to get the refresh token from localStorage
export const getRefreshToken = () => {
  return localStorage.getItem("refreshToken");
};

// Function to remove the refresh token from localStorage
export const removeRefrehsToken = () => {
  localStorage.removeItem("refreshToken");
};

// Function to check if the user is authenticated based on the presence of the access token
export const isAuthenticated = () => {
  return !!getAccessToken();
};
