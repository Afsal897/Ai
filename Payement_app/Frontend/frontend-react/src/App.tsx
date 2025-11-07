import "./App.css";
import { RouterProvider } from "react-router-dom";
import router from "@/routes";
import { Suspense } from "react";
import { ContactProvider } from "./context/ContactContext";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./pages/error-boundary/ErrorFallback";
import PageLoadingSpinner from "./components/loaders/PageLoadingSpinner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "react-datepicker/dist/react-datepicker.css";

import { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale/ja";
import { SessionProvider } from "./context/SessionContext";
registerLocale("jp", ja);

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_SSO_CLIENT_ID}>
      <ContactProvider>
        <SessionProvider>
          <ErrorBoundary fallback={<ErrorFallback />}>
            <Suspense fallback={<PageLoadingSpinner />}>
              <RouterProvider router={router} />
            </Suspense>
          </ErrorBoundary>
        </SessionProvider>
      </ContactProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
