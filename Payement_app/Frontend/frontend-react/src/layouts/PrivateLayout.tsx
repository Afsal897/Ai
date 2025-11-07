// src/layouts/PrivateLayout.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import "./Layout.css";

export default function PrivateLayout() {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="layout-container">
      <Header openSidebar={() => setShowSidebar(true)} />

      <div className="main-layout-body">
        <Sidebar
          show={showSidebar}
          closeSidebar={() => setShowSidebar(false)}
        />
        <main className="main-content with-sidebar">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}
