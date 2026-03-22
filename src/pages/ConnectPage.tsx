import { useEffect } from "react";
import { Play, Square, AlertCircle, CheckCircle } from "lucide-react";
import { useAppStore, setupEventListeners } from "../stores/useAppStore";
import VNCViewer from "../components/VNCViewer";

export default function ConnectPage() {
  const {
    isConnected,
    isConnecting,
    dockerAvailable,
    checkDocker,
    startConnection,
    stopConnection,
  } = useAppStore();

  // Setup event listeners and check Docker on mount
  useEffect(() => {
    setupEventListeners();
    checkDocker();
  }, [checkDocker]);

  const handleConnect = async () => {
    if (isConnected || isConnecting) return;
    await startConnection();
  };

  const handleDisconnect = async () => {
    if (!isConnected) return;
    await stopConnection();
  };

  const getStatusBanner = () => {
    if (dockerAvailable === null) {
      return (
        <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg">
          <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
          <span className="text-text-secondary">Checking Docker...</span>
        </div>
      );
    }

    if (!dockerAvailable) {
      return (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-500" size={20} />
          <div>
            <p className="font-medium text-red-700">Docker not available</p>
            <p className="text-sm text-red-600">
              Please install Docker Desktop to use this application
            </p>
          </div>
        </div>
      );
    }

    if (isConnected) {
      return (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="text-green-500" size={20} />
          <div>
            <p className="font-medium text-green-700">Connected</p>
            <p className="text-sm text-green-600">
              SOCKS5 proxy running on 127.0.0.1:1080
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Network Connection</h1>
          <p className="text-text-secondary mt-1">
            Manage your EasyConnect network connection
          </p>
        </div>

        {/* Control buttons */}
        <div className="flex gap-3">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting || !dockerAvailable}
              className={`btn-primary flex items-center gap-2 ${
                (isConnecting || !dockerAvailable) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Play size={18} />
              {isConnecting ? "Connecting..." : "Connect"}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="btn-danger flex items-center gap-2"
            >
              <Square size={18} />
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div className="mb-6">{getStatusBanner()}</div>

      {/* Main content - VNC Viewer */}
      <div className="flex-1 min-h-0">
        <div className="h-full bg-white rounded-lg shadow-card overflow-hidden">
          <VNCViewer />
        </div>
      </div>

      {/* Connection info */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-card">
          <p className="text-sm text-text-muted">Proxy Address</p>
          <p className="text-lg font-mono font-medium text-text-primary mt-1">
            127.0.0.1:1080
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-card">
          <p className="text-sm text-text-muted">VNC Port</p>
          <p className="text-lg font-mono font-medium text-text-primary mt-1">
            127.0.0.1:5901
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-card">
          <p className="text-sm text-text-muted">WebSocket</p>
          <p className="text-lg font-mono font-medium text-text-primary mt-1">
            ws://localhost:6080
          </p>
        </div>
      </div>
    </div>
  );
}
