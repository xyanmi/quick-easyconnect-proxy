import SettingsPanel from "../components/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">
          Configure network connection and application preferences
        </p>
      </div>

      {/* Settings panel */}
      <SettingsPanel />

      {/* About section */}
      <div className="mt-6 card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">About</h3>
        <div className="space-y-2 text-text-secondary">
          <p>
            <strong>Quick EasyConnect Proxy</strong> - Version 0.1.0
          </p>
          <p>
            A desktop tool for running EasyConnect in Docker isolation with
            built-in VNC viewer and proxy management.
          </p>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-text-muted">
              Built with Tauri v2, React, and Tailwind CSS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
