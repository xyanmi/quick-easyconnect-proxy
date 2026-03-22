import { useState, useEffect } from "react";
import { Save, RotateCcw, KeyRound } from "lucide-react";
import { useAppStore, AppConfig } from "../stores/useAppStore";

export default function SettingsPanel() {
  const { config, saveConfig, loadConfig } = useAppStore();
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (field: keyof AppConfig, value: string) => {
    setLocalConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      console.log("Saving config:", localConfig);
      await saveConfig(localConfig);
      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save config:", error);
      setSaveMessage(`Failed to save: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalConfig(config);
  };

  return (
    <div className="space-y-6">
      {/* Connection Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Network Connection Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Server URL
            </label>
            <input
              type="url"
              value={localConfig.server_url}
              onChange={(e) => handleChange("server_url", e.target.value)}
              placeholder="https://connect.example.com"
              className="input-field"
            />
            <p className="text-xs text-text-muted mt-1">
              The URL of your EasyConnect server
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Username
            </label>
            <input
              type="text"
              value={localConfig.username}
              onChange={(e) => handleChange("username", e.target.value)}
              placeholder="your_username"
              className="input-field"
            />
            <p className="text-xs text-text-muted mt-1">
              Will be auto-filled when connecting
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Password
            </label>
            <input
              type="password"
              value={localConfig.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="••••••••"
              className="input-field"
            />
            <p className="text-xs text-text-muted mt-1">
              <KeyRound size={12} className="inline mr-1" />
              Stored securely in OS keyring. Will be auto-filled when connecting.
            </p>
          </div>
        </div>
      </div>

      {/* Docker Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Docker Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              EasyConnect Version
            </label>
            <select
              value={localConfig.ec_version}
              onChange={(e) => handleChange("ec_version", e.target.value)}
              className="input-field"
            >
              <option value="7.6.3">7.6.3 (Recommended)</option>
              <option value="7.6.7">7.6.7</option>
              <option value="7.6.8">7.6.8</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              VNC Password
            </label>
            <input
              type="password"
              value={localConfig.vnc_password}
              onChange={(e) => handleChange("vnc_password", e.target.value)}
              placeholder="vnc123"
              className="input-field"
            />
            <p className="text-xs text-text-muted mt-1">
              Password for VNC remote desktop access
            </p>
          </div>
        </div>
      </div>

      {/* Proxy Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Proxy Settings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-text-primary">SOCKS5 Proxy</p>
            <p className="text-lg font-mono text-primary-500 mt-1">
              127.0.0.1:1080
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-text-primary">VNC WebSocket</p>
            <p className="text-lg font-mono text-primary-500 mt-1">
              127.0.0.1:6080
            </p>
          </div>
        </div>
      </div>

      {/* Save/Reset buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={handleReset}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
        {saveMessage && (
          <p
            className={`text-sm ${
              saveMessage.includes("success") ? "text-green-500" : "text-red-500"
            }`}
          >
            {saveMessage}
          </p>
        )}
      </div>
    </div>
  );
}
