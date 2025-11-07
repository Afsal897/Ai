// src/routes/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import PageLoadingSpinner from "@/components/loaders/PageLoadingSpinner";
import { useMyContext } from "@/context/ContactContext";
import { getUserRole } from "@/utils/stringUtils";

type ProtectedRouteProps = {
  redirectPath?: string;
};

export default function ProtectedRoute({
  redirectPath = "/login",
}: ProtectedRouteProps) {
  const { token, loading } = useMyContext();
  const location = useLocation();

  if (loading) {
    return <PageLoadingSpinner />;
  }

  if (!token) {
    return <Navigate to={redirectPath} replace />;
  }

  // ---- ROLE BASED REDIRECTION ----
  const role = getUserRole(); // returns "0" for admin, "1" for user

  // User (1) should NOT access admin-only pages
  if (role === "1") {
    const adminOnlyPaths = ["/admin-dashboard", "/user-management"];
    if (adminOnlyPaths.includes(location.pathname)) {
      return <Navigate to="/chat" replace />;
    }
  }

  return <Outlet />;
}
