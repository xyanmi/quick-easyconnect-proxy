import { useEffect, useRef } from "react";
import { Trash2, Download } from "lucide-react";

interface LogViewerProps {
  logs: string[];
  onClear: () => void;
}

export default function LogViewer({ logs, onClear }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const downloadLogs = () => {
    const content = logs.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `easyconnect-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogColor = (log: string) => {
    if (log.includes("error") || log.includes("Error") || log.includes("failed")) {
      return "text-red-400";
    }
    if (log.includes("warning") || log.includes("Warning")) {
      return "text-yellow-400";
    }
    if (log.includes("success") || log.includes("started") || log.includes("established")) {
      return "text-green-400";
    }
    return "text-gray-300";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-white">
        <h3 className="font-semibold text-text-primary">Application Logs</h3>
        <div className="flex gap-2">
          <button
            onClick={downloadLogs}
            className="p-2 text-gray-500 hover:text-primary-500 transition-colors"
            title="Download logs"
          >
            <Download size={18} />
          </button>
          <button
            onClick={onClear}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
            title="Clear logs"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Logs container */}
      <div
        ref={containerRef}
        className="flex-1 bg-gray-900 p-4 overflow-auto font-mono text-sm"
      >
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No logs yet</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`${getLogColor(log)} py-0.5`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
