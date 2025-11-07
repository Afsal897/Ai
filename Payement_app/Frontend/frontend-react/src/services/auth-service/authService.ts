import { getAccessToken, isAuthenticated } from "@/utils/tokenUtils";
import axios from "axios";
import axiosInstance from "../axiosInstance";

// Base URL for API requests, pulled from environment variables
const baseURL = import.meta.env.VITE_API_URL;

// Login user: Sends a POST request to the login API endpoint
export const login = async (requestBody: object) => {
  const response = await axios.post(`${baseURL}/api/login`, requestBody);
  return response.data;
};

// Verify email: Sends a POST request to the email verification API endpoint
export const verifyEmail = async (requestBody: object) => {
  const response = await axios.post(`${baseURL}/api/signup`, requestBody);
  return response.data;
};

// Verify email token: Sends a GET request to verify the email token
export const verifyEmailToken = async (token: string | undefined) => {
  const response = await axios.get(`${baseURL}/api/signup/${token}`);
  return response.data;
};

// User registration: Sends a POST request to the registration API endpoint
export const userRegistration = async (requestBody: object, token: string) => {
  const response = await axios.post(
    `${baseURL}/api/signup/${token}`,
    requestBody
  );
  return response.data;
};


export const createOrder = async (amount: number, order_id: string) => {
  const response = await axiosInstance.post("/payments/create-order/", {
    amount,
    order_id,
  });
  return response.data;
};


// Verify Razorpay payment
export const verifyPayment = async (paymentData: {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) => {
  const response = await axiosInstance.post("/payments/verify-payment/", paymentData);
  return response.data;
};

// Forgot password email verification: Sends a POST request to verify email for password reset
export const forgotPasswordVerifyEmail = async (requestBody: object) => {
  const response = await axios.post(
    `${baseURL}/api/password-reset`,
    requestBody
  );
  return response.data;
};

// Verify email token: Sends a GET request to verify the email token
export const forgotPasswordverifyEmailToken = async (
  token: string | undefined
) => {
  const response = await axios.get(`${baseURL}/api/password-reset/${token}`);
  return response.data;
};

// Forgot password: Sends a PUT request to reset the password
export const forgotPassword = async (
  requestBody: object,
  token: string | undefined
) => {
  let config = {};
  const isAuthenticatedUser = await isAuthenticated();
  //forgot password API is used in two places, , if it is authenticated user , pass the token to API
  if (isAuthenticatedUser) {
    const token = getAccessToken();
    config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }
  const response = await axios.post(
    `${baseURL}/api/password-reset/${token}`,
    requestBody,
    config
  );
  return response.data;
};

//SSO login
export const googleSSO = async (
  requestBody: object,
  type: string,
  confirmation: boolean
) => {
  const response = await axios.post(
    `${baseURL}/api/sso?mode=${type}&force=${confirmation}`,
    requestBody
  );
  return response.data;
};
