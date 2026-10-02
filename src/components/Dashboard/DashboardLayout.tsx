import { ReactNode, useState } from "react";
import Sidebar from "../Common/Sidebar";
import TopBar from "../Common/TopBar";

interface DashboardLayoutProps {
  children: ReactNode;
  onAddFarm: () => void;
}

/**
 * Ossature du dashboard : sidebar à gauche, barre supérieure en haut,
 * contenu au centre. Doit être rendu à l'intérieur de <SelectionProvider>,
 * dont la sidebar et la barre supérieure ont besoin.
 */
export default function DashboardLayout({ children, onAddFarm }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f3f4f6", overflow: "hidden" }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onAddFarm={onAddFarm}
      />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <TopBar />
        <main style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
          {children}
        </main>
      </div>
    </div>
  );
}