import { ReactNode, useEffect, useState } from "react";
import Sidebar from "../Common/Sidebar";
import TopBar from "../Common/TopBar";

interface DashboardLayoutProps {
  children: ReactNode;
  onAddFarm: () => void;
}

/** Largeurs de la barre latérale (dépliée, repliée) et hauteur de la barre du haut */
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const TOPBAR_HEIGHT = 56;

/**
 * Ossature du dashboard : sidebar à gauche, barre supérieure en haut,
 * contenu au centre. Doit être rendu à l'intérieur de <SelectionProvider>,
 * dont la sidebar et la barre supérieure ont besoin.
 */
export default function DashboardLayout({ children, onAddFarm }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Position de la zone de contenu, publiée pour les fenêtres (Dialog) :
  // elles se centrent sur le contenu, à droite de la barre latérale et sous
  // la barre du haut, et non sur tout l'écran.
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--awam-content-left", `${collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH}px`);
    root.setProperty("--awam-content-top", `${TOPBAR_HEIGHT}px`);
    return () => {
      root.removeProperty("--awam-content-left");
      root.removeProperty("--awam-content-top");
    };
  }, [collapsed]);

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