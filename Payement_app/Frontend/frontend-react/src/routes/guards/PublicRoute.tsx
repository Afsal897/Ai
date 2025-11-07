// src/routes/PublicRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import PageLoadingSpinner from "@/components/loaders/PageLoadingSpinner";
import { useMyContext } from "@/context/ContactContext";
import { getUserRole } from "@/utils/stringUtils";

type PublicRouteProps = {
  redirectPath?: string;
};

export default function PublicRoute({
  redirectPath = "/chat",
}: PublicRouteProps) {
  const { token, loading, handleLogout } = useMyContext();

  if (loading) {
    return <PageLoadingSpinner />;
  }

  // Special case: signup and forgot-password flows
  if (
    location.pathname.startsWith("/signup/") ||
    location.pathname.startsWith("/forgot-password/")
  ) {
    // Clear session so old token won't interfere
    if (token) {
      handleLogout();
    }
    //  Always render the child page (SignupTokenPage, ForgotPasswordTokenPage, etc.)
    return <Outlet />;
  }

  const role = getUserRole(); // returns "0" for admin, "1" for user
  if (role === "0") {
    redirectPath = "/admin-dashboard";
  }

  return token ? <Navigate to={redirectPath} replace /> : <Outlet />;
}
