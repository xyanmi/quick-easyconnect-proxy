import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ConnectPage from "./pages/ConnectPage";
import RulesPage from "./pages/RulesPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";

export type PageType = "connect" | "rules" | "logs" | "settings" | "help";

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("connect");

  const renderPage = () => {
    switch (currentPage) {
      case "connect":
        return <ConnectPage />;
      case "rules":
        return <RulesPage />;
      case "logs":
        return <LogsPage />;
      case "settings":
        return <SettingsPage />;
      case "help":
        return <HelpPage />;
      default:
        return <ConnectPage />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
