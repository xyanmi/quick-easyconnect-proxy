import { PageType } from "../App";
import {
  Wifi,
  Settings,
  FileText,
  Globe,
  Circle,
  HelpCircle,
  Activity,
} from "lucide-react";
import { useAppStore } from "../stores/useAppStore";

interface SidebarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

interface NavItem {
  id: PageType;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: "connect", label: "Connect", icon: <Wifi size={20} /> },
  { id: "rules", label: "HTTP", icon: <Globe size={20} /> },
  { id: "logs", label: "Logs", icon: <FileText size={20} /> },
  { id: "settings", label: "Settings", icon: <Settings size={20} /> },
  { id: "help", label: "Help", icon: <HelpCircle size={20} /> },
];

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { isConnected, isConnecting } = useAppStore();

  const getStatusColor = () => {
    if (isConnecting) return "bg-yellow-500 animate-pulse";
    if (isConnected) return "bg-green-500";
    return "bg-gray-400";
  };

  const getStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (isConnected) return "Connected";
    return "Disconnected";
  };

  return (
    <aside className="w-64 bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Activity size={20} className="text-sky-400" />
          {/* EasyConnect */}
        <p className="text-sm text-text-muted mt-1">Network Proxy Manager</p>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  currentPage === item.id
                    ? "bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-button"
                    : "text-text-secondary hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Status indicator */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg">
          <Circle
            size={12}
            className={`fill-current ${getStatusColor()}`}
          />
          <div>
            <p className="text-sm font-medium text-text-primary">
              {getStatusText()}
            </p>
            <p className="text-xs text-text-muted">SOCKS5: 127.0.0.1:1080</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
