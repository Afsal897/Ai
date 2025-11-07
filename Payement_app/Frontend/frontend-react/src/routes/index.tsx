import { createBrowserRouter } from "react-router-dom";
import PrivateRoute from "./guards/ProtectedRoute";
import PublicRoute from "./guards/PublicRoute";
import { lazy } from "react";
import PrivateLayout from "@/layouts/PrivateLayout";
import PublicLayout from "@/layouts/PublicLayout";

const LoginPage = lazy(() => import("@/pages/auth/login/LoginPage"));

const FileListPage = lazy(() => import("@/pages/chats/FileListPage"));
const NewChatPage = lazy(() => import("@/pages/chats/NewChatPage"));
const ChatPage = lazy(() => import("@/pages/chats/ChatListPage"));

const ProfilePage = lazy(() => import("@/pages/user-profile/ProfilePage"));
const PaymentPage = lazy(() => import("@/pages/payment/PaymentPage"));
const NotFoundPage = lazy(() => import("@/pages/not-found/NotFoundPage"));
const PasswordResetPage = lazy(
  () => import("@/pages/user-profile/PasswordResetPage")
);
const PasswordResetTokenPage = lazy(
  () => import("@/pages/user-profile/PasswordResetTokenPage")
);
const DashboardPage = lazy(
  () => import("@/pages/admin-dashboard/DashboardPage")
);
const UserManagementPage = lazy(
  () => import("@/pages/admin-user-management/UserManagementListPage")
);
const ForgotPasswordTokenPage = lazy(() => import("@/pages/auth/forgot-password/ForgotPasswordTokenPage"));

const router = createBrowserRouter([
  
  // grouped Public routes
  {
    path: "/", 
    element: <PublicRoute />,
    errorElement: <div>Something went wrong in route</div>,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            index: true,
            element: <LoginPage />, 
          },
          {
            path: "login",
            element: <LoginPage />,
          },
          {
            path: "activate-account/:token",
            element: <ForgotPasswordTokenPage />,
          },
        ],
      },
    ],
  },

  // Grouped protected routes
  {
    path: "/",
    element: <PrivateRoute />,
    errorElement: <div>Something went wrong</div>,
    children: [
      {
        element: <PrivateLayout />,
        children: [
          {
            path: "files",
            element: <FileListPage />,
          },
          {
            path: "chat",
            element: <NewChatPage />,
          },
          {
            path: "sessions/:sessionId",
            element: <ChatPage />,
          },
          {
            path: "user-profile",
            element: <ProfilePage />,
          },
                    {
            path: "payment",
            element: <PaymentPage />,
          },

          {
            path: "user-management",
            element: <UserManagementPage />,
          },
          {
            path: "admin-dashboard",
            element: <DashboardPage />,
          },
          {
            path: "reset-password",
            children: [
              {
                index: true,
                element: <PasswordResetPage />,
              },
              {
                path: ":token",
                element: <PasswordResetTokenPage />,
              },
            ],
          },
        ],
      },
    ],
  },

  {
    path: "*", // This matches any invalid path
    element: <NotFoundPage />, // Display 404 page
  },
]);

export default router;
