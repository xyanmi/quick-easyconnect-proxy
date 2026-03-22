import { useEffect, useRef, useState, useCallback } from "react";
import RFB from "@novnc/novnc/core/rfb.js";
import { Maximize2, Minimize2, RefreshCw, Clipboard, User } from "lucide-react";
import { useAppStore } from "../stores/useAppStore";

const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;

export default function VNCViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const retryCountRef = useRef(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { isConnected, config, setVncConnected } = useAppStore();

  // Initialize RFB connection with retry logic
  const initRFB = useCallback(() => {
    if (!containerRef.current) return null;

    const wsUrl = "ws://127.0.0.1:6080";

    try {
      const rfb = new RFB(containerRef.current, wsUrl, {
        credentials: { password: config.vnc_password || "vnc123" },
      });

      rfb.scaleViewport = true;
      rfb.resizeSession = false;
      rfb.clipViewport = false;

      rfb.addEventListener("connect", () => {
        console.log("VNC connected");
        setIsLoading(false);
        setError(null);
        setVncConnected(true);
        setRetrying(false);
        retryCountRef.current = 0;
      });

      rfb.addEventListener("disconnect", (e: CustomEvent) => {
        console.log("VNC disconnected", e.detail);
        setIsLoading(false);
        setVncConnected(false);

        if (!e.detail.clean && !retrying) {
          setError("Connection lost. Click Retry to reconnect.");
        }
      });

      rfb.addEventListener("credentialsrequired", () => {
        console.log("VNC credentials required");
        setError("VNC password required");
        setIsLoading(false);
      });

      rfb.addEventListener("securityfailure", (e: CustomEvent) => {
        console.log("VNC security failure", e.detail);
        setError(`Security failure: ${e.detail.reason || "Unknown"}`);
        setIsLoading(false);
      });

      // Handle clipboard from remote
      rfb.addEventListener("clipboard", (e: CustomEvent) => {
        const text = e.detail.text;
        if (text) {
          navigator.clipboard.writeText(text).catch(() => {});
        }
      });

      return rfb;
    } catch (err) {
      console.error("Failed to create RFB:", err);
      setError(`Failed to initialize VNC: ${err}`);
      setIsLoading(false);
      return null;
    }
  }, [config.vnc_password, setVncConnected, retrying]);

  const attemptConnection = useCallback(() => {
    if (!isConnected || !containerRef.current) return;

    if (rfbRef.current) {
      rfbRef.current.disconnect();
      rfbRef.current = null;
    }

    setIsLoading(true);
    setError(null);

    const rfb = initRFB();
    if (rfb) {
      rfbRef.current = rfb;
    }
  }, [isConnected, initRFB]);

  useEffect(() => {
    if (!isConnected || !containerRef.current) {
      if (rfbRef.current) {
        rfbRef.current.disconnect();
        rfbRef.current = null;
      }
      setIsLoading(true);
      setError(null);
      retryCountRef.current = 0;
      return;
    }

    attemptConnection();

    return () => {
      if (rfbRef.current) {
        rfbRef.current.disconnect();
        rfbRef.current = null;
      }
    };
  }, [isConnected, attemptConnection]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleRetry = () => {
    retryCountRef.current = 0;
    setRetrying(true);
    setError(null);
    setIsLoading(true);

    const tryReconnect = () => {
      if (retryCountRef.current >= MAX_RETRIES) {
        setRetrying(false);
        setError(`Failed after ${MAX_RETRIES} attempts. Check if container is running.`);
        setIsLoading(false);
        return;
      }

      retryCountRef.current++;
      console.log(`Retry attempt ${retryCountRef.current}/${MAX_RETRIES}`);
      attemptConnection();

      setTimeout(() => {
        if (!rfbRef.current) {
          tryReconnect();
        }
      }, RETRY_DELAY);
    };

    setTimeout(tryReconnect, 1000);
  };

  const sendClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (rfbRef.current && text) {
        // @ts-ignore
        if (rfbRef.current.clipboardPasteFrom) {
          // @ts-ignore
          rfbRef.current.clipboardPasteFrom(text);
        }
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  const sendUsername = () => {
    if (rfbRef.current && config.username) {
      // @ts-ignore
      if (rfbRef.current.clipboardPasteFrom) {
        // @ts-ignore
        rfbRef.current.clipboardPasteFrom(config.username);
      }
    }
    setShowCredentials(false);
  };

  const sendPassword = () => {
    if (rfbRef.current && config.password) {
      // @ts-ignore
      if (rfbRef.current.clipboardPasteFrom) {
        // @ts-ignore
        rfbRef.current.clipboardPasteFrom(config.password);
      }
    }
    setShowCredentials(false);
  };

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy:", err);
    });
  };

  if (!isConnected) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center text-white">
          <p className="text-lg">Remote Desktop</p>
          <p className="text-sm text-gray-400 mt-2">
            Connect to network to view the remote desktop
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-900 rounded-lg">
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        {/* Credentials dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCredentials(!showCredentials)}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
            title="Fill credentials"
          >
            <User size={18} />
          </button>
          {showCredentials && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-lg overflow-hidden z-20">
              <div className="p-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Quick Fill Credentials</p>
                <p className="text-xs text-gray-500">Send to remote clipboard, then Ctrl+V in login field</p>
              </div>
              {config.username && (
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-700">Username</p>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => copyToClipboard(config.username, e)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                        title="Copy to local clipboard"
                      >
                        <Clipboard size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-2 font-mono">{config.username}</p>
                  <button
                    onClick={sendUsername}
                    className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700 transition-colors"
                  >
                    Send to Remote Clipboard
                  </button>
                </div>
              )}
              {config.password && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-700">Password</p>
                    <button
                      onClick={(e) => copyToClipboard(config.password, e)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                      title="Copy to local clipboard"
                    >
                      <Clipboard size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">••••••••</p>
                  <button
                    onClick={sendPassword}
                    className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700 transition-colors"
                  >
                    Send to Remote Clipboard
                  </button>
                </div>
              )}
              {!config.username && !config.password && (
                <div className="px-4 py-3 text-sm text-gray-500">
                  No credentials saved. Add them in Settings.
                </div>
              )}
              <div className="px-3 py-2 bg-yellow-50 border-t border-yellow-100">
                <p className="text-xs text-yellow-700">
                  <strong>Note:</strong> If special characters don't paste correctly, use the clipboard button to copy locally, then paste directly in the remote desktop.
                </p>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={sendClipboard}
          className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
          title="Paste from local clipboard"
        >
          <Clipboard size={18} />
        </button>
        <button
          onClick={handleRetry}
          className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} className={retrying ? "animate-spin" : ""} />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg z-20">
          <div className="text-center text-white">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p>{retrying ? `Connecting (attempt ${retryCountRef.current}/${MAX_RETRIES})...` : "Connecting to remote desktop..."}</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg z-20">
          <div className="text-center text-white">
            <p className="text-red-400 mb-2">Connection Error</p>
            <p className="text-sm text-gray-400">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
