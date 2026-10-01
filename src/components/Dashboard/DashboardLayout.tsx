import { ReactNode, useState } from "react";
import Header from "../Common/Header";
import Sidebar from "../Common/Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Header onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)} />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar collapsed={sidebarCollapsed} />
        <main style={{ flex: 1, minWidth: 0, position: "relative" }}>{children}</main>
      </div>
    </div>
  );
}