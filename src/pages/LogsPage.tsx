import LogViewer from "../components/LogViewer";
import { useAppStore } from "../stores/useAppStore";

export default function LogsPage() {
  const { logs, clearLogs } = useAppStore();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 pb-0">
        <h1 className="text-2xl font-bold text-text-primary">Application Logs</h1>
        <p className="text-text-secondary mt-1">
          View real-time logs from Docker container and application
        </p>
      </div>

      {/* Log viewer */}
      <div className="flex-1 m-6 bg-white rounded-lg shadow-card overflow-hidden">
        <LogViewer logs={logs} onClear={clearLogs} />
      </div>
    </div>
  );
}
