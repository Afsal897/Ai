// src/layouts/PublicLayout.tsx
import { Outlet } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./Layout.css";

export default function PublicLayout() {
  return (
    <div className="layout-container">
      <Header openSidebar={null} />

      <div className="main-layout-body">
        <main className="main-content p-3">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}
