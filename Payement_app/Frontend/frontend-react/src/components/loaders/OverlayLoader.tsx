import { ReactNode } from "react";
import LoadingSpinner from "./LoadingSpinner";

type LoaderOverlayProps = {
  loading: boolean;
  children: ReactNode;
  contentOpacity?: number; // optional, default 0.5
};

export default function OverlayLoader({
  loading,
  children,
  contentOpacity = 0.5,
}: Readonly<LoaderOverlayProps>) {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Content (fades when loading) */}
      <div
        style={{
          opacity: loading ? contentOpacity : 1,
          transition: "opacity 0.3s ease-in-out",
        }}
      >
        {children}
      </div>

      {/* Loader overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0, // shorthand for top:0, right:0, bottom:0, left:0
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent", // keeps content visible
            zIndex: 10,
          }}
        >
          <LoadingSpinner variant="primary" />
        </div>
      )}
    </div>
  );
}
